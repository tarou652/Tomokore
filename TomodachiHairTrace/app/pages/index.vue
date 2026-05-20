<script setup lang="ts">
import CropCanvas from "~/components/CropCanvas.vue";
import {
  quantizeColors,
  type PaletteEntry,
} from "~/composables/useColorPalette";

/** カラーパレットの最大色数 */
const MAX_PALETTE_COLORS = 12;

const cropCanvasRef = ref<InstanceType<typeof CropCanvas> | null>(null);
const sourceImg = ref<HTMLImageElement | null>(null);
const resultImageData = ref<ImageData | null>(null);
const colorPalette = ref<PaletteEntry[]>([]);

/** 画像がロードされたとき状態をリセットして新しい画像をセットする */
function onImageLoaded(img: HTMLImageElement) {
  sourceImg.value = img;
  resultImageData.value = null;
  colorPalette.value = [];
}

/** クロップ範囲をダウンサンプリングしてドット絵とカラーパレットを生成する */
function onConvert(size: 64 | 128 | 256) {
  const out = cropCanvasRef.value?.getCroppedCanvas(size);
  if (!out) return;
  const ctx = out.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, size, size);
  resultImageData.value = imageData;
  colorPalette.value = quantizeColors(imageData, MAX_PALETTE_COLORS);
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 px-6 py-4">
      <h1 class="text-lg font-bold tracking-tight">Tomodachi Hair Trace</h1>
      <p class="text-xs text-slate-500 mt-0.5">キャラ画像をドット絵に変換</p>
    </header>

    <main class="container mx-auto p-4 lg:p-6 max-w-6xl">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 左カラム: アップロード・クロップ・設定 -->
        <div class="space-y-4">
          <ImageUpload @loaded="onImageLoaded" />
          <CropCanvas v-if="sourceImg" ref="cropCanvasRef" :image="sourceImg" />
          <ConvertSettings v-if="sourceImg" @convert="onConvert" />
        </div>

        <!-- 右カラム: ドット絵・カラーパレット -->
        <div class="space-y-4">
          <PixelGridPreview
            v-if="resultImageData"
            :image-data="resultImageData"
          />
          <ColorPalette
            v-if="colorPalette.length > 0"
            :palette="colorPalette"
          />
        </div>
      </div>
    </main>
  </div>
</template>
