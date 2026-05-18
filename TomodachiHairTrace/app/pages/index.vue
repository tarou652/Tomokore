<script setup lang="ts">
import { CANVAS_SIZE } from '~/composables/useHairCanvas'
import type { HairMaskResult, BangRegion } from '~/composables/useHairSegment'
import { computeBangRegion } from '~/composables/useHairSegment'
import type { Contour } from '~/composables/useOpenCV'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import type { FaceBox } from '~/composables/useFaceDetect'

const { isReady, isProcessing, init, detect, getFaceBox } = useFaceDetect()
const { isReady: segmentReady, isProcessing: segmentProcessing, init: initSegment, segment } = useHairSegment()
const { isLoaded: cvLoaded, isLoading: cvLoading, loadError: cvError, load: loadCV, cannyFromMask, findContours, simplifyContours } = useOpenCV()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { drawSource, drawGrid, drawCenterLine, drawLandmarks, exportPng, drawHairMask, drawContourLines, drawSilhouette, drawBangHighlight } = useHairCanvas(canvasRef)

const sourceImageUrl = ref<string | null>(null)
const sourceImg = ref<HTMLImageElement | null>(null)

// Phase 1 overlay toggles
const showGrid = ref(true)
const showCenterLine = ref(true)
const showLandmarks = ref(true)

// Phase 2 overlay toggles
const showHairMask = ref(false)
const showContours = ref(false)
const showSilhouette = ref(false)
const showBangHighlight = ref(false)

// DP epsilon slider (0.5–10, default 2.0)
const dpEpsilon = ref(2.0)
const contourTotalPoints = ref(0)

// Cached state lifted from processImage
const currentFaceResult = ref<FaceLandmarkerResult | null>(null)
const currentBox = ref<FaceBox | null>(null)

// Cached Phase 2 results
const hairMaskResult = ref<HairMaskResult | null>(null)
const bangRegion = ref<BangRegion | null>(null)
const rawContours = ref<Contour[] | null>(null)
const simplifiedContours = ref<Contour[] | null>(null)

const statusMessage = ref('画像をアップロードしてください')

onMounted(async () => {
  try {
    await Promise.all([init(), initSegment()])
  }
  catch {
    statusMessage.value = 'MediaPipe の初期化に失敗しました'
  }
})

function resetPhase2Cache() {
  hairMaskResult.value = null
  bangRegion.value = null
  rawContours.value = null
  simplifiedContours.value = null
  contourTotalPoints.value = 0
  showHairMask.value = false
  showContours.value = false
  showSilhouette.value = false
  showBangHighlight.value = false
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    statusMessage.value = 'PNG / JPG / WEBP のみ対応しています'
    return
  }
  resetPhase2Cache()
  const url = URL.createObjectURL(file)
  sourceImageUrl.value = url
  const img = new Image()
  img.onload = () => {
    sourceImg.value = img
    processImage(img)
  }
  img.src = url
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  const fakeEvent = { target: { files: [file] } } as unknown as Event
  onFileChange(fakeEvent)
}

async function processImage(img: HTMLImageElement) {
  if (!isReady.value) {
    statusMessage.value = 'MediaPipe 初期化中...'
    return
  }

  if (img.naturalWidth * img.naturalHeight > 4_000_000) {
    statusMessage.value = '画像が大きすぎます (推奨: 4MP 以下)'
  }

  statusMessage.value = '顔を検出中...'
  const result = await detect(img)

  if (!result || !result.faceLandmarks?.[0]) {
    statusMessage.value = '顔が検出できませんでした。正面顔の画像を使用してください。'
    const box: FaceBox = { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight }
    currentFaceResult.value = null
    currentBox.value = box
    drawSource(img, box)
    if (showGrid.value) drawGrid()
    if (showCenterLine.value) drawCenterLine()
    return
  }

  const box = getFaceBox(result, img.naturalWidth, img.naturalHeight)!
  currentFaceResult.value = result
  currentBox.value = box

  drawSource(img, box)
  if (showGrid.value) drawGrid()
  if (showCenterLine.value) drawCenterLine()
  if (showLandmarks.value) drawLandmarks(result, box, img.naturalWidth, img.naturalHeight)
  statusMessage.value = '検出完了'
}

