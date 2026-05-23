import { ref, computed } from "vue";
import { floodFill } from "./useFloodFill";

/** ドット絵エディタのツール種別 */
export type EditorTool = "pen" | "eraser" | "fill";

/** undo スタックの最大深度 */
const MAX_UNDO_DEPTH = 20;

/**
 * ドット絵エディタの状態と描画操作を提供するコンポーザブル
 */
export function usePixelEditor() {
  const pixels = ref<Uint8ClampedArray | null>(null);
  const width = ref(0);
  const height = ref(0);
  const undoStack = ref<Uint8ClampedArray[]>([]);

  /** undo が可能かどうか */
  const canUndo = computed(() => undoStack.value.length > 0);

  /** ImageData でエディタを初期化する */
  function init(imageData: ImageData): void {
    width.value = imageData.width;
    height.value = imageData.height;
    pixels.value = new Uint8ClampedArray(imageData.data);
    undoStack.value = [];
  }

  /** 現在のピクセルデータを ImageData として返す */
  function toImageData(): ImageData | null {
    if (!pixels.value || width.value === 0) return null;
    return new ImageData(
      new Uint8ClampedArray(pixels.value),
      width.value,
      height.value,
    );
  }

  /** 現在の状態を undo スタックに保存する */
  function pushUndo(): void {
    if (!pixels.value) return;
    undoStack.value.push(new Uint8ClampedArray(pixels.value));
    if (undoStack.value.length > MAX_UNDO_DEPTH) undoStack.value.shift();
  }

  /** 直前の状態に戻す */
  function undo(): void {
    const prev = undoStack.value.pop();
    if (prev) pixels.value = prev;
  }

  /** 座標が有効なら配列インデックスを返す（範囲外は null） */
  function pixelIdx(x: number, y: number): number | null {
    if (
      !pixels.value ||
      x < 0 ||
      x >= width.value ||
      y < 0 ||
      y >= height.value
    )
      return null;
    return (y * width.value + x) * 4;
  }

  /** ペンで指定座標を指定色で塗る */
  function applyPen(
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
  ): void {
    const idx = pixelIdx(x, y);
    if (idx === null || !pixels.value) return;
    pixels.value[idx] = r;
    pixels.value[idx + 1] = g;
    pixels.value[idx + 2] = b;
    pixels.value[idx + 3] = 255;
  }

  /** 消しゴムで指定座標を透明にする */
  function applyEraser(x: number, y: number): void {
    const idx = pixelIdx(x, y);
    if (idx === null || !pixels.value) return;
    pixels.value[idx + 3] = 0;
  }

  /** 塗りつぶしで指定座標から同色の連続領域を塗る */
  function applyFill(
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
  ): void {
    if (!pixels.value) return;
    floodFill(pixels.value, width.value, height.value, x, y, r, g, b);
  }

  return {
    pixels,
    width,
    height,
    canUndo,
    init,
    toImageData,
    pushUndo,
    undo,
    applyPen,
    applyEraser,
    applyFill,
  };
}
