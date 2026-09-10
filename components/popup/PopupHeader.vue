<script setup lang="ts">
defineProps<{ showClear: boolean }>();
defineEmits<{ clear: [] }>();
</script>

<template>
  <header>
    <div class="brand">
      <span class="logo">⇥</span>
      <span>HLS Catcher</span>
    </div>
    <button v-if="showClear" type="button" class="ghost" @click="$emit('clear')">Vider</button>
  </header>
</template>

<style scoped>
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 650;
}

.logo {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--accent);
  color: var(--accent-fg);
  font-weight: 800;
}

.ghost {
  font: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 7px;
  padding: 4px 6px;
  color: var(--muted);
}
.ghost:hover {
  color: var(--danger);
}
</style>
