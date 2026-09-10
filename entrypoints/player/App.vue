<script setup lang="ts">
import Hls from 'hls.js';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const params = new URLSearchParams(location.search);
const src = params.get('src') ?? '';
const title = params.get('title') ?? '';
const isDash = /\.mpd($|[?#])/i.test(src);

const video = ref<HTMLVideoElement | null>(null);
const levels = ref<Array<{ index: number; label: string }>>([]);
const currentLevel = ref(-1);
const status = ref<'loading' | 'playing' | 'error'>('loading');
const errorMsg = ref('');

let hls: Hls | null = null;
let shakaPlayer: any = null;
const shakaTracks = new Map<number, any>();
let dashAuto = true;

if (title) document.title = `${title} — HLS Catcher`;

function fail(message: string): void {
  status.value = 'error';
  errorMsg.value = message;
}

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

function setLevel(index: number): void {
  currentLevel.value = index;
  if (isDash && shakaPlayer) {
    if (index === -1) {
      dashAuto = true;
      shakaPlayer.configure('abr.enabled', true);
    } else {
      dashAuto = false;
      shakaPlayer.configure('abr.enabled', false);
      const track = shakaTracks.get(index);
      if (track) shakaPlayer.selectVariantTrack(track, true);
    }
    return;
  }
  if (hls) hls.currentLevel = index;
}

function onShakaError(detail: any): void {
  const msg = String(detail?.message ?? '');
  if (detail?.category === 6 || /drm|license|widevine|playready/i.test(msg)) {
    fail(
      'Flux protégé par DRM (Widevine) — non lisible dans le lecteur. Utilise l’URL du manifest avec un outil externe (yt-dlp, N_m3u8DL-RE, …).',
    );
  } else {
    fail(`Erreur DASH ${detail?.code ?? ''} : ${detail?.message ?? 'lecture impossible'}`);
  }
}

async function setupDash(v: HTMLVideoElement): Promise<void> {
  try {
    const mod = await import('shaka-player/dist/shaka-player.compiled.js');
    const shaka: any = (mod as any).default ?? (mod as any).shaka ?? (window as any).shaka;
    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      fail('Ce navigateur ne peut pas lire le DASH.');
      return;
    }

    const player = new shaka.Player();
    await player.attach(v);
    shakaPlayer = player;
    player.addEventListener('error', (e: Event & { detail?: unknown }) => onShakaError(e.detail));
    const syncActive = () => {
      if (dashAuto) return;
      const active = player.getVariantTracks().find((t: { active: boolean }) => t.active);
      if (active) currentLevel.value = active.id;
    };
    player.addEventListener('adaptation', syncActive);
    player.addEventListener('variantchanged', syncActive);

    try {
      await player.load(src);
    } catch (e) {
      onShakaError(e);
      return;
    }

    const rows: Array<{ id: number; height: number; bandwidth: number }> = [];
    const seen = new Set<number>();
    for (const t of player.getVariantTracks() as Array<{
      id: number;
      height: number | null;
      bandwidth: number | null;
    }>) {
      if (!t.height || seen.has(t.height)) continue;
      seen.add(t.height);
      shakaTracks.set(t.id, t);
      rows.push({ id: t.id, height: t.height, bandwidth: t.bandwidth ?? 0 });
    }
    rows.sort((a, b) => b.height - a.height || b.bandwidth - a.bandwidth);
    levels.value = rows.map((r) => ({
      index: r.id,
      label: r.bandwidth
        ? `${r.height}p · ${(r.bandwidth / 1_000_000).toFixed(1)} Mb/s`
        : `${r.height}p`,
    }));

    void tryPlay(v);
  } catch (e) {
    fail(`shaka-player indisponible : ${e instanceof Error ? e.message : String(e)}`);
  }
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

  if (isDash) {
    void setupDash(v);
  } else if (Hls.isSupported()) {
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
  shakaPlayer?.destroy();
});
</script>

<template>
  <div class="wrap">
    <video ref="video" class="video" controls autoplay playsinline></video>

    <div class="bar">
      <span class="dot" :class="status" :title="status"></span>
      <span class="src" :title="src">{{ title || src }}</span>

      <label v-if="levels.length" class="quality">
        Qualité
        <select
          :value="currentLevel"
          @change="setLevel(Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="-1">Auto</option>
          <option v-for="l in levels" :key="l.index" :value="l.index">{{ l.label }}</option>
        </select>
      </label>

      <a class="raw" :href="src" target="_blank" rel="noreferrer noopener">URL brute</a>
    </div>

    <div v-if="status === 'error'" class="overlay">
      <div class="card">
        <strong>Lecture impossible</strong>
        <p>{{ errorMsg }}</p>
        <p class="hint">
          Le flux exige peut-être des cookies ou une authentification liés au site d'origine.
          Essaie « URL brute » dans VLC ou mpv.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.video {
  flex: 1;
  min-height: 0;
  width: 100%;
  background: #000;
  object-fit: contain;
}

.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #0b0b0d;
  border-top: 1px solid #1f1f23;
  font-size: 13px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
  background: #a1a1aa;
}
.dot.loading {
  background: #f59e0b;
}
.dot.playing {
  background: #22c55e;
}
.dot.error {
  background: #ef4444;
}

.src {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #a1a1aa;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.quality {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #d4d4d8;
}

.quality select {
  background: #18181b;
  color: #f4f4f5;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 13px;
}

.raw {
  color: #a78bfa;
  text-decoration: none;
  white-space: nowrap;
}
.raw:hover {
  text-decoration: underline;
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 24px;
}

.card {
  max-width: 440px;
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  padding: 20px 22px;
}

.card strong {
  color: #f87171;
}

.card p {
  margin: 8px 0 0;
  color: #d4d4d8;
  font-size: 14px;
  line-height: 1.5;
}

.card .hint {
  color: #a1a1aa;
  font-size: 13px;
}
</style>
