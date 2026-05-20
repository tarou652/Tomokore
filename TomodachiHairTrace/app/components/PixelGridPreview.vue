<script setup lang="ts">
/** Photoshop準拠のズーム段階リスト */
const ZOOM_LEVELS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;
/** 初期ズーム倍率 */
const DEFAULT_ZOOM = 4;
/** グリッドエリアの最大高さ（px） */
const GRID_MAX_HEIGHT = 540;
/** 座標ラベルを表示する最小ズーム倍率 */
const LABEL_MIN_ZOOM = 4;
/** 座標ラベル用の左マージン（px） */
const LABEL_MARGIN_LEFT = 32;
/** 座標ラベル用の上マージン（px） */
const LABEL_MARGIN_TOP = 20;
/** グリッド線を表示する最小ズーム倍率 */
const GRID_LINE_MIN_ZOOM = 2;
/** 透明ピクセルと判断するアルファ閾値 */
const CHECKERBOARD_ALPHA = 128;

const props = defineProps<{
  imageData: ImageData;
}>();

const pixelGridCanvasRef = ref<HTMLCanvasElement | null>(null);
const pixelGridContainerRef = ref<HTMLDivElement | null>(null);
const zoomLevel = ref(DEFAULT_ZOOM);
const hoveredPixel = ref<{ x: number; y: number; hex: string } | null>(null);

/** RGB値を6桁16進数カラーコードに変換する */
function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** ズームレベルをPhotoshop準拠のステップで変更する */
function zoomStep(dir: 1 | -1) {
  const cur = zoomLevel.value;
  const idx = ZOOM_LEVELS.indexOf(cur as (typeof ZOOM_LEVELS)[number]);
  const base =
    idx !== -1
      ? idx
      : ZOOM_LEVELS.reduce(
          (bi, z, i) =>
            Math.abs(z - cur) < Math.abs((ZOOM_LEVELS[bi] ?? 0) - cur) ? i : bi,
          0,
        );
  const next =
    ZOOM_LEVELS[Math.max(0, Math.min(ZOOM_LEVELS.length - 1, base + dir))];
  if (next !== undefined && next !== cur) zoomLevel.value = next;
}

/** コンテナ幅に合わせたフィットズームを計算して適用する */
function zoomFit() {
  const container = pixelGridContainerRef.value;
  if (!container) return;
  const { width, height } = props.imageData;
  const avail = Math.min(container.clientWidth - 48, GRID_MAX_HEIGHT);
  const fit = Math.max(1, Math.floor(avail / Math.max(width, height)));
  zoomLevel.value = ZOOM_LEVELS.reduce((best, z) =>
    Math.abs(z - fit) < Math.abs(best - fit) ? z : best,
  );
}

/** Ctrl+スクロールでカーソル位置を中心にズームする */
function onWheel(e: WheelEvent) {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const container = pixelGridContainerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left + container.scrollLeft;
  const mouseY = e.clientY - rect.top + container.scrollTop;
  const showLabels = zoomLevel.value >= LABEL_MIN_ZOOM;
  const mLeft = showLabels ? LABEL_MARGIN_LEFT : 0;
  const mTop = showLabels ? LABEL_MARGIN_TOP : 0;
  const gridX = (mouseX - mLeft) / zoomLevel.value;
  const gridY = (mouseY - mTop) / zoomLevel.value;

  const oldZoom = zoomLevel.value;
  zoomStep(e.deltaY < 0 ? 1 : -1);
  if (zoomLevel.value === oldZoom) return;

  nextTick(() => {
    const nz = zoomLevel.value;
    const nl = nz >= LABEL_MIN_ZOOM ? LABEL_MARGIN_LEFT : 0;
    const nt = nz >= LABEL_MIN_ZOOM ? LABEL_MARGIN_TOP : 0;
    container.scrollLeft = gridX * nz + nl - (e.clientX - rect.left);
    container.scrollTop = gridY * nz + nt - (e.clientY - rect.top);
  });
}

/** キーボードショートカットでズーム操作を処理する */
function onKeydown(e: KeyboardEvent) {
  if (!e.ctrlKey || !props.imageData) return;
  if (e.key === "=" || e.key === "+") {
    e.preventDefault();
    zoomStep(1);
  } else if (e.key === "-") {
    e.preventDefault();
    zoomStep(-1);
  } else if (e.key === "0") {
    e.preventDefault();
    zoomFit();
  } else if (e.key === "1") {
    e.preventDefault();
    zoomLevel.value = 1;
  }
}

