import { ref } from 'vue';

// Shared across every component so the "Copié" / "✓" label toggles on the
// right button regardless of who triggered the copy.
const copied = ref<string | null>(null);

export function useCopy() {
  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      copied.value = text;
      setTimeout(() => {
        if (copied.value === text) copied.value = null;
      }, 1200);
    } catch {
      /* clipboard blocked */
    }
  }

  return { copied, copy };
}
