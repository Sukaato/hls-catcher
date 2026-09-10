import type { CapturedStream } from '@/lib/types';
import { onMounted, onUnmounted, ref } from 'vue';
import { browser } from 'wxt/browser';

// Background replies are dynamically shaped per message type.
function send(msg: Record<string, unknown>): Promise<any> {
  return browser.runtime.sendMessage(msg);
}

/** Live view of the streams the background captured for the active tab. */
export function useStreams() {
  const tabId = ref<number | null>(null);
  const streams = ref<CapturedStream[]>([]);
  const ready = ref(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  async function refresh(): Promise<void> {
    if (tabId.value == null) return;
    const res = await send({ type: 'getStreams', tabId: tabId.value });
    streams.value = ((res?.streams ?? []) as CapturedStream[]).sort(
      (a, b) => b.lastSeen - a.lastSeen,
    );
    ready.value = true;
  }

  async function retry(stream: CapturedStream): Promise<void> {
    const res = await send({ type: 'analyze', streamId: stream.id, tabId: tabId.value });
    if (res?.stream) {
      const i = streams.value.findIndex((x) => x.id === stream.id);
      if (i >= 0) streams.value[i] = res.stream as CapturedStream;
    }
  }

  function openPlayer(url: string, stream: CapturedStream, label?: string): void {
    void send({
      type: 'openPlayer',
      url,
      tabId: tabId.value,
      referer: stream.referer ?? '',
      title: label ? `${stream.channel} — ${label}` : stream.channel,
    });
    window.close();
  }

  function openRaw(url: string): void {
    void browser.tabs.create({ url });
  }

  async function clearAll(): Promise<void> {
    await send({ type: 'clearStreams', tabId: tabId.value });
    streams.value = [];
  }

  onMounted(async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    tabId.value = tab?.id ?? null;
    await refresh();
    timer = setInterval(refresh, 1500);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { streams, ready, retry, openPlayer, openRaw, clearAll };
}
