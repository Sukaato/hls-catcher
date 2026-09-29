import Hls from 'hls.js';

declare global {
  interface Window {
    /** Set by the background right before (re)injecting this script. */
    __hlsCatcherForce?: { url: string; label: string };
  }
}

const OVERLAY_ID = 'hls-catcher-force';

/**
 * Replaces what the Twitch player shows with the given HLS variant: a second
 * <video> (hls.js) is stacked over Twitch's own one, which is silenced. Twitch's
 * controls stay usable since they sit above the video layer.
 */
export default defineContentScript({
  matches: ['*://*.twitch.tv/*'],
  registration: 'runtime',
  main() {
    const req = window.__hlsCatcherForce;
    if (!req) return;

    const twitchVideo = document.querySelector<HTMLVideoElement>(
      `.video-player video:not(#${OVERLAY_ID}), video:not(#${OVERLAY_ID})`,
    );
    if (!twitchVideo?.parentElement) return;

    // Re-injection (another quality): drop the previous forced player first.
    const previous = document.getElementById(OVERLAY_ID) as
      | (HTMLVideoElement & { _hls?: Hls })
      | null;
    previous?._hls?.destroy();
    previous?.remove();

    const v = document.createElement('video') as HTMLVideoElement & { _hls?: Hls };
    v.id = OVERLAY_ID;
    v.autoplay = true;
    v.playsInline = true;
    v.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;background:#000;object-fit:contain;pointer-events:none;';
    twitchVideo.after(v);

    // Follow Twitch's own volume, and keep its (ad) audio silent.
    const syncVolume = () => {
      v.volume = twitchVideo.volume || v.volume;
    };
    twitchVideo.muted = true;
    twitchVideo.addEventListener('volumechange', () => {
      if (!twitchVideo.muted) {
        v.muted = false;
        syncVolume();
        twitchVideo.muted = true;
      }
    });

    const badge = document.createElement('div');
    badge.style.cssText =
      'position:absolute;top:8px;left:8px;padding:2px 8px;border-radius:4px;background:#7c3aedcc;color:#fff;font:12px sans-serif;pointer-events:none;';
    badge.textContent = `HLS Catcher · ${req.label}`;
    v.after(badge);
    v.addEventListener('emptied', () => badge.remove(), { once: true });

    if (!Hls.isSupported()) return;
    const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
    v._hls = hls;
    hls.loadSource(req.url);
    hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      v.play().catch(() => {
        v.muted = true;
        void v.play().catch(() => {});
      });
    });
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
      else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      else badge.textContent = `HLS Catcher · erreur (${data.details})`;
    });
  },
});
