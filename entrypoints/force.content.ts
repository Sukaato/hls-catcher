import Hls from 'hls.js';

declare global {
  interface Window {
    /** Set by the background right before (re)injecting this script. */
    __hlsCatcherForce?: { url: string; label: string };
  }
}

const OVERLAY_ID = 'hls-catcher-force';
const TICK_MS = 500;
/** Ad-free ticks in a row before we consider the ad over. */
const AD_GONE_TICKS = 3;
const AD_SELECTORS = [
  '[data-a-target="video-ad-label"]',
  '[data-a-target="video-ad-countdown"]',
  '[data-test-selector="ad-banner-default-text"]',
].join(',');

type Overlay = HTMLVideoElement & { _release?: () => void };

/**
 * Replaces what the Twitch player shows with the given HLS variant: a second
 * <video> (hls.js) is stacked over Twitch's own one, which is silenced. Twitch's
 * controls stay usable since they sit above the video layer.
 *
 * Once a Twitch ad has been seen and is over, the overlay is released so the
 * Twitch player (at its own, normally better, quality) takes over again.
 */
export default defineContentScript({
  matches: ['*://*.twitch.tv/*'],
  registration: 'runtime',
  main() {
    const req = window.__hlsCatcherForce;
    if (!req) return;

    // Re-injection (another quality): drop the previous forced player first.
    (document.getElementById(OVERLAY_ID) as Overlay | null)?._release?.();

    const found = document.querySelector<HTMLVideoElement>('.video-player video, video');
    if (!found?.parentElement || !Hls.isSupported()) return;
    const twitchVideo: HTMLVideoElement = found;

    const v: Overlay = document.createElement('video');
    v.id = OVERLAY_ID;
    v.autoplay = true;
    v.playsInline = true;
    v.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;background:#000;object-fit:contain;pointer-events:none;';
    twitchVideo.after(v);

    const badge = document.createElement('div');
    badge.style.cssText =
      'position:absolute;top:8px;left:8px;padding:2px 8px;border-radius:4px;background:#7c3aedcc;color:#fff;font:12px sans-serif;pointer-events:none;';
    badge.textContent = `HLS Catcher · ${req.label}`;
    v.after(badge);

    // Follow Twitch's own volume, and keep its (ad) audio silent.
    const wasMuted = twitchVideo.muted;
    const onVolume = () => {
      if (twitchVideo.muted) return;
      v.muted = false;
      v.volume = twitchVideo.volume || v.volume;
      twitchVideo.muted = true;
    };
    twitchVideo.muted = true;
    twitchVideo.addEventListener('volumechange', onVolume);

    const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
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

    // Hand the player back to Twitch: stop hls.js, drop the overlay, restore audio.
    let adSeen = false;
    let adGone = 0;
    const timer = setInterval(() => {
      if (!v.isConnected) return release();
      if (document.querySelector(AD_SELECTORS)) {
        adSeen = true;
        adGone = 0;
      } else if (adSeen && ++adGone >= AD_GONE_TICKS) {
        release();
      }
    }, TICK_MS);

    function release(): void {
      clearInterval(timer);
      twitchVideo?.removeEventListener('volumechange', onVolume);
      twitchVideo.muted = v.muted || wasMuted;
      if (!v.muted) twitchVideo.volume = v.volume;
      hls.destroy();
      v.remove();
      badge.remove();
    }
    v._release = release;
  },
});