function redraw() {
  const img = sourceImg.value
  const box = currentBox.value
  if (!img || !box) return

  drawSource(img, box)
  if (showGrid.value) drawGrid()
  if (showCenterLine.value) drawCenterLine()
  if (showLandmarks.value && currentFaceResult.value)
    drawLandmarks(currentFaceResult.value, box, img.naturalWidth, img.naturalHeight)

  if (showHairMask.value && hairMaskResult.value)
    drawHairMask(hairMaskResult.value.sourceMask, hairMaskResult.value.sourceWidth, hairMaskResult.value.sourceHeight, box)
  if (showContours.value && rawContours.value)
    drawContourLines(rawContours.value, hairMaskResult.value?.sourceWidth ?? img.naturalWidth, hairMaskResult.value?.sourceHeight ?? img.naturalHeight, box)
  if (showSilhouette.value && simplifiedContours.value)
    drawSilhouette(simplifiedContours.value, hairMaskResult.value?.sourceWidth ?? img.naturalWidth, hairMaskResult.value?.sourceHeight ?? img.naturalHeight, box)
  if (showBangHighlight.value && bangRegion.value)
    drawBangHighlight(bangRegion.value.bangMask, bangRegion.value.bangYMaxInCanvas, hairMaskResult.value?.sourceWidth ?? img.naturalWidth, hairMaskResult.value?.sourceHeight ?? img.naturalHeight, box)
}

async function runPhase2Analysis() {
  const img = sourceImg.value
  const box = currentBox.value
  if (!img || !box) return

  statusMessage.value = '髪領域を抽出中...'
  const maskResult = await segment(img)
  if (!maskResult) {
    statusMessage.value = '髪抽出に失敗しました'
    return
  }
  if (maskResult.hairPixelCount === 0) {
    statusMessage.value = '髪が検出できませんでした'
    return
  }
  hairMaskResult.value = maskResult

  if (currentFaceResult.value) {
    bangRegion.value = computeBangRegion(maskResult, currentFaceResult.value, box, img.naturalHeight)
  }

  statusMessage.value = 'OpenCV を読み込み中...'
  await loadCV()
  if (cvError.value) {
    statusMessage.value = `OpenCV エラー: ${cvError.value}`
    return
  }

  statusMessage.value = '輪郭を抽出中...'
  const edges = cannyFromMask(maskResult.sourceMask, maskResult.sourceWidth, maskResult.sourceHeight)
  if (!edges) {
    statusMessage.value = 'エッジ検出に失敗しました'
    return
  }

  const contoursResult = findContours(edges.edges, edges.width, edges.height)
  if (!contoursResult) {
    statusMessage.value = '輪郭抽出に失敗しました'
    return
  }
  rawContours.value = contoursResult.contours
  contourTotalPoints.value = contoursResult.totalPoints

  simplifiedContours.value = simplifyContours(contoursResult.contours, dpEpsilon.value)

  statusMessage.value = `解析完了 (輪郭点数: ${contoursResult.totalPoints})`
  redraw()
}

watch(dpEpsilon, (eps) => {
  if (!rawContours.value) return
  simplifiedContours.value = simplifyContours(rawContours.value, eps)
  const total = simplifiedContours.value.reduce((s, c) => s + c.length, 0)
  contourTotalPoints.value = total
  redraw()
})

