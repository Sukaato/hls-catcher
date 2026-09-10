<script setup lang="ts">
import type { CapturedStream } from '@/lib/types';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { browser } from 'wxt/browser';

const tabId = ref<number | null>(null);
const streams = ref<CapturedStream[]>([]);
const ready = ref(false);
const copied = ref<string | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

const MODULE_LABELS: Record<string, string> = {
  twitch: 'Twitch',
  crunchyroll: 'Crunchyroll',
};

function send(msg: Record<string, unknown>): Promise<any> {
  return browser.runtime.sendMessage(msg);
}

function moduleLabel(id: string): string {
  return MODULE_LABELS[id] ?? id;
}

const sorted = computed(() => [...streams.value].sort((a, b) => b.lastSeen - a.lastSeen));

async function refresh(): Promise<void> {
  if (tabId.value == null) return;
  const res = await send({ type: 'getStreams', tabId: tabId.value });
  streams.value = res?.streams ?? [];
  ready.value = true;
}

async function retry(s: CapturedStream): Promise<void> {
  const res = await send({ type: 'analyze', streamId: s.id, tabId: tabId.value });
  if (res?.stream) {
    const i = streams.value.findIndex((x) => x.id === s.id);
    if (i >= 0) streams.value[i] = res.stream;
  }
}

function openPlayer(url: string, s: CapturedStream, label?: string): void {
  void send({
    type: 'openPlayer',
    url,
    tabId: tabId.value,
    referer: s.referer ?? '',
    title: label ? `${s.title} — ${label}` : s.title,
  });
  window.close();
}

function openRaw(url: string): void {
  void browser.tabs.create({ url });
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = text;
    setTimeout(() => {
      if (copied.value === text) copied.value = null;
    }, 1200);
  } catch {
    /* clipboard blocked */
  }
}

async function clearAll(): Promise<void> {
  await send({ type: 'clearStreams', tabId: tabId.value });
  streams.value = [];
}

onMounted(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  tabId.value = tab?.id ?? null;
  await refresh();
  timer = setInterval(refresh, 1500);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="app">
    <header>
      <div class="brand"><span class="logo">⇥</span><span>HLS Catcher</span></div>
      <button v-if="streams.length" class="ghost" @click="clearAll">Vider</button>
    </header>

    <p v-if="!ready" class="empty">Recherche…</p>
    <p v-else-if="!streams.length" class="empty">
      Aucun stream détecté sur cet onglet (Twitch ou Crunchyroll).<br />
      Lance la lecture de la vidéo, puis rouvre ce popup.<br />
      <span class="hint">Si elle tournait déjà, recharge l'onglet.</span>
    </p>

    <div v-else class="list">
      <section v-for="s in sorted" :key="s.id" class="stream">
        <div class="head">
          <div class="loc">
            <span class="title-row">
              <span class="src">{{ moduleLabel(s.moduleId) }}</span>
              <span class="channel">{{ s.title }}</span>
            </span>
            <span class="sub">
              <template v-if="s.variants?.length">{{ s.variants.length }} qualités</template>
              <template v-else-if="s.analyzeError">playlist non lue</template>
              <template v-else>analyse…</template>
            </span>
          </div>
          <span class="count" title="requêtes vues">×{{ s.count }}</span>
        </div>

        <div class="actions">
          <button class="primary" @click="openPlayer(s.url, s)">Ouvrir (auto + menu qualité)</button>
          <button class="soft" @click="copy(s.url)">{{ copied === s.url ? 'Copié' : 'Copier' }}</button>
          <button class="soft" @click="openRaw(s.url)">URL brute</button>
          <button v-if="s.analyzeError" class="soft" @click="retry(s)">Réessayer</button>
        </div>

        <p v-if="s.analyzeError" class="note err">
          {{ s.analyzeError }} — le stream reste ouvrable en « auto ».
        </p>

        <ul v-if="s.variants?.length" class="variants">
          <li v-for="v in s.variants" :key="v.uri">
            <span class="q">{{ v.label }}</span>
            <span class="grow" />
            <button class="mini" @click="openPlayer(v.uri, s, v.label)">Ouvrir</button>
            <button class="mini" @click="copy(v.uri)">{{ copied === v.uri ? '✓' : 'Copier' }}</button>
          </li>
        </ul>

        <p v-if="s.audio?.length" class="note">
          {{ s.audio.length }} piste(s) audio : {{ s.audio.map((a) => a.name || a.language || '?').join(', ') }}
        </p>
      </section>
    </div>

    <footer>
      Le stream s'ouvre dans un lecteur intégré (hls.js). « URL brute » = lien direct pour VLC/mpv.
    </footer>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 650;
}

.logo {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--accent);
  color: var(--accent-fg);
  font-weight: 800;
}

.empty {
  margin: 0;
  padding: 28px 20px;
  text-align: center;
  color: var(--muted);
  line-height: 1.7;
}

.empty .hint {
  font-size: 12px;
  opacity: 0.8;
}

.list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 470px;
  overflow-y: auto;
}

.stream {
  border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border));
  border-radius: 10px;
  background: var(--card);
  padding: 10px;
}

.head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.loc {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.src {
  flex: none;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
}

.channel {
  font-weight: 700;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.count {
  flex: none;
  font-size: 12px;
  color: var(--muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

button {
  font: inherit;
  border-radius: 7px;
  padding: 6px 10px;
  cursor: pointer;
  border: 1px solid transparent;
}

.primary {
  background: var(--accent);
  color: var(--accent-fg);
  font-weight: 600;
}
.primary:hover {
  filter: brightness(1.05);
}

.soft {
  background: transparent;
  border-color: var(--border);
  color: var(--fg);
}
.soft:hover {
  border-color: var(--accent);
}

.ghost {
  background: transparent;
  border: none;
  color: var(--muted);
  padding: 4px 6px;
}
.ghost:hover {
  color: var(--danger);
}

.variants {
  list-style: none;
  margin: 10px 0 0;
  padding: 8px 0 0;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.variants li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.q {
  font-variant-numeric: tabular-nums;
}

.grow {
  flex: 1;
}

.mini {
  background: transparent;
  border: 1px solid var(--border);
  padding: 3px 8px;
  font-size: 12px;
}
.mini:hover {
  border-color: var(--accent);
}

.note {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--muted);
}
.note.err {
  color: var(--danger);
}

footer {
  padding: 8px 12px 12px;
  font-size: 11.5px;
  color: var(--muted);
  border-top: 1px solid var(--border);
}
</style>