/** ピクセルグリッドをCanvasに描画する */
function renderPixelGrid(imageData: ImageData, zoom: number) {
  const canvas = pixelGridCanvasRef.value;
  if (!canvas) return;
  const { width, height, data } = imageData;
  const showLabels = zoom >= LABEL_MIN_ZOOM;
  const mLeft = showLabels ? LABEL_MARGIN_LEFT : 0;
  const mTop = showLabels ? LABEL_MARGIN_TOP : 0;

  canvas.width = width * zoom + mLeft;
  canvas.height = height * zoom + mTop;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4;
      const a = data[i + 3] ?? 255;
      if (a < CHECKERBOARD_ALPHA) {
        ctx.fillStyle = (px + py) % 2 === 0 ? "#444" : "#333";
      } else {
        ctx.fillStyle = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
      }
      ctx.fillRect(mLeft + px * zoom, mTop + py * zoom, zoom, zoom);
    }
  }

  if (zoom >= GRID_LINE_MIN_ZOOM) {
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 0.5;
    for (let xi = 0; xi <= width; xi++) {
      const px = mLeft + xi * zoom + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, mTop);
      ctx.lineTo(px, mTop + height * zoom);
      ctx.stroke();
    }
    for (let yi = 0; yi <= height; yi++) {
      const py = mTop + yi * zoom + 0.5;
      ctx.beginPath();
      ctx.moveTo(mLeft, py);
      ctx.lineTo(mLeft + width * zoom, py);
      ctx.stroke();
    }
  }

  if (showLabels) {
    // ズーム倍率に応じてラベル表示間隔を調整する
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

/** マウス位置のピクセル座標とHEXカラーを hoveredPixel に反映する */
function onPixelHover(e: MouseEvent) {
  const canvas = pixelGridCanvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  const showLabels = zoomLevel.value >= LABEL_MIN_ZOOM;
  const mLeft = showLabels ? LABEL_MARGIN_LEFT : 0;
  const mTop = showLabels ? LABEL_MARGIN_TOP : 0;
  const pxX = Math.floor((mx - mLeft) / zoomLevel.value);
  const pxY = Math.floor((my - mTop) / zoomLevel.value);
  const { width, height } = props.imageData;
  if (pxX < 0 || pxY < 0 || pxX >= width || pxY >= height) {
    hoveredPixel.value = null;
    return;
  }
  const { data } = props.imageData;
  const i = (pxY * width + pxX) * 4;
  hoveredPixel.value = {
    x: pxX,
    y: pxY,
    hex: toHex(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0),
  };
}

/** グリッドCanvasをPNGとしてダウンロードする */
function onDownload() {
  const canvas = pixelGridCanvasRef.value;
  if (!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `pixel-${props.imageData.width}x${props.imageData.height}.png`;
  a.click();
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  nextTick(() => {
    renderPixelGrid(props.imageData, zoomLevel.value);
    zoomFit();
  });
});

onUnmounted(() => document.removeEventListener("keydown", onKeydown));

watch(zoomLevel, (z) => nextTick(() => renderPixelGrid(props.imageData, z)));
watch(
  () => props.imageData,
  (data) => nextTick(() => renderPixelGrid(data, zoomLevel.value)),
);
</script>

<template>
  <UCard class="overflow-hidden">
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
        <div class="flex items-center gap-1.5">
          <UButton
            size="xs"
            variant="ghost"
            title="実際のサイズ (Ctrl+1)"
            @click="zoomLevel = 1"
          >
            1:1
          </UButton>
          <UButton
            size="xs"
            variant="ghost"
            title="ウィンドウに合わせる (Ctrl+0)"
            @click="zoomFit"
          >
            Fit
          </UButton>
          <div class="w-px h-4 bg-slate-700 mx-0.5" />
          <UButton
            size="xs"
            variant="ghost"
            icon="i-heroicons-minus-small"
            title="ズームアウト (Ctrl+-)"
            @click="zoomStep(-1)"
          />
          <span
            class="text-xs font-mono text-slate-300 w-10 text-center select-none"
          >
            {{ zoomLevel * 100 }}%
          </span>
          <UButton
            size="xs"
            variant="ghost"
            icon="i-heroicons-plus-small"
            title="ズームイン (Ctrl++)"
            @click="zoomStep(1)"
          />
          <div class="w-px h-4 bg-slate-700 mx-0.5" />
          <UButton
            size="xs"
            variant="ghost"
            icon="i-heroicons-arrow-down-tray"
            title="PNG保存"
            @click="onDownload"
          >
            保存
          </UButton>
        </div>
      </div>
    </template>
    <div
      ref="pixelGridContainerRef"
      class="overflow-auto"
      :style="{ maxHeight: `${GRID_MAX_HEIGHT}px` }"
      @wheel="onWheel"
    >
      <canvas
        ref="pixelGridCanvasRef"
        style="image-rendering: pixelated"
        @mousemove="onPixelHover"
        @mouseleave="hoveredPixel = null"
      />
    </div>
  </UCard>
</template>
