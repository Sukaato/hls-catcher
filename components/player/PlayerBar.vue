<script setup lang="ts">
import QualitySelect from '@/components/player/QualitySelect.vue';
import type { Level, PlayerStatus } from '@/composables/usePlayer';

defineProps<{
  src: string;
  title: string;
  status: PlayerStatus;
  levels: Level[];
  currentLevel: number;
}>();
defineEmits<{ setLevel: [index: number] }>();
</script>

<template>
  <div class="bar">
    <span class="dot" :class="status" :title="status"></span>
    <span class="src" :title="src">{{ title || src }}</span>

    <QualitySelect
      v-if="levels.length"
      :levels="levels"
      :current-level="currentLevel"
      @change="$emit('setLevel', $event)"
    />

    <a class="raw" :href="src" target="_blank" rel="noreferrer noopener">URL brute</a>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--pl-panel);
  border-top: 1px solid var(--pl-border);
  font-size: 13px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
  background: var(--pl-muted);
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
  color: var(--pl-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.raw {
  color: var(--pl-accent);
  text-decoration: none;
  white-space: nowrap;
}
.raw:hover {
  text-decoration: underline;
}
</style>
