<script setup lang="ts">
import { CANVAS_SIZE } from "~/composables/useHairCanvas";
import type { HairMaskResult } from "~/composables/useHairSegment";
import type { Contour } from "~/composables/useOpenCV";
import type { FaceBox } from "~/composables/useFaceDetect";
import { extractHairColors } from "~/composables/useHairColor";
import type { HairColorGuide } from "~/composables/useHairColor";
import { analyzeDrawDifficulty } from "~/composables/useDrawAnalysis";
import type { DrawAnalysis } from "~/composables/useDrawAnalysis";

const {
  isReady: segmentReady,
  isProcessing: segmentProcessing,
  init: initSegment,
  segment,
} = useHairSegment();
const { error: bgRemoveError, removeBackground } = useBackgroundRemoval();
const {
  isLoaded: cvLoaded,
  isLoading: cvLoading,
  loadError: cvError,
  load: loadCV,
  cannyFromMask,
  findContours,
  simplifyContours,
} = useOpenCV();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {
  drawSource,
  drawGrid,
  drawCenterLine,
  exportPng,
  drawHairMask,
  drawContourLines,
  drawSilhouette,
  drawSmoothSilhouette,
} = useHairCanvas(canvasRef);

const silhouetteCanvasRef = ref<HTMLCanvasElement | null>(null);
const {
  drawHairMask: drawSilHairMask,
  drawSmoothSilhouette: drawSilSmoothSilhouette,
} = useHairCanvas(silhouetteCanvasRef);

const sourceImageUrl = ref<string | null>(null);
const sourceImg = ref<HTMLImageElement | null>(null);
const bgRemovedImg = ref<HTMLImageElement | null>(null);
const enableBgRemoval = ref(false);

const showGrid = ref(true);
const showCenterLine = ref(true);
const showHairMask = ref(false);
const showContours = ref(false);
const showSilhouette = ref(false);
const showSmoothSilhouette = ref(false);

const dpEpsilon = ref(2.0);
const contourTotalPoints = ref(0);

const currentBox = ref<FaceBox | null>(null);

const hairMaskResult = ref<HairMaskResult | null>(null);
const rawContours = ref<Contour[] | null>(null);
const simplifiedContours = ref<Contour[] | null>(null);

const hairColorGuide = ref<HairColorGuide | null>(null);
const drawAnalysis = ref<DrawAnalysis | null>(null);

const statusMessage = ref("画像をアップロードしてください");

onMounted(async () => {
  try {
    await initSegment();
  } catch {
    statusMessage.value = "MediaPipe の初期化に失敗しました";
  }
});

function resetPhase2Cache() {
  hairMaskResult.value = null;
  rawContours.value = null;
  simplifiedContours.value = null;
  contourTotalPoints.value = 0;
  bgRemovedImg.value = null;
  showHairMask.value = false;
  showContours.value = false;
  showSilhouette.value = false;
  showSmoothSilhouette.value = false;
  hairColorGuide.value = null;
  drawAnalysis.value = null;
  const ctx = silhouetteCanvasRef.value?.getContext("2d");
  if (ctx) ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    statusMessage.value = "PNG / JPG / WEBP のみ対応しています";
    return;
  }
  resetPhase2Cache();
  const url = URL.createObjectURL(file);
  sourceImageUrl.value = url;
  const img = new Image();
  img.onload = () => {
    sourceImg.value = img;
    processImage(img);
  };
  img.src = url;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  const fakeEvent = { target: { files: [file] } } as unknown as Event;
  onFileChange(fakeEvent);
}

