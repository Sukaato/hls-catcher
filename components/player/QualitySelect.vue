<script setup lang="ts">
import type { Level } from '@/composables/usePlayer';

defineProps<{ levels: Level[]; currentLevel: number }>();
const emit = defineEmits<{ change: [index: number] }>();

function onChange(e: Event): void {
  emit('change', Number((e.target as HTMLSelectElement).value));
}
</script>

<template>
  <label class="quality">
    Qualité
    <select :value="currentLevel" @change="onChange">
      <option :value="-1">Auto</option>
      <option v-for="l in levels" :key="l.index" :value="l.index">{{ l.label }}</option>
    </select>
  </label>
</template>

<style scoped>
.quality {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--pl-dim);
}

.quality select {
  background: var(--pl-bg);
  color: var(--pl-fg);
  border: 1px solid var(--pl-border-strong);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 13px;
}
</style>
