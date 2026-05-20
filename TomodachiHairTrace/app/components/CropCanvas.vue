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
  <UCard>
    <template #header>
      <span class="text-sm font-medium">切り取り範囲</span>
      <span class="text-xs text-slate-500 ml-2">コーナーをドラッグで調整</span>
    </template>
    <div class="flex justify-center">
      <canvas
        ref="cropCanvasRef"
        class="max-w-full rounded"
        @mousedown="onMousedown"
        @mousemove="onMousemove"
        @mouseup="onMouseup"
        @mouseleave="onMouseup"
      />
    </div>
  </UCard>
</template>