function processImage(img: HTMLImageElement) {
  if (img.naturalWidth * img.naturalHeight > 4_000_000) {
    statusMessage.value = "画像が大きすぎます (推奨: 4MP 以下)";
    return;
  }
  const box: FaceBox = {
    x: 0,
    y: 0,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
  currentBox.value = box;
  drawSource(img, box);
  if (showGrid.value) drawGrid();
  if (showCenterLine.value) drawCenterLine();
  statusMessage.value = "「髪型解析」ボタンを押してください";
}

function redraw() {
  const img = sourceImg.value;
  const box = currentBox.value;
  if (!img || !box) return;

  drawSource(img, box);
  if (showGrid.value) drawGrid();
  if (showCenterLine.value) drawCenterLine();

  const mw = hairMaskResult.value?.sourceWidth ?? img.naturalWidth;
  const mh = hairMaskResult.value?.sourceHeight ?? img.naturalHeight;

  if (showHairMask.value && hairMaskResult.value)
    drawHairMask(hairMaskResult.value.sourceMask, mw, mh, box);
  if (showContours.value && rawContours.value)
    drawContourLines(rawContours.value, mw, mh, box);
  if (showSilhouette.value && simplifiedContours.value)
    drawSilhouette(simplifiedContours.value, mw, mh, box);
  if (showSmoothSilhouette.value && simplifiedContours.value)
    drawSmoothSilhouette(simplifiedContours.value, mw, mh, box);
}

function redrawSilhouette() {
  if (!silhouetteCanvasRef.value || !hairMaskResult.value || !currentBox.value)
    return;
  const ctx = silhouetteCanvasRef.value.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const { sourceMask, sourceWidth, sourceHeight } = hairMaskResult.value;
  drawSilHairMask(
    sourceMask,
    sourceWidth,
    sourceHeight,
    currentBox.value,
    "rgba(30, 30, 40, 0.92)",
  );
  if (simplifiedContours.value) {
    drawSilSmoothSilhouette(
      simplifiedContours.value,
      sourceWidth,
      sourceHeight,
      currentBox.value,
    );
  }
}

async function runPhase2Analysis() {
  const box = currentBox.value;
  if (!sourceImg.value || !box) return;

  let workImg = sourceImg.value;

  if (enableBgRemoval.value) {
    statusMessage.value = "背景を除去中...";
    const removed = await removeBackground(workImg);
    if (bgRemoveError.value) {
      statusMessage.value = `背景除去エラー: ${bgRemoveError.value}`;
      return;
    }
    if (removed) {
      bgRemovedImg.value = removed;
      workImg = removed;
    }
  }

  statusMessage.value = "髪領域を抽出中...";
  const maskResult = await segment(workImg);
  if (!maskResult) {
    statusMessage.value = "髪抽出に失敗しました";
    return;
  }
  if (maskResult.hairPixelCount === 0) {
    statusMessage.value = "髪が検出できませんでした";
    return;
  }
  hairMaskResult.value = maskResult;

  statusMessage.value = "OpenCV を読み込み中...";
  await loadCV();
  if (cvError.value) {
    statusMessage.value = `OpenCV エラー: ${cvError.value}`;
    return;
  }

  statusMessage.value = "輪郭を抽出中...";
  const edges = cannyFromMask(
    maskResult.sourceMask,
    maskResult.sourceWidth,
    maskResult.sourceHeight,
  );
  if (!edges) {
    statusMessage.value = "エッジ検出に失敗しました";
    return;
  }

  const contoursResult = findContours(edges.edges, edges.width, edges.height);
  if (!contoursResult) {
    statusMessage.value = "輪郭抽出に失敗しました";
    return;
  }
  rawContours.value = contoursResult.contours;
  contourTotalPoints.value = contoursResult.totalPoints;

  simplifiedContours.value = simplifyContours(
    contoursResult.contours,
    dpEpsilon.value,
  );

  hairColorGuide.value = extractHairColors(
    maskResult.sourceMask,
    maskResult.sourceWidth,
    maskResult.sourceHeight,
    workImg,
  );
  drawAnalysis.value = analyzeDrawDifficulty(simplifiedContours.value, null);

  statusMessage.value = `解析完了 (輪郭点数: ${contoursResult.totalPoints} / 難易度: ${drawAnalysis.value.grade})`;
  redraw();
  redrawSilhouette();
}

watch(dpEpsilon, (eps) => {
  if (!rawContours.value) return;
  simplifiedContours.value = simplifyContours(rawContours.value, eps);
  contourTotalPoints.value = simplifiedContours.value.reduce(
    (s, c) => s + c.length,
    0,
  );
  drawAnalysis.value = analyzeDrawDifficulty(simplifiedContours.value, null);
  redraw();
  redrawSilhouette();
});

type BadgeColor =
  | "success"
  | "primary"
  | "warning"
  | "error"
  | "neutral"
  | "secondary"
  | "info";

function gradeBadgeColor(grade: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    S: "success",
    A: "primary",
    B: "warning",
    C: "error",
    D: "error",
  };
  return map[grade] ?? "neutral";
}

