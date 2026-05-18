<script setup lang="ts">
import { CANVAS_SIZE } from '~/composables/useHairCanvas'

const { isReady, isProcessing, init, detect, getFaceBox } = useFaceDetect()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { drawSource, drawGrid, drawCenterLine, drawLandmarks, exportPng } = useHairCanvas(canvasRef)

const sourceImageUrl = ref<string | null>(null)
const sourceImg = ref<HTMLImageElement | null>(null)

const showGrid = ref(true)
const showCenterLine = ref(true)
const showLandmarks = ref(true)

const statusMessage = ref('画像をアップロードしてください')

onMounted(() => {
  init().catch(() => {
    statusMessage.value = 'MediaPipe の初期化に失敗しました'
  })
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    statusMessage.value = 'PNG / JPG / WEBP のみ対応しています'
    return
  }
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
  const input = { target: { files: [file] } } as unknown as Event
  onFileChange(input)
}

async function processImage(img: HTMLImageElement) {
  if (!isReady.value) {
    statusMessage.value = 'MediaPipe 初期化中...'
    return
  }
  statusMessage.value = '顔を検出中...'
  const result = await detect(img)

  if (!result || !result.faceLandmarks?.[0]) {
    statusMessage.value = '顔が検出できませんでした。正面顔の画像を使用してください。'
    // 顔なし: 画像全体をそのまま表示
    const box = { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight }
    drawSource(img, box)
    if (showGrid.value) drawGrid()
    if (showCenterLine.value) drawCenterLine()
    return
  }

  const box = getFaceBox(result, img.naturalWidth, img.naturalHeight)!
  drawSource(img, box)
  if (showGrid.value) drawGrid()
  if (showCenterLine.value) drawCenterLine()
  if (showLandmarks.value) drawLandmarks(result, box, img.naturalWidth, img.naturalHeight)
  statusMessage.value = '検出完了'
}

function redraw() {
  if (sourceImg.value) processImage(sourceImg.value)
}

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
    <header class="px-6 py-3 border-b border-gray-800 flex items-center gap-3">
      <span class="text-lg font-bold tracking-wide">Tomodachi Hair Trace</span>
      <UBadge color="primary" variant="soft">Phase 1</UBadge>
      <UBadge :color="isReady ? 'success' : 'warning'" variant="soft" class="ml-auto">
        {{ isReady ? 'MediaPipe 準備完了' : 'MediaPipe 初期化中...' }}
      </UBadge>
    </header>

    <main class="flex flex-1 gap-4 p-4 overflow-hidden">
      <!-- 左: 元画像 -->
      <section class="w-72 flex-shrink-0 flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">元画像</h2>

        <!-- ドロップゾーン -->
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
          <div v-if="isProcessing" class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary-400" />
          </div>
        </div>

        <p class="text-sm text-gray-400">{{ statusMessage }}</p>
      </section>

      <!-- 右: コントロール -->
      <section class="w-64 flex-shrink-0 flex flex-col gap-4">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">コントロール</h2>

        <!-- オーバーレイ切替 -->
        <UCard>
          <template #header>
            <span class="text-sm font-medium">オーバーレイ</span>
          </template>
          <div class="flex flex-col gap-2">
            <UToggle v-model="showGrid" label="グリッド" @update:model-value="redraw" />
            <UToggle v-model="showCenterLine" label="中央ライン" @update:model-value="redraw" />
            <UToggle v-model="showLandmarks" label="ランドマーク" @update:model-value="redraw" />
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

        <!-- 出力 -->
        <UButton
          block
          color="primary"
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
