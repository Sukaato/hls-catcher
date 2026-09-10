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
  <div class="wrap">
    <video ref="video" class="video" controls autoplay playsinline></video>

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

<style scoped>
.wrap {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.video {
  flex: 1;
  min-height: 0;
  width: 100%;
  background: #000;
  object-fit: contain;
}
</style>
