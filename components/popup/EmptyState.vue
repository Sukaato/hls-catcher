<script setup lang="ts">
import { Inbox, LoaderCircle } from '@lucide/vue';

defineProps<{ ready: boolean }>();
</script>

<template>
  <div class="flex flex-col items-center gap-2 px-5 py-7 text-center leading-relaxed text-muted">
    <template v-if="!ready">
      <LoaderCircle :size="20" class="animate-spin" />
      <p class="m-0">Recherche…</p>
    </template>
    <template v-else>
      <Inbox :size="22" />
      <p class="m-0">
        Aucun stream Twitch détecté sur cet onglet.<br />
        Ouvre une chaîne, lance la lecture, puis rouvre ce popup.<br />
        <span class="text-xs opacity-80">Si la chaîne tournait déjà, recharge l'onglet.</span>
      </p>
    </template>
  </div>
</template>
