<script setup lang="ts">
import { useImageCrop } from "~/composables/useImageCrop";
import { extractColorPalette, type PaletteEntry } from "~/composables/useColorPalette";
import { pixelSnap } from "~/composables/usePixelSnap";
import { useAiImgConvert } from "~/composables/useAiImgConvert";

const cropCanvasRef = ref<HTMLCanvasElement | null>(null);
const pixelGridCanvasRef = ref<HTMLCanvasElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const sourceImg = ref<HTMLImageElement | null>(null);
const isDraggingOver = ref(false);
const targetSize = ref<32 | 64 | 128 | 256>(64);
const resultImageData = ref<ImageData | null>(null);
const colorPalette = ref<PaletteEntry[]>([]);
const zoomLevel = ref(4);
const hoveredPixel = ref<{ x: number; y: number; hex: string } | null>(null);
const snapColorCount = ref(16);
const isSnapped = ref(false);

const { setImage, onMousedown, onMousemove, onMouseup, getCroppedCanvas } =
  useImageCrop(cropCanvasRef);
const { state: aiState, load: aiLoad, convert: aiConvert } = useAiImgConvert();

const defaultZoom: Record<number, number> = { 32: 8, 64: 4, 128: 2, 256: 1 };
watch(targetSize, (size) => {
  zoomLevel.value = defaultZoom[size] ?? 1;
});

function loadImage(file: File) {
  if (!file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    sourceImg.value = img;
    resultImageData.value = null;
    colorPalette.value = [];
    hoveredPixel.value = null;
    isSnapped.value = false;
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

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function renderPixelGrid(imageData: ImageData, zoom: number) {
  const canvas = pixelGridCanvasRef.value;
  if (!canvas) return;
  const { width, height, data } = imageData;
  const showLabels = zoom >= 4;
  const mLeft = showLabels ? 32 : 0;
  const mTop = showLabels ? 20 : 0;

  canvas.width = width * zoom + mLeft;
  canvas.height = height * zoom + mTop;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4;
      const a = data[i + 3] ?? 255;
      if (a < 128) {
        ctx.fillStyle = (px + py) % 2 === 0 ? "#444" : "#333";
      } else {
        ctx.fillStyle = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
      }
      ctx.fillRect(mLeft + px * zoom, mTop + py * zoom, zoom, zoom);
    }
  }

  if (zoom >= 2) {
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 0.5;
    for (let xi = 0; xi <= width; xi++) {
      const px = mLeft + xi * zoom + 0.5;
      ctx.beginPath(); ctx.moveTo(px, mTop); ctx.lineTo(px, mTop + height * zoom); ctx.stroke();
    }
    for (let yi = 0; yi <= height; yi++) {
      const py = mTop + yi * zoom + 0.5;
      ctx.beginPath(); ctx.moveTo(mLeft, py); ctx.lineTo(mLeft + width * zoom, py); ctx.stroke();
    }
  }

  if (showLabels) {
    const step = zoom >= 16 ? 1 : zoom >= 8 ? 2 : 4;
    ctx.fillStyle = "#64748b";
    ctx.font = "9px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let yi = 0; yi < height; yi += step) {
      ctx.fillText(String(yi), mLeft - 3, mTop + yi * zoom + zoom / 2);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let xi = 0; xi < width; xi += step) {
      ctx.fillText(String(xi), mLeft + xi * zoom + zoom / 2, mTop - 2);
    }
  }
}

function applyAndRender(imageData: ImageData) {
  resultImageData.value = imageData;
  colorPalette.value = extractColorPalette(imageData);
  nextTick(() => renderPixelGrid(imageData, zoomLevel.value));
}

function onConvert() {
  const out = getCroppedCanvas(targetSize.value);
  if (!out) return;
  const ctx = out.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, targetSize.value, targetSize.value);
  isSnapped.value = false;
  applyAndRender(imageData);
}

async function onAiConvert() {
  if (!sourceImg.value) return;
  isSnapped.value = false;
  const imageData = await aiConvert(sourceImg.value, targetSize.value);
  applyAndRender(imageData);
}

