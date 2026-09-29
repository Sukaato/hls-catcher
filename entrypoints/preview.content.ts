const OVERLAY_ID = 'hls-catcher-preview';
const FORCE_ID = 'hls-catcher-force';
const TICK_MS = 500;

/**
 * During a Twitch ad the real stream keeps playing in a small "picture-by-picture"
 * player. While it exists, mirror it over the main player (which shows the ad),
 * and play its audio instead of the ad's. Everything is undone once it goes away.
 */
export default defineContentScript({
  matches: ['*://*.twitch.tv/*'],
  main() {
    let overlay: HTMLVideoElement | null = null;
    let badge: HTMLElement | null = null;
    let mainVideo: HTMLVideoElement | null = null;
    let pbp: HTMLVideoElement | null = null;
    let mainWasMuted = false;
    let pbpWasMuted = true;

    const findPbp = (): HTMLVideoElement | null =>
      document.querySelector<HTMLVideoElement>('.picture-by-picture-player video');

    const findMain = (): HTMLVideoElement | null => {
      for (const v of document.querySelectorAll<HTMLVideoElement>('video')) {
        if (v.id === OVERLAY_ID || v.id === FORCE_ID || v.closest('.picture-by-picture-player')) {
          continue;
        }
        return v;
      }
      return null;
    };

    /** Keep the preview audible at the user's volume, and the ad silent. */
    function applyAudio(): void {
      if (!mainVideo || !pbp) return;
      if (!mainVideo.muted) mainVideo.muted = true;
      const vol = mainVideo.volume || 1;
      if (pbp.muted) pbp.muted = false;
      if (pbp.volume !== vol) pbp.volume = vol;
      if (pbp.paused) void pbp.play().catch(() => {});
      if (badge) {
        badge.textContent = `HLS Catcher · stream (sans pub)${pbp.muted || pbp.volume === 0 ? ' · muet' : ''}`;
      }
    }

    function stop(): void {
      pbp?.removeAttribute('data-hls-catcher');
      overlay?.remove();
      badge?.remove();
      if (mainVideo) mainVideo.muted = mainWasMuted;
      if (pbp) pbp.muted = pbpWasMuted;
      overlay = badge = mainVideo = pbp = null;
    }

    function start(main: HTMLVideoElement, small: HTMLVideoElement): void {
      const v = document.createElement('video');
      v.id = OVERLAY_ID;
      v.autoplay = true;
      v.muted = true; // audio comes from the preview element itself
      v.playsInline = true;
      v.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;background:#000;object-fit:contain;pointer-events:none;';
      v.srcObject = new MediaStream(
        (small as HTMLVideoElement & { captureStream(): MediaStream })
          .captureStream()
          .getVideoTracks(),
      );
      main.after(v);
      void v.play().catch(() => {});

      const b = document.createElement('div');
      b.style.cssText =
        'position:absolute;top:8px;left:8px;padding:2px 8px;border-radius:4px;background:#7c3aedcc;color:#fff;font:12px sans-serif;pointer-events:none;';
      b.textContent = 'HLS Catcher · stream (sans pub)';
      v.after(b);

      overlay = v;
      badge = b;
      mainVideo = main;
      pbp = small;
      mainWasMuted = main.muted;
      pbpWasMuted = small.muted;

      // Twitch re-mutes the preview whenever it can: fight back immediately
      // instead of waiting for the next tick.
      small.setAttribute('data-hls-catcher', '1');
      small.addEventListener('volumechange', () => {
        if (pbp === small) applyAudio();
      });
      main.addEventListener('volumechange', () => {
        if (mainVideo === main) applyAudio();
      });
    }

    function tick(): void {
      // A manual "Forcer" already owns the player.
      if (document.getElementById(FORCE_ID)) {
        if (overlay) stop();
        return;
      }

      const small = findPbp();
      if (!small) {
        if (overlay) stop();
        return;
      }

      const main = findMain();
      if (!main?.parentElement) return;

      if (!overlay || pbp !== small || mainVideo !== main || !overlay.isConnected) {
        if (overlay) stop();
        if (small.readyState < 2) return; // not decoding yet
        start(main, small);
      }

      applyAudio();
    }

    setInterval(tick, TICK_MS);
  },
});
