<script setup lang="ts">
import { useImageCrop } from "~/composables/useImageCrop";

const props = defineProps<{
  image: HTMLImageElement;
}>();

const cropCanvasRef = ref<HTMLCanvasElement | null>(null);

const { setImage, onMousedown, onMousemove, onMouseup, getCroppedCanvas } =
  useImageCrop(cropCanvasRef);

/** image prop が更新されたらクロップ枠を再初期化する */
watch(
  () => props.image,
  (img) => nextTick(() => setImage(img)),
  { immediate: true },
);

defineExpose({ getCroppedCanvas });
</script>

<template>
  <section class="card">
    <header class="card-header" style="background: #beebd3">
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0"
          style="border: 2px solid #2a1f1b; box-shadow: 0 2px 0 0 #2a1f1b"
        >
          <span style="font-size: 14px">✂️</span>
        </div>
        <div>
          <h2
            class="font-bold"
            style="font-size: 14px; color: #2a1f1b; line-height: 1.2"
          >
            きりとり
          </h2>
          <p style="font-size: 11px; color: #4a3a33; margin-top: 2px">
            コーナーをひっぱって調整
          </p>
        </div>
      </div>
    </header>
    <div class="p-4 flex justify-center">
      <canvas
        ref="cropCanvasRef"
        class="max-w-full rounded-xl"
        style="border: 2px solid #2a1f1b"
        @mousedown="onMousedown"
        @mousemove="onMousemove"
        @mouseup="onMouseup"
        @mouseleave="onMouseup"
      />
    </div>
  </section>
</template>
