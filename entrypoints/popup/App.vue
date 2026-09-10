<script setup lang="ts">
import EmptyState from '@/components/popup/EmptyState.vue';
import PopupHeader from '@/components/popup/PopupHeader.vue';
import StreamCard from '@/components/popup/StreamCard.vue';
import { useStreams } from '@/composables/useStreams';

const { streams, ready, retry, openPlayer, openRaw, clearAll } = useStreams();
</script>

<template>
  <div class="app">
    <PopupHeader :show-clear="streams.length > 0" @clear="clearAll" />

    <EmptyState v-if="!ready || !streams.length" :ready="ready" />

    <div v-else class="list">
      <StreamCard
        v-for="s in streams"
        :key="s.id"
        :stream="s"
        @open="openPlayer"
        @open-raw="openRaw"
        @retry="retry"
      />
    </div>

    <footer>
      Le stream s'ouvre dans un lecteur intégré (hls.js). « URL brute » = lien direct pour VLC/mpv.
    </footer>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
}

.list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 470px;
  overflow-y: auto;
}

footer {
  padding: 8px 12px 12px;
  font-size: 11.5px;
  color: var(--muted);
  border-top: 1px solid var(--border);
}
</style>
