<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue';

defineProps<{ message: string }>();
</script>

<template>
  <div class="absolute inset-0 grid place-items-center bg-black/70 p-6">
    <div class="max-w-[440px] rounded-xl border border-pl-border-strong bg-pl-bg px-[22px] py-5">
      <strong class="flex items-center gap-1.5 text-red-400">
        <TriangleAlert :size="16" /> Lecture impossible
      </strong>
      <p class="mt-2 text-sm leading-normal text-pl-dim">{{ message }}</p>
      <p class="mt-2 text-[13px] text-pl-muted">
        Le flux exige peut-être des cookies ou une authentification liés au site d'origine.
        Essaie « URL brute » dans VLC ou mpv.
      </p>
    </div>
  </div>
</template>
