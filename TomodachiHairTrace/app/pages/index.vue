<script setup lang="ts">
import { useImageCrop } from "~/composables/useImageCrop";
import {
  extractColorPalette,
  type PaletteEntry,
} from "~/composables/useColorPalette";
import { useFaceDetection, type FaceResult } from "~/composables/useFaceDetection";
import { useHairTraceCanvas } from "~/composables/useHairTraceCanvas";

const cropCanvasRef = ref<HTMLCanvasElement | null>(null);
const guideCanvasRef = ref<HTMLCanvasElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const sourceImg = ref<HTMLImageElement | null>(null);
const isDraggingOver = ref(false);
const faceResult = ref<FaceResult | null>(null);
const isDetecting = ref(false);
const colorPalette = ref<PaletteEntry[]>([]);
const hoveredPixel = ref<{ x: number; y: number; hex: string } | null>(null);
const activeTab = ref<"guide" | "palette">("guide");

const { setImage, onMousedown, onMousemove, onMouseup } = useImageCrop(cropCanvasRef);
const { isLoading: mpLoading, isReady: mpReady, error: mpError, init: mpInit, detect } = useFaceDetection();
const { drawGuide } = useHairTraceCanvas();

// 初回マウント時にMediaPipeを初期化
onMounted(() => {
  mpInit();
});

function loadImage(file: File) {
  if (!file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    sourceImg.value = img;
    faceResult.value = null;
    colorPalette.value = [];
    hoveredPixel.value = null;
    nextTick(() => setImage(img));
  };
  img.src = url;
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) loadImage(file);
  (e.target as HTMLInputElement).value = "";
}

function onDrop(e: DragEvent) {
  isDraggingOver.value = false;
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) loadImage(file);
}

async function onAnalyze() {
  if (!sourceImg.value) return;
  isDetecting.value = true;
  try {
    const result = await detect(sourceImg.value);
    faceResult.value = result;

    if (result && guideCanvasRef.value) {
      drawGuide(guideCanvasRef.value, sourceImg.value, result);
      // ガイドキャンバスからカラーパレットを抽出
      const ctx = guideCanvasRef.value.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, 256, 256);
      colorPalette.value = extractColorPalette(imageData);
    }
  } finally {
    isDetecting.value = false;
  }
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function onGuideMousemove(e: MouseEvent) {
  const canvas = guideCanvasRef.value;
  if (!canvas || !faceResult.value) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  const pxX = Math.floor(mx);
  const pxY = Math.floor(my);
  if (pxX < 0 || pxY < 0 || pxX >= 256 || pxY >= 256) {
    hoveredPixel.value = null;
    return;
  }
  const ctx = canvas.getContext("2d")!;
  const d = ctx.getImageData(pxX, pxY, 1, 1).data;
  hoveredPixel.value = { x: pxX, y: pxY, hex: toHex(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0) };
}

async function onCopyHex(hex: string) {
  await navigator.clipboard.writeText(hex.toUpperCase()).catch(() => {});
}

