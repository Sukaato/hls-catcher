<script setup lang="ts">
import ErrorOverlay from '@/components/player/ErrorOverlay.vue';
import PlayerBar from '@/components/player/PlayerBar.vue';
import { usePlayer } from '@/composables/usePlayer';

const params = new URLSearchParams(location.search);
const src = params.get('src') ?? '';
const title = params.get('title') ?? '';

if (title) document.title = `${title} — HLS Catcher`;

const { video, levels, currentLevel, status, errorMsg, setLevel } = usePlayer(src);
</script>

<template>
  <div class="relative flex h-full flex-col">
    <video
      ref="video"
      class="min-h-0 w-full flex-1 bg-black object-contain"
      controls
      autoplay
      playsinline
    ></video>

    <PlayerBar
      :src="src"
      :title="title"
      :status="status"
      :levels="levels"
      :current-level="currentLevel"
      @set-level="setLevel"
    />

    <ErrorOverlay v-if="status === 'error'" :message="errorMsg" />
  </div>
</template>
