import Hls from 'hls.js';
import { onBeforeUnmount, onMounted, ref } from 'vue';

export interface Level {
  index: number;
  label: string;
}

export type PlayerStatus = 'loading' | 'playing' | 'error';

function levelLabel(l: { height?: number; bitrate?: number }, i: number): string {
  const parts: string[] = [];
  if (l.height) parts.push(`${l.height}p`);
  if (l.bitrate) parts.push(`${(l.bitrate / 1_000_000).toFixed(1)} Mb/s`);
  return parts.join(' · ') || `Niveau ${i + 1}`;
}

async function tryPlay(v: HTMLVideoElement): Promise<void> {
  try {
    await v.play();
  } catch {
    // Autoplay with sound is often blocked — retry muted.
    v.muted = true;
    try {
      await v.play();
    } catch {
      /* user will press play */
    }
  }
}

/** Drives an <video> from an HLS URL via hls.js (with a native-HLS fallback). */
export function usePlayer(src: string) {
  const video = ref<HTMLVideoElement | null>(null);
  const levels = ref<Level[]>([]);
  const currentLevel = ref(-1);
  const status = ref<PlayerStatus>('loading');
  const errorMsg = ref('');

  let hls: Hls | null = null;

  function setLevel(index: number): void {
    currentLevel.value = index;
    if (hls) hls.currentLevel = index;
  }

  onMounted(() => {
    const v = video.value;
    if (!v) return;

    if (!src) {
      status.value = 'error';
      errorMsg.value = 'Aucune URL de flux fournie (paramètre ?src= manquant).';
      return;
    }

    v.addEventListener('playing', () => {
      status.value = 'playing';
    });

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
      hls.loadSource(src);
      hls.attachMedia(v);

      hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
        levels.value = data.levels.map((l, i) => ({ index: i, label: levelLabel(l, i) }));
        currentLevel.value = hls?.currentLevel ?? -1;
        void tryPlay(v);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
        currentLevel.value = data.level;
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          errorMsg.value = `Erreur réseau (${data.details}). Nouvelle tentative…`;
          hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          errorMsg.value = `Erreur média (${data.details}). Récupération…`;
          hls?.recoverMediaError();
        } else {
          status.value = 'error';
          errorMsg.value = `${data.type} · ${data.details}`;
        }
      });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src;
      void tryPlay(v);
    } else {
      status.value = 'error';
      errorMsg.value = 'Ce navigateur ne sait pas lire les flux HLS.';
    }
  });

  onBeforeUnmount(() => {
    hls?.destroy();
  });

  return { video, levels, currentLevel, status, errorMsg, setLevel };
}