function onPixelSnap() {
  if (!resultImageData.value) return;
  const snapped = pixelSnap(resultImageData.value, snapColorCount.value);
  isSnapped.value = true;
  applyAndRender(snapped);
}

watch(zoomLevel, (z) => {
  if (resultImageData.value) nextTick(() => renderPixelGrid(resultImageData.value!, z));
});

function onPixelHover(e: MouseEvent) {
  const canvas = pixelGridCanvasRef.value;
  if (!canvas || !resultImageData.value) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  const showLabels = zoomLevel.value >= 4;
  const mLeft = showLabels ? 32 : 0;
  const mTop = showLabels ? 20 : 0;
  const pxX = Math.floor((mx - mLeft) / zoomLevel.value);
  const pxY = Math.floor((my - mTop) / zoomLevel.value);
  const size = targetSize.value;
  if (pxX < 0 || pxY < 0 || pxX >= size || pxY >= size) { hoveredPixel.value = null; return; }
  const { data } = resultImageData.value;
  const i = (pxY * size + pxX) * 4;
  hoveredPixel.value = { x: pxX, y: pxY, hex: toHex(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0) };
}

async function onCopyHex(hex: string) {
  await navigator.clipboard.writeText(hex.toUpperCase()).catch(() => {});
}

function onDownload() {
  const canvas = pixelGridCanvasRef.value;
  if (!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `pixel-${targetSize.value}x${targetSize.value}.png`;
  a.click();
}

const zoomOptions = [1, 2, 4, 8, 16] as const;
const sizeOptions = [32, 64, 128, 256] as const;
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 px-6 py-4">
      <h1 class="text-lg font-bold tracking-tight">Tomodachi Hair Trace</h1>
      <p class="text-xs text-slate-500 mt-0.5">キャラ画像をドット絵に変換</p>
    </header>

    <main class="container mx-auto p-4 lg:p-6 max-w-6xl">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 左カラム -->
        <div class="space-y-4">
          <!-- アップロード -->
          <UCard>
            <template #header>
              <span class="text-sm font-medium">画像を読み込む</span>
            </template>
            <div
              class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none"
              :class="isDraggingOver ? 'border-sky-400 bg-sky-950/30' : 'border-slate-700 hover:border-slate-500'"
              @click="fileInputRef?.click()"
              @dragover.prevent="isDraggingOver = true"
              @dragleave="isDraggingOver = false"
              @drop="onDrop"
            >
              <div class="text-4xl mb-2">🖼</div>
              <p class="text-sm text-slate-400">クリックまたはドロップ</p>
              <p class="text-xs text-slate-600 mt-1">PNG · JPG · WEBP</p>
            </div>
            <input ref="fileInputRef" type="file" class="hidden" accept="image/*" @change="onFileChange" />
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

          <!-- 変換設定 -->
          <UCard v-if="sourceImg">
            <template #header>
              <span class="text-sm font-medium">変換設定</span>
            </template>
            <div class="space-y-4">
              <!-- 解像度 -->
              <div>
                <p class="text-xs text-slate-400 mb-2">解像度</p>
                <div class="flex gap-2">
                  <UButton
                    v-for="size in sizeOptions"
                    :key="size"
                    :variant="targetSize === size ? 'solid' : 'outline'"
                    size="sm"
                    @click="targetSize = size"
                  >
                    {{ size }}×{{ size }}
                  </UButton>
                </div>
              </div>
              <!-- 通常変換 -->
              <UButton class="w-full" @click="onConvert">変換する</UButton>

              <div class="border-t border-slate-800 pt-4 space-y-3">
                <p class="text-xs text-slate-400">AI 変換 <span class="text-slate-600">— アニメ強調 → ダウンスケール</span></p>

                <!-- プログレス -->
                <div v-if="aiState.status === 'loading'" class="space-y-1">
                  <div class="flex justify-between text-xs text-slate-500">
                    <span>{{ aiState.message }}</span>
                    <span>{{ aiState.progress }}%</span>
                  </div>
                  <div class="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-sky-500 rounded-full transition-all duration-300"
                      :style="{ width: `${aiState.progress}%` }"
                    />
                  </div>
                </div>

                <UButton
                  class="w-full"
                  variant="outline"
                  color="sky"
                  :loading="aiState.status === 'loading' || aiState.status === 'running'"
                  :disabled="aiState.status === 'loading' || aiState.status === 'running'"
                  @click="onAiConvert"
                >
                  {{ aiState.status === 'running' ? 'AI処理中…' : 'AI 変換する' }}
                </UButton>

                <p v-if="aiState.status === 'idle'" class="text-xs text-slate-600">
                  初回クリック時にモデル (~5MB) をダウンロードします
                </p>
              </div>
            </div>
          </UCard>

          <!-- Pixel Snap -->
          <UCard v-if="resultImageData">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Pixel Snap</span>
                <span v-if="isSnapped" class="text-xs text-green-400">適用済み</span>
              </div>
            </template>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between mb-2">
                  <p class="text-xs text-slate-400">色数上限</p>
                  <span class="text-xs font-mono text-slate-300">{{ snapColorCount }}色</span>
                </div>
                <input
                  v-model.number="snapColorCount"
                  type="range"
                  min="4"
                  max="32"
                  step="2"
                  class="w-full accent-sky-400"
                />
                <div class="flex justify-between text-xs text-slate-600 mt-1">
                  <span>4色</span>
                  <span>32色</span>
                </div>
              </div>
              <UButton class="w-full" variant="outline" @click="onPixelSnap">
                Pixel Snap を適用
              </UButton>
            </div>
          </UCard>
        </div>

        <!-- 右カラム -->
        <div class="space-y-4">
          <!-- ドット絵プレビュー -->
          <UCard v-if="resultImageData">
            <template #header>
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium">ドット絵プレビュー</span>
                  <span v-if="hoveredPixel" class="text-xs font-mono text-slate-400">
                    ({{ hoveredPixel.x }}, {{ hoveredPixel.y }})
                    <span
                      class="inline-block w-3 h-3 rounded-sm align-middle mx-1 border border-white/20"
                      :style="{ backgroundColor: hoveredPixel.hex }"
                    />
                    {{ hoveredPixel.hex.toUpperCase() }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">ズーム</span>
                  <div class="flex gap-1">
                    <UButton
                      v-for="z in zoomOptions"
                      :key="z"
                      :variant="zoomLevel === z ? 'solid' : 'ghost'"
                      size="xs"
                      @click="zoomLevel = z"
                    >
                      {{ z }}x
                    </UButton>
                  </div>
                  <UButton size="xs" variant="ghost" icon="i-heroicons-arrow-down-tray" @click="onDownload">
                    保存
                  </UButton>
                </div>
              </div>
            </template>
            <div class="overflow-auto" style="max-height: 540px">
              <canvas
                ref="pixelGridCanvasRef"
                style="image-rendering: pixelated"
                @mousemove="onPixelHover"
                @mouseleave="hoveredPixel = null"
              />
            </div>
          </UCard>

          <!-- カラーパレット -->
          <UCard v-if="colorPalette.length > 0">
            <template #header>
              <span class="text-sm font-medium">カラーパレット</span>
              <span class="text-xs text-slate-500 ml-2">{{ colorPalette.length }}色</span>
            </template>
            <div class="space-y-1 max-h-80 overflow-y-auto pr-1">
              <div
                v-for="entry in colorPalette.slice(0, 200)"
                :key="entry.hex"
                class="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-800/50 rounded px-1 py-0.5 transition-colors"
                :title="`クリックでコピー: ${entry.hex.toUpperCase()}`"
                @click="onCopyHex(entry.hex)"
              >
                <div class="w-5 h-5 rounded shrink-0 border border-white/10" :style="{ backgroundColor: entry.hex }" />
                <code class="font-mono text-slate-300 w-20 shrink-0">{{ entry.hex.toUpperCase() }}</code>
                <div class="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width: `${(entry.count / (colorPalette[0]?.count ?? 1)) * 100}%`,
                      backgroundColor: entry.hex,
                    }"
                  />
                </div>
                <span class="text-slate-500 w-12 text-right shrink-0">{{ entry.percentage.toFixed(1) }}%</span>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </main>
  </div>
</template>
