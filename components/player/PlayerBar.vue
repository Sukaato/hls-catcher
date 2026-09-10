<script setup lang="ts">
import QualitySelect from '@/components/player/QualitySelect.vue';
import type { Level, PlayerStatus } from '@/composables/usePlayer';
import { ExternalLink } from '@lucide/vue';
import { computed } from 'vue';

const props = defineProps<{
  src: string;
  title: string;
  status: PlayerStatus;
  levels: Level[];
  currentLevel: number;
}>();
defineEmits<{ setLevel: [index: number] }>();

const dotClass = computed(() =>
  props.status === 'playing'
    ? 'bg-green-500'
    : props.status === 'error'
      ? 'bg-red-500'
      : 'bg-amber-500',
);
</script>

<template>
  <div
    class="flex items-center gap-3 border-t border-pl-border bg-pl-panel px-3 py-2 text-[13px]"
  >
    <span class="size-[9px] flex-none rounded-full" :class="dotClass" :title="status" />
    <span class="min-w-0 flex-1 truncate font-mono text-pl-muted" :title="src">
      {{ title || src }}
    </span>

    <QualitySelect
      v-if="levels.length"
      :levels="levels"
      :current-level="currentLevel"
      @change="$emit('setLevel', $event)"
    />

    <a
      class="inline-flex items-center gap-1 whitespace-nowrap text-pl-accent hover:underline"
      :href="src"
      target="_blank"
      rel="noreferrer noopener"
    >
      <ExternalLink :size="13" /> URL brute
    </a>
  </div>
</template>
