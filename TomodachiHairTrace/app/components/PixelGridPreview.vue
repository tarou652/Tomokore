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
/** キャンバス背景色 */
const CANVAS_BG = "#fffcf3";
/** 透明ピクセルのチェッカー色A */
const CHECKER_A = "#f1e3c5";
/** グリッド線の色 */
const GRID_LINE_COLOR = "rgba(42,31,27,0.10)";
/** 座標ラベルの色 */
const LABEL_COLOR = "#9c8d81";

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
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4;
      const a = data[i + 3] ?? 255;
      if (a < CHECKERBOARD_ALPHA) {
        ctx.fillStyle = (px + py) % 2 === 0 ? CHECKER_A : CANVAS_BG;
      } else {
        ctx.fillStyle = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
      }
      ctx.fillRect(mLeft + px * zoom, mTop + py * zoom, zoom, zoom);
    }
  }

  if (zoom >= GRID_LINE_MIN_ZOOM) {
    ctx.strokeStyle = GRID_LINE_COLOR;
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
    ctx.fillStyle = LABEL_COLOR;
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
  (data) =>
    nextTick(() => {
      zoomFit();
      renderPixelGrid(data, zoomLevel.value);
    }),
);
</script>

<template>
  <section class="card" style="overflow: hidden">
    <header class="card-header" style="background: #c4e3f7">
      <div class="flex items-center gap-2 min-w-0">
        <div
          class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0"
          style="border: 2px solid #2a1f1b; box-shadow: 0 2px 0 0 #2a1f1b"
        >
          <span style="font-size: 14px">✨</span>
        </div>
        <div class="min-w-0">
          <h2
            class="font-bold"
            style="font-size: 14px; color: #2a1f1b; line-height: 1.2"
          >
            ドット絵プレビュー
          </h2>
          <p
            v-if="hoveredPixel"
            class="mono flex items-center gap-1"
            style="font-size: 11px; color: #4a3a33; margin-top: 2px"
          >
            ({{ hoveredPixel.x }}, {{ hoveredPixel.y }})
            <span
              class="inline-block w-3 h-3 rounded-sm align-middle"
              style="border: 1px solid #2a1f1b"
              :style="{ background: hoveredPixel.hex }"
            />
            {{ hoveredPixel.hex.toUpperCase() }}
          </p>
          <p
            v-else
            class="mono"
            style="font-size: 11px; color: #4a3a33; margin-top: 2px"
          >
            {{ props.imageData.width }}×{{ props.imageData.height }} px · ズーム
            {{ zoomLevel }}×
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button
          class="btn"
          title="実際のサイズ (Ctrl+1)"
          @click="zoomLevel = 1"
        >
          1:1
        </button>
        <button
          class="btn"
          title="ウィンドウに合わせる (Ctrl+0)"
          @click="zoomFit"
        >
          Fit
        </button>
        <span
          class="inline-block w-px h-5 mx-0.5"
          style="background: rgba(42, 31, 27, 0.25)"
        />
        <button
          class="btn btn-icon"
          title="ズームアウト (Ctrl+-)"
          @click="zoomStep(-1)"
        >
          −
        </button>
        <span
          class="mono font-bold text-center tabular-nums"
          style="width: 48px; font-size: 12px; color: #2a1f1b"
        >
          {{ zoomLevel * 100 }}%
        </span>
        <button
          class="btn btn-icon"
          title="ズームイン (Ctrl++)"
          @click="zoomStep(1)"
        >
          +
        </button>
        <span
          class="inline-block w-px h-5 mx-0.5"
          style="background: rgba(42, 31, 27, 0.25)"
        />
        <button class="btn btn-primary" title="PNG保存" @click="onDownload">
          ↓ 保存
        </button>
      </div>
    </header>
    <div
      ref="pixelGridContainerRef"
      class="nice-scroll"
      style="background: #fffcf3; overflow: auto; width: 100%"
      :style="{ maxHeight: `${GRID_MAX_HEIGHT}px` }"
      @wheel="onWheel"
    >
      <canvas
        ref="pixelGridCanvasRef"
        style="image-rendering: pixelated; cursor: crosshair; display: block"
        @mousemove="onPixelHover"
        @mouseleave="hoveredPixel = null"
      />
    </div>
    <div
      class="flex items-center justify-between mono px-4 py-2"
      style="
        font-size: 10px;
        color: #7a6a5f;
        border-top: 1px solid rgba(42, 31, 27, 0.1);
      "
    >
      <span>Ctrl + ホイールでズーム · Ctrl+0 フィット · Ctrl+1 等倍</span>
      <span class="font-bold" style="color: #4a3a33">
        {{ props.imageData.width * props.imageData.height }} px
      </span>
    </div>
  </section>
</template>
