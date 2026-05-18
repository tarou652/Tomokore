export function useBackgroundRemoval() {
  const isProcessing = ref(false);
  const error = ref<string | null>(null);

  async function removeBackground(
    imageEl: HTMLImageElement,
  ): Promise<HTMLImageElement | null> {
    isProcessing.value = true;
    error.value = null;
    try {
      const { removeBackground: doRemove } =
        await import("@imgly/background-removal");
      const blob = await doRemove(imageEl.src, {
        output: { format: "image/png" },
      });
      const url = URL.createObjectURL(blob);
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      return null;
    } finally {
      isProcessing.value = false;
    }
  }

  return { isProcessing, error, removeBackground };
}
