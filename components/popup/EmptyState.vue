<script setup lang="ts">
defineProps<{ ready: boolean }>();
</script>

<template>
  <p v-if="!ready" class="empty">Recherche…</p>
  <p v-else class="empty">
    Aucun stream Twitch détecté sur cet onglet.<br />
    Ouvre une chaîne, lance la lecture, puis rouvre ce popup.<br />
    <span class="hint">Si la chaîne tournait déjà, recharge l'onglet.</span>
  </p>
</template>

<style scoped>
.empty {
  margin: 0;
  padding: 28px 20px;
  text-align: center;
  color: var(--muted);
  line-height: 1.7;
}

.hint {
  font-size: 12px;
  opacity: 0.8;
}
</style>
