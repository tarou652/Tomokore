<script setup lang="ts">
import { usePixelEditor, type EditorTool } from "~/composables/usePixelEditor";

/** 1ピクセルをキャンバス上に表示する拡大倍率 */
const ZOOM = 4;
/** ピクセルグリッド線の色 */
const GRID_COLOR = "rgba(42, 31, 27, 0.1)";

const props = withDefaults(
  defineProps<{
    imageData: ImageData;
    palette?: { hex: string; r: number; g: number; b: number }[];
  }>(),
  { palette: () => [] },
);

const emit = defineEmits<{
  update: [imageData: ImageData];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const tool = ref<EditorTool>("pen");
const color = ref({ r: 0, g: 0, b: 0 });
const symmetryH = ref(false);
const symmetryV = ref(false);
const isDrawing = ref(false);

const editor = usePixelEditor();

onMounted(() => {
  editor.init(props.imageData);
  setInitialColor();
  renderCanvas();
});

watch(
  () => props.imageData,
  (img) => {
    editor.init(img);
    setInitialColor();
    nextTick(() => renderCanvas());
  },
);

/** パレットの最初の色を初期選択色にする */
function setInitialColor(): void {
  const first = props.palette[0];
  if (first) color.value = { r: first.r, g: first.g, b: first.b };
}

/** キャンバスに現在のピクセルデータとグリッドを描画する */
function renderCanvas(): void {
  const canvas = canvasRef.value;
  const pix = editor.pixels.value;
  if (!canvas || !pix) return;
  const w = editor.width.value;
  const h = editor.height.value;
  canvas.width = w * ZOOM;
  canvas.height = h * ZOOM;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ピクセルデータをスケールアップして描画する
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  tmp
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pix), w, h), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);

  // ピクセルグリッド線を描画する
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x++) {
    ctx.beginPath();
    ctx.moveTo(x * ZOOM, 0);
    ctx.lineTo(x * ZOOM, h * ZOOM);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * ZOOM);
    ctx.lineTo(w * ZOOM, y * ZOOM);
    ctx.stroke();
  }
}

/** マウスイベントからピクセル座標を求める（範囲外は null）*/
function getCoord(e: MouseEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const x = Math.floor(((e.clientX - rect.left) * sx) / ZOOM);
  const y = Math.floor(((e.clientY - rect.top) * sy) / ZOOM);
  if (x < 0 || x >= editor.width.value || y < 0 || y >= editor.height.value)
    return null;
  return { x, y };
}

/** ツールを指定座標（および対称位置）に適用する */
function applyAt(x: number, y: number): void {
  const { r, g, b } = color.value;
  const w = editor.width.value;
  const h = editor.height.value;
  const coords: [number, number][] = [[x, y]];
  if (symmetryH.value) coords.push([w - 1 - x, y]);
  if (symmetryV.value) coords.push([x, h - 1 - y]);
  if (symmetryH.value && symmetryV.value) coords.push([w - 1 - x, h - 1 - y]);
  for (const [cx, cy] of coords) {
    if (tool.value === "pen") editor.applyPen(cx, cy, r, g, b);
    else if (tool.value === "eraser") editor.applyEraser(cx, cy);
  }
}

function onMouseDown(e: MouseEvent): void {
  const coord = getCoord(e);
  if (!coord) return;
  editor.pushUndo();
  isDrawing.value = true;
  if (tool.value === "fill") {
    editor.applyFill(
      coord.x,
      coord.y,
      color.value.r,
      color.value.g,
      color.value.b,
    );
    renderCanvas();
    const result = editor.toImageData();
    if (result) emit("update", result);
    return;
  }
  applyAt(coord.x, coord.y);
  renderCanvas();
}

function onMouseMove(e: MouseEvent): void {
  if (!isDrawing.value || tool.value === "fill") return;
  const coord = getCoord(e);
  if (!coord) return;
  applyAt(coord.x, coord.y);
  renderCanvas();
}

function onMouseUp(): void {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  const result = editor.toImageData();
  if (result) emit("update", result);
}

/** undo して再描画する */
function onUndo(): void {
  editor.undo();
  renderCanvas();
  const result = editor.toImageData();
  if (result) emit("update", result);
}
</script>

<template>
  <section class="card overflow-hidden">
    <header class="card-header" style="background: #fff3e0">
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0"
          style="border: 2px solid #2a1f1b; box-shadow: 0 2px 0 0 #2a1f1b"
        >
          <span style="font-size: 14px">✏️</span>
        </div>
        <div>
          <h2
            class="font-bold"
            style="font-size: 14px; color: #2a1f1b; line-height: 1.2"
          >
            ドット絵エディタ
          </h2>
          <p style="font-size: 11px; color: #4a3a33; margin-top: 2px">
            {{ editor.width.value }}×{{ editor.height.value }}px
          </p>
        </div>
      </div>
    </header>

    <EditorToolbar
      v-model:tool="tool"
      v-model:color="color"
      v-model:symmetry-h="symmetryH"
      v-model:symmetry-v="symmetryV"
      :can-undo="editor.canUndo.value"
      :palette="palette"
      @undo="onUndo"
    />

    <div
      class="p-3 overflow-auto"
      style="background: rgba(42, 31, 27, 0.04); max-height: 520px"
    >
      <canvas
        ref="canvasRef"
        style="image-rendering: pixelated; display: block; cursor: crosshair"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @contextmenu.prevent
      />
    </div>
  </section>
</template>
