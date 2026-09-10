<script setup lang="ts">
import { useCopy } from '@/composables/useCopy';
import type { Variant } from '@/lib/types';
import { Check, Copy, Play } from '@lucide/vue';

defineProps<{ variants: Variant[] }>();
const emit = defineEmits<{ open: [uri: string, label: string] }>();

const { copied, copy } = useCopy();
</script>

<template>
  <ul class="mt-2.5 flex list-none flex-col gap-1 border-t border-dashed border-border pt-2 pl-0">
    <li v-for="v in variants" :key="v.uri" class="flex items-center gap-1.5">
      <span class="tabular-nums">{{ v.label }}</span>
      <span class="flex-1" />
      <button type="button" class="btn-mini" @click="emit('open', v.uri, v.label)">
        <Play :size="12" /> Ouvrir
      </button>
      <button type="button" class="btn-mini" :title="copied === v.uri ? 'Copié' : 'Copier'" @click="copy(v.uri)">
        <component :is="copied === v.uri ? Check : Copy" :size="12" />
      </button>
    </li>
  </ul>
</template>