function downloadPng() {
  const dataUrl = exportPng()
  if (!dataUrl) return
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = 'hair-guide.png'
  a.click()
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white flex flex-col">
    <header class="px-6 py-3 border-b border-gray-800 flex items-center gap-3 flex-wrap">
      <span class="text-lg font-bold tracking-wide">Tomodachi Hair Trace</span>
      <UBadge color="primary" variant="soft">Phase 2</UBadge>
      <div class="ml-auto flex items-center gap-2 flex-wrap">
        <UBadge :color="isReady ? 'success' : 'warning'" variant="soft">
          Face: {{ isReady ? '準備完了' : '初期化中...' }}
        </UBadge>
        <UBadge :color="segmentReady ? 'success' : 'warning'" variant="soft">
          Seg: {{ segmentReady ? '準備完了' : '初期化中...' }}
        </UBadge>
        <UBadge :color="cvLoaded ? 'success' : 'neutral'" variant="soft">
          OpenCV: {{ cvLoaded ? '読込済' : '未読込' }}
        </UBadge>
      </div>
    </header>

    <main class="flex flex-1 gap-4 p-4 overflow-hidden">
      <!-- 左: 元画像 -->
      <section class="w-72 flex-shrink-0 flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">元画像</h2>

        <label
          class="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl h-48 cursor-pointer hover:border-primary-500 transition-colors"
          @dragover.prevent
          @drop="onDrop"
        >
          <UIcon name="i-heroicons-photo" class="text-4xl text-gray-500 mb-2" />
          <span class="text-sm text-gray-400">クリックまたはドロップ</span>
          <span class="text-xs text-gray-600 mt-1">PNG / JPG / WEBP</span>
          <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp" @change="onFileChange">
        </label>

        <div v-if="sourceImageUrl" class="rounded-lg overflow-hidden border border-gray-800">
          <img :src="sourceImageUrl" class="w-full object-contain max-h-64">
        </div>

        <p class="text-xs text-gray-500 leading-relaxed">
          推奨: 正面顔・アニメ立ち絵・背景単純<br>
          非推奨: 横顔・髪が画面外
        </p>
      </section>

      <!-- 中央: Canvas プレビュー -->
      <section class="flex-1 flex flex-col items-center gap-3">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider self-start">
          トモコレ変換プレビュー (256×256)
        </h2>

        <div class="relative">
          <canvas
            ref="canvasRef"
            :width="CANVAS_SIZE"
            :height="CANVAS_SIZE"
            class="border border-gray-700 rounded-lg"
            style="image-rendering: pixelated; width: 512px; height: 512px;"
          />
          <div v-if="isProcessing || segmentProcessing || cvLoading" class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary-400" />
          </div>
        </div>

        <p class="text-sm text-gray-400">{{ statusMessage }}</p>
      </section>

      <!-- 右: コントロール -->
      <section class="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">コントロール</h2>

        <!-- 髪型解析ボタン -->
        <UButton
          block
          color="primary"
          variant="solid"
          icon="i-heroicons-magnifying-glass"
          :disabled="!sourceImageUrl || segmentProcessing || cvLoading || !segmentReady"
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
            <UToggle v-model="showGrid" label="グリッド" @update:model-value="redraw" />
            <UToggle v-model="showCenterLine" label="中央ライン" @update:model-value="redraw" />
            <UToggle v-model="showLandmarks" label="ランドマーク" @update:model-value="redraw" />
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
              v-model="showBangHighlight"
              label="前髪ハイライト"
              :disabled="!bangRegion"
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
            >
            <div class="flex justify-between text-xs text-gray-500">
              <span>再現重視</span>
              <span>描きやすさ重視</span>
            </div>
            <p class="text-xs text-gray-400 mt-1">
              輪郭点数: {{ contourTotalPoints }}
            </p>
          </div>
        </UCard>

        <!-- 描画順ガイド -->
        <UCard>
          <template #header>
            <span class="text-sm font-medium">描画順ガイド</span>
          </template>
          <ol class="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>シルエット塗り</li>
            <li>前髪ライン</li>
            <li>横髪追加</li>
            <li>ハイライト</li>
            <li>微調整</li>
          </ol>
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
