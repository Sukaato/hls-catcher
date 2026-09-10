<script setup lang="ts">
import { useCopy } from '@/composables/useCopy';
import type { Variant } from '@/lib/types';

defineProps<{ variants: Variant[] }>();
const emit = defineEmits<{ open: [uri: string, label: string] }>();

const { copied, copy } = useCopy();
</script>

<template>
  <ul class="variants">
    <li v-for="v in variants" :key="v.uri">
      <span class="q">{{ v.label }}</span>
      <span class="grow" />
      <button type="button" class="mini" @click="emit('open', v.uri, v.label)">Ouvrir</button>
      <button type="button" class="mini" @click="copy(v.uri)">
        {{ copied === v.uri ? '✓' : 'Copier' }}
      </button>
    </li>
  </ul>
</template>

<style scoped>
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
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 3px 8px;
  color: var(--fg);
}
.mini:hover {
  border-color: var(--accent);
}
</style>
