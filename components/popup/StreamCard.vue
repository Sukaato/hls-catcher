<script setup lang="ts">
import QualityList from '@/components/popup/QualityList.vue';
import { useCopy } from '@/composables/useCopy';
import type { CapturedStream } from '@/lib/types';
import { Check, Copy, ExternalLink, Play, RefreshCw } from '@lucide/vue';
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
  <section class="rounded-[10px] border border-card-border bg-card p-2.5">
    <div class="flex items-baseline gap-2">
      <div class="flex min-w-0 flex-1 items-baseline gap-2">
        <span class="min-w-0 truncate text-[15px] font-bold">{{ stream.channel }}</span>
        <span class="whitespace-nowrap text-xs text-muted">{{ subLabel }}</span>
      </div>
      <span class="flex-none text-xs text-muted" title="requêtes vues">×{{ stream.count }}</span>
    </div>

    <div class="mt-2.5 flex flex-wrap gap-1.5">
      <button type="button" class="btn-primary" @click="emit('open', stream.url, stream)">
        <Play :size="13" /> Ouvrir <span class="font-normal opacity-80">(auto + menu qualité)</span>
      </button>
      <button type="button" class="btn-soft" @click="copy(stream.url)">
        <component :is="copied === stream.url ? Check : Copy" :size="13" />
        {{ copied === stream.url ? 'Copié' : 'Copier' }}
      </button>
      <button type="button" class="btn-soft" @click="emit('openRaw', stream.url)">
        <ExternalLink :size="13" /> URL brute
      </button>
      <button
        v-if="stream.analyzeError"
        type="button"
        class="btn-soft"
        @click="emit('retry', stream)"
      >
        <RefreshCw :size="13" /> Réessayer
      </button>
    </div>

    <p v-if="stream.analyzeError" class="mt-2 text-[12.5px] text-danger">
      {{ stream.analyzeError }} — le stream reste ouvrable en « auto ».
    </p>

    <QualityList
      v-if="stream.variants?.length"
      :variants="stream.variants"
      @open="(uri, label) => emit('open', uri, stream, label)"
    />

    <p v-if="stream.audio?.length" class="mt-2 text-[12.5px] text-muted">
      {{ stream.audio.length }} piste(s) audio : {{ audioSummary }}
    </p>
  </section>
</template>
