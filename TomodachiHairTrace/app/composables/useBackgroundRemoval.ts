import { removeBackground } from "@imgly/background-removal";

export function useBackgroundRemoval() {
  const isRemoving = ref(false);
  const removeError = ref<string | null>(null);

  /** HTMLImageElement の背景を除去して透過PNG の HTMLImageElement を返す */
  async function removeBg(img: HTMLImageElement): Promise<HTMLImageElement> {
    isRemoving.value = true;
    removeError.value = null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);

      const inputBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/png",
        ),
      );

      const resultBlob = await removeBackground(inputBlob);
      const url = URL.createObjectURL(resultBlob);

      return await new Promise<HTMLImageElement>((resolve) => {
        const result = new Image();
        result.onload = () => resolve(result);
        result.src = url;
      });
    } catch (e) {
      removeError.value =
        e instanceof Error ? e.message : "背景削除に失敗しました";
      throw e;
    } finally {
      isRemoving.value = false;
    }
  }

  return { removeBg, isRemoving, removeError };
}
