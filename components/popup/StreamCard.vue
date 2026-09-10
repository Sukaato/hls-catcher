<script setup lang="ts">
import QualityList from '@/components/popup/QualityList.vue';
import { useCopy } from '@/composables/useCopy';
import type { CapturedStream } from '@/lib/types';
import { computed } from 'vue';

const props = defineProps<{ stream: CapturedStream }>();
const emit = defineEmits<{
  open: [url: string, stream: CapturedStream, label?: string];
  openRaw: [url: string];
  retry: [stream: CapturedStream];
}>();

const { copied, copy } = useCopy();

const subLabel = computed(() => {
  const s = props.stream;
  if (s.variants?.length) return `${s.variants.length} qualités`;
  if (s.analyzeError) return 'playlist non lue';
  return 'analyse…';
});

const audioSummary = computed(() =>
  (props.stream.audio ?? []).map((a) => a.name || a.language || '?').join(', '),
);
</script>

<template>
  <section class="stream">
    <div class="head">
      <div class="loc">
        <span class="channel">{{ stream.channel }}</span>
        <span class="sub">{{ subLabel }}</span>
      </div>
      <span class="count" title="requêtes vues">×{{ stream.count }}</span>
    </div>

    <div class="actions">
      <button type="button" class="primary" @click="emit('open', stream.url, stream)">
        Ouvrir (auto + menu qualité)
      </button>
      <button type="button" class="soft" @click="copy(stream.url)">
        {{ copied === stream.url ? 'Copié' : 'Copier' }}
      </button>
      <button type="button" class="soft" @click="emit('openRaw', stream.url)">URL brute</button>
      <button
        v-if="stream.analyzeError"
        type="button"
        class="soft"
        @click="emit('retry', stream)"
      >
        Réessayer
      </button>
    </div>

    <p v-if="stream.analyzeError" class="note err">
      {{ stream.analyzeError }} — le stream reste ouvrable en « auto ».
    </p>

    <QualityList
      v-if="stream.variants?.length"
      :variants="stream.variants"
      @open="(uri, label) => emit('open', uri, stream, label)"
    />

    <p v-if="stream.audio?.length" class="note">
      {{ stream.audio.length }} piste(s) audio : {{ audioSummary }}
    </p>
  </section>
</template>

<style scoped>
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
  align-items: baseline;
  gap: 8px;
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

.actions button {
  font: inherit;
  cursor: pointer;
  border-radius: 7px;
  padding: 6px 10px;
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

.note {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--muted);
}
.note.err {
  color: var(--danger);
}
</style>