function onDownload() {
  const canvas = guideCanvasRef.value;
  if (!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "hair-trace-guide.png";
  a.click();
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 px-6 py-4">
      <h1 class="text-lg font-bold tracking-tight">Tomodachi Hair Trace</h1>
      <p class="text-xs text-slate-500 mt-0.5">
        キャラ画像からトモコレ用髪型描画ガイドを生成
      </p>
    </header>

    <main class="container mx-auto p-4 lg:p-6 max-w-6xl">
      <!-- MediaPipe状態表示 -->
      <div v-if="mpLoading" class="mb-4 flex items-center gap-2 text-sm text-slate-400">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
        MediaPipe 読み込み中…
      </div>
      <div v-else-if="mpError" class="mb-4 text-sm text-red-400">
        {{ mpError }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左: アップロード・クロップ -->
        <div class="space-y-4">
          <!-- アップロード -->
          <UCard>
            <template #header>
              <span class="text-sm font-medium">画像を読み込む</span>
            </template>
            <div
              class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none"
              :class="
                isDraggingOver
                  ? 'border-sky-400 bg-sky-950/30'
                  : 'border-slate-700 hover:border-slate-500'
              "
              @click="fileInputRef?.click()"
              @dragover.prevent="isDraggingOver = true"
              @dragleave="isDraggingOver = false"
              @drop="onDrop"
            >
              <div class="text-4xl mb-2">🖼</div>
              <p class="text-sm text-slate-400">クリックまたはドロップ</p>
              <p class="text-xs text-slate-600 mt-1">PNG · JPG · WEBP</p>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              accept="image/*"
              @change="onFileChange"
            />
          </UCard>

          <!-- クロップ -->
          <UCard v-if="sourceImg">
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

          <!-- 解析ボタン -->
          <UCard v-if="sourceImg">
            <UButton
              class="w-full"
              :loading="isDetecting"
              :disabled="mpLoading || !mpReady"
              @click="onAnalyze"
            >
              {{ isDetecting ? '解析中…' : '顔検出・ガイド生成' }}
            </UButton>
            <p v-if="faceResult === null && !isDetecting && sourceImg" class="text-xs text-slate-500 mt-2 text-center">
              顔が検出されていません
            </p>
            <p v-else-if="faceResult && !isDetecting" class="text-xs text-green-400 mt-2 text-center">
              顔を検出しました
            </p>
          </UCard>
        </div>

        <!-- 中央: ガイド画像 256x256 -->
        <div class="space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">髪型描画ガイド (256×256)</span>
                <div class="flex items-center gap-2">
                  <span
                    v-if="hoveredPixel"
                    class="text-xs font-mono text-slate-400"
                  >
                    ({{ hoveredPixel.x }}, {{ hoveredPixel.y }})
                    <span
                      class="inline-block w-3 h-3 rounded-sm align-middle mx-1 border border-white/20"
                      :style="{ backgroundColor: hoveredPixel.hex }"
                    />
                    {{ hoveredPixel.hex.toUpperCase() }}
                  </span>
                  <UButton
                    v-if="faceResult"
                    size="xs"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    @click="onDownload"
                  >
                    保存
                  </UButton>
                </div>
              </div>
            </template>
            <div class="flex justify-center bg-slate-900 rounded-lg p-2 min-h-64 items-center">
              <div v-if="!faceResult" class="text-slate-600 text-sm text-center">
                <p>画像をアップロードして</p>
                <p>「顔検出・ガイド生成」を押してください</p>
              </div>
              <canvas
                v-show="faceResult"
                ref="guideCanvasRef"
                class="rounded"
                style="image-rendering: pixelated; width: 256px; height: 256px"
                @mousemove="onGuideMousemove"
                @mouseleave="hoveredPixel = null"
              />
            </div>
          </UCard>

          <!-- 凡例 -->
          <UCard v-if="faceResult">
            <template #header>
              <span class="text-sm font-medium">ガイド凡例</span>
            </template>
            <div class="space-y-1.5 text-xs">
              <div class="flex items-center gap-2">
                <span class="inline-block w-8 h-0.5 border-t-2 border-dashed border-green-400/70" />
                <span class="text-slate-300">顔楕円ガイド</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-block w-8 h-0.5 border-t-2 border-dashed border-orange-400/80" />
                <span class="text-slate-300">前髪ライン推定</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-block w-8 h-0.5 border-t-2 border-dashed border-yellow-400/50" />
                <span class="text-slate-300">中央ガイドライン</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-block w-8 h-0.5 border border-blue-300/20" />
                <span class="text-slate-300">16pxグリッド</span>
              </div>
            </div>
          </UCard>
        </div>

        <!-- 右: カラーパレット・描画ヒント -->
        <div class="space-y-4">
          <!-- カラーパレット -->
          <UCard v-if="colorPalette.length > 0">
            <template #header>
              <span class="text-sm font-medium">カラーパレット</span>
              <span class="text-xs text-slate-500 ml-2">{{ colorPalette.length }}色</span>
            </template>
            <div class="space-y-1 max-h-80 overflow-y-auto pr-1">
              <div
                v-for="entry in colorPalette.slice(0, 100)"
                :key="entry.hex"
                class="flex items-center gap-2 text-xs group cursor-pointer hover:bg-slate-800/50 rounded px-1 py-0.5 transition-colors"
                :title="`クリックでコピー: ${entry.hex.toUpperCase()}`"
                @click="onCopyHex(entry.hex)"
              >
                <div
                  class="w-5 h-5 rounded shrink-0 border border-white/10"
                  :style="{ backgroundColor: entry.hex }"
                />
                <code class="font-mono text-slate-300 w-20 shrink-0">
                  {{ entry.hex.toUpperCase() }}
                </code>
                <div class="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width: `${(entry.count / (colorPalette[0]?.count ?? 1)) * 100}%`,
                      backgroundColor: entry.hex,
                    }"
                  />
                </div>
                <span class="text-slate-500 w-12 text-right shrink-0">
                  {{ entry.percentage.toFixed(1) }}%
                </span>
              </div>
            </div>
          </UCard>

          <!-- 描画ヒント -->
          <UCard>
            <template #header>
              <span class="text-sm font-medium">Phase 1 — 実装済み機能</span>
            </template>
            <div class="space-y-2 text-xs text-slate-400">
              <div class="flex items-start gap-2">
                <span class="text-green-400 shrink-0">✓</span>
                <span>画像アップロード・ドロップ</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-green-400 shrink-0">✓</span>
                <span>クロップ範囲調整</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-green-400 shrink-0">✓</span>
                <span>MediaPipe顔検出・ランドマーク</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-green-400 shrink-0">✓</span>
                <span>256×256ガイドCanvas生成</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-green-400 shrink-0">✓</span>
                <span>前髪ライン推定・グリッド表示</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-green-400 shrink-0">✓</span>
                <span>PNG出力・カラーパレット</span>
              </div>
              <div class="mt-3 pt-3 border-t border-slate-800 text-slate-600">
                <p class="font-medium text-slate-500 mb-1">Phase 2 (次)</p>
                <p>輪郭抽出・OpenCV.js シルエット最適化</p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </main>
  </div>
</template>
