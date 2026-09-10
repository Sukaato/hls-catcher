<script setup lang="ts">
import EmptyState from '@/components/popup/EmptyState.vue';
import PopupHeader from '@/components/popup/PopupHeader.vue';
import StreamCard from '@/components/popup/StreamCard.vue';
import { useStreams } from '@/composables/useStreams';

const { streams, ready, retry, openPlayer, openRaw, clearAll } = useStreams();
</script>

<template>
  <div class="flex flex-col">
    <PopupHeader :show-clear="streams.length > 0" @clear="clearAll" />

    <EmptyState v-if="!ready || !streams.length" :ready="ready" />

    <div v-else class="flex max-h-[470px] flex-col gap-2 overflow-y-auto p-2">
      <StreamCard
        v-for="s in streams"
        :key="s.id"
        :stream="s"
        @open="openPlayer"
        @open-raw="openRaw"
        @retry="retry"
      />
    </div>

    <footer class="border-t border-border px-3 pt-2 pb-3 text-[11.5px] text-muted">
      Le stream s'ouvre dans un lecteur intégré (hls.js). « URL brute » = lien direct pour VLC/mpv.
    </footer>
  </div>
</template>