function downloadPng() {
  const dataUrl = exportPng();
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "hair-guide.png";
  a.click();
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white flex flex-col">
    <header
      class="px-6 py-3 border-b border-gray-800 flex items-center gap-3 flex-wrap"
    >
      <span class="text-lg font-bold tracking-wide">Tomodachi Hair Trace</span>
      <UBadge color="primary" variant="soft">Phase 3</UBadge>
      <div class="ml-auto flex items-center gap-2 flex-wrap">
        <UBadge :color="segmentReady ? 'success' : 'warning'" variant="soft">
          Seg: {{ segmentReady ? "準備完了" : "初期化中..." }}
        </UBadge>
        <UBadge :color="cvLoaded ? 'success' : 'neutral'" variant="soft">
          OpenCV: {{ cvLoaded ? "読込済" : "未読込" }}
        </UBadge>
      </div>
    </header>

    <main class="flex flex-1 gap-4 p-4 overflow-hidden">
      <!-- 左: 元画像 -->
      <section class="w-64 flex-shrink-0 flex flex-col gap-3">
        <h2
          class="text-sm font-semibold text-gray-400 uppercase tracking-wider"
        >
          元画像
        </h2>

        <label
          class="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl h-40 cursor-pointer hover:border-primary-500 transition-colors"
          @dragover.prevent
          @drop="onDrop"
        >
          <UIcon name="i-heroicons-photo" class="text-4xl text-gray-500 mb-2" />
          <span class="text-sm text-gray-400">クリックまたはドロップ</span>
          <span class="text-xs text-gray-600 mt-1">PNG / JPG / WEBP</span>
          <input
            type="file"
            class="hidden"
            accept="image/png,image/jpeg,image/webp"
            @change="onFileChange"
          />
        </label>

        <div
          v-if="sourceImageUrl"
          class="rounded-lg overflow-hidden border border-gray-800"
        >
          <img :src="sourceImageUrl" class="w-full object-contain max-h-48" />
        </div>

        <div v-if="bgRemovedImg" class="flex flex-col gap-1">
          <span class="text-xs text-gray-500">背景除去後</span>
          <div
            class="rounded-lg overflow-hidden border border-gray-700 bg-[#888] bg-[repeating-conic-gradient(#aaa_0%_25%,#888_0%_50%)] bg-size-[12px_12px]"
          >
            <img
              :src="bgRemovedImg.src"
              class="w-full object-contain max-h-48"
            />
          </div>
        </div>

        <p class="text-xs text-gray-500 leading-relaxed">
          アニメ立ち絵・正面推奨<br />
          横顔・髪が画面外は不向き
        </p>
      </section>

      <!-- 中央: Canvas プレビュー -->
      <section class="flex-1 flex flex-col gap-3 overflow-auto min-w-0">
        <h2
          class="text-sm font-semibold text-gray-400 uppercase tracking-wider"
        >
          プレビュー (256×256)
        </h2>

        <div class="flex gap-4 flex-wrap">
          <!-- 元画像 + オーバーレイ -->
          <div class="flex flex-col gap-1">
            <span class="text-xs text-gray-500">元画像 + オーバーレイ</span>
            <div class="relative">
              <canvas
                ref="canvasRef"
                :width="CANVAS_SIZE"
                :height="CANVAS_SIZE"
                class="border border-gray-700 rounded-lg"
                style="image-rendering: pixelated; width: 400px; height: 400px"
              />
              <div
                v-if="segmentProcessing || cvLoading"
                class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg"
              >
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="animate-spin text-3xl text-primary-400"
                />
              </div>
            </div>
          </div>

          <!-- 髪シルエット専用ビュー -->
          <div v-if="hairMaskResult" class="flex flex-col gap-1">
            <span class="text-xs text-gray-500">髪シルエット</span>
            <canvas
              ref="silhouetteCanvasRef"
              :width="CANVAS_SIZE"
              :height="CANVAS_SIZE"
              class="border border-gray-700 rounded-lg"
              style="image-rendering: pixelated; width: 400px; height: 400px"
            />
          </div>
        </div>

        <p class="text-sm text-gray-400">{{ statusMessage }}</p>
      </section>

      <!-- 右: コントロール -->
      <section class="w-60 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        <h2
          class="text-sm font-semibold text-gray-400 uppercase tracking-wider"
        >
          コントロール
        </h2>

        <!-- 背景除去オプション -->
        <UCard>
          <template #header>
            <span class="text-sm font-medium">解析オプション</span>
          </template>
          <UToggle v-model="enableBgRemoval" label="背景除去してから解析">
            <template #description>
              <span class="text-xs text-gray-500">
                複雑な背景の画像に有効（初回は数十秒かかります）
              </span>
            </template>
          </UToggle>
        </UCard>

        <!-- 髪型解析ボタン -->
        <UButton
          block
          color="primary"
          variant="solid"
          icon="i-heroicons-magnifying-glass"
          :disabled="
            !sourceImageUrl || segmentProcessing || cvLoading || !segmentReady
          "
          :loading="segmentProcessing || cvLoading"
          @click="runPhase2Analysis"
        >
          髪型解析
        </UButton>

        <!-- オーバーレイ切替 -->
        <UCard>
          <template #header>
            <span class="text-sm font-medium">オーバーレイ</span>
          </template>
          <div class="flex flex-col gap-2">
            <UToggle
              v-model="showGrid"
              label="グリッド"
              @update:model-value="redraw"
            />
            <UToggle
              v-model="showCenterLine"
              label="中央ライン"
              @update:model-value="redraw"
            />
            <UDivider class="my-1" />
            <UToggle
              v-model="showHairMask"
              label="髪マスク"
              :disabled="!hairMaskResult"
              @update:model-value="redraw"
            />
            <UToggle
              v-model="showContours"
              label="輪郭"
              :disabled="!rawContours"
              @update:model-value="redraw"
            />
            <UToggle
              v-model="showSilhouette"
              label="シルエット"
              :disabled="!simplifiedContours"
              @update:model-value="redraw"
            />
            <UToggle
              v-model="showSmoothSilhouette"
              label="スムーズシルエット"
              :disabled="!simplifiedContours"
              @update:model-value="redraw"
            />
          </div>
        </UCard>

        <!-- シルエット最適化スライダー -->
        <UCard v-if="rawContours">
          <template #header>
            <span class="text-sm font-medium">シルエット最適化</span>
          </template>
          <div class="flex flex-col gap-2">
            <div class="flex justify-between text-xs text-gray-400">
              <span>単純化強度</span>
              <span>{{ dpEpsilon.toFixed(1) }}</span>
            </div>
            <input
              v-model.number="dpEpsilon"
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              class="w-full accent-primary-500"
            />
            <div class="flex justify-between text-xs text-gray-500">
              <span>再現重視</span>
              <span>描きやすさ重視</span>
            </div>
            <p class="text-xs text-gray-400 mt-1">
              輪郭点数: {{ contourTotalPoints }}
            </p>
          </div>
        </UCard>

        <!-- 色ガイド -->
        <UCard v-if="hairColorGuide">
          <template #header>
            <span class="text-sm font-medium">色ガイド</span>
          </template>
          <div class="flex flex-col gap-2">
            <div
              v-for="(entry, key) in {
                ベース: hairColorGuide.base,
                影: hairColorGuide.shadow,
                ハイライト: hairColorGuide.highlight,
              }"
              :key="key"
              class="flex items-center gap-2"
            >
              <div
                class="w-6 h-6 rounded border border-gray-600 shrink-0"
                :style="{ background: entry }"
              />
              <span class="text-xs text-gray-400">{{ key }}</span>
              <span class="text-xs text-gray-500 ml-auto font-mono">{{
                entry
              }}</span>
            </div>
          </div>
        </UCard>

        <!-- 描画難易度 -->
        <UCard v-if="drawAnalysis">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">描画難易度</span>
              <UBadge
                :color="gradeBadgeColor(drawAnalysis.grade)"
                variant="soft"
              >
                {{ drawAnalysis.grade }}
              </UBadge>
            </div>
          </template>
          <ul class="text-xs text-gray-400 space-y-1">
            <li
              v-for="tip in drawAnalysis.tips"
              :key="tip"
              class="leading-relaxed"
            >
              {{ tip }}
            </li>
          </ul>
        </UCard>

        <!-- 描画順ガイド -->
        <UCard>
          <template #header>
            <span class="text-sm font-medium">描画順ガイド</span>
          </template>
          <template v-if="drawAnalysis">
            <ol class="text-xs text-gray-400 space-y-1 list-none">
              <li v-for="step in drawAnalysis.drawingOrder" :key="step">
                {{ step }}
              </li>
            </ol>
          </template>
          <template v-else>
            <ol
              class="text-xs text-gray-400 space-y-1 list-decimal list-inside"
            >
              <li>シルエット塗り</li>
              <li>前髪ライン</li>
              <li>横髪追加</li>
              <li>ハイライト</li>
              <li>微調整</li>
            </ol>
          </template>
        </UCard>

        <!-- PNG 出力 -->
        <UButton
          block
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-down-tray"
          :disabled="!sourceImageUrl"
          @click="downloadPng"
        >
          PNG 出力
        </UButton>
      </section>
    </main>
  </div>
</template>
