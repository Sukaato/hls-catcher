<script setup lang="ts">
defineProps<{ message: string }>();
</script>

<template>
  <div class="overlay">
    <div class="card">
      <strong>Lecture impossible</strong>
      <p>{{ message }}</p>
      <p class="hint">
        Le flux exige peut-être des cookies ou une authentification liés au site d'origine.
        Essaie « URL brute » dans VLC ou mpv.
      </p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 24px;
}

.card {
  max-width: 440px;
  background: var(--pl-bg);
  border: 1px solid var(--pl-border-strong);
  border-radius: 12px;
  padding: 20px 22px;
}

.card strong {
  color: #f87171;
}

.card p {
  margin: 8px 0 0;
  color: var(--pl-dim);
  font-size: 14px;
  line-height: 1.5;
}

.card .hint {
  color: var(--pl-muted);
  font-size: 13px;
}
</style>
