<script setup lang="ts">
import type { Level } from '@/composables/usePlayer';

defineProps<{ levels: Level[]; currentLevel: number }>();
const emit = defineEmits<{ change: [index: number] }>();

function onChange(e: Event): void {
  emit('change', Number((e.target as HTMLSelectElement).value));
}
</script>

<template>
  <label class="flex items-center gap-1.5 text-pl-dim">
    Qualité
    <select
      :value="currentLevel"
      class="rounded-md border border-pl-border-strong bg-pl-bg px-1.5 py-1 text-[13px] text-pl-fg"
      @change="onChange"
    >
      <option :value="-1">Auto</option>
      <option v-for="l in levels" :key="l.index" :value="l.index">{{ l.label }}</option>
    </select>
  </label>
</template>
