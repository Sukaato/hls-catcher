<script setup lang="ts">
import { Radio, Trash2 } from '@lucide/vue';

defineProps<{ showClear: boolean }>();
defineEmits<{ clear: [] }>();
</script>

<template>
  <header class="flex items-center justify-between border-b border-border px-3 py-2.5">
    <div class="flex items-center gap-2 font-semibold">
      <span class="grid size-[22px] place-items-center rounded-md bg-accent text-accent-fg">
        <Radio :size="13" :stroke-width="2.5" />
      </span>
      <span>HLS Catcher</span>
    </div>
    <button v-if="showClear" type="button" class="btn-ghost" @click="$emit('clear')">
      <Trash2 :size="14" />
      Vider
    </button>
  </header>
</template>
