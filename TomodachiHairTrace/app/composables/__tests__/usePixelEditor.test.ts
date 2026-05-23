import { describe, it, expect } from "vitest";
import { usePixelEditor } from "../usePixelEditor";

/** 単色 ImageData を生成するヘルパー */
function makeImageData(
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return new ImageData(data, w, h);
}

describe("usePixelEditor", () => {
  it("init で width/height/pixels が設定される", () => {
    const editor = usePixelEditor();
    editor.init(makeImageData(4, 3, 100, 150, 200));
    expect(editor.width.value).toBe(4);
    expect(editor.height.value).toBe(3);
    expect(editor.pixels.value).not.toBeNull();
    expect(editor.pixels.value!.length).toBe(4 * 3 * 4);
  });

  it("toImageData は正しい ImageData を返す", () => {
    const editor = usePixelEditor();
    const src = makeImageData(2, 2, 10, 20, 30);
    editor.init(src);
    const result = editor.toImageData();
    expect(result).not.toBeNull();
    expect(result!.width).toBe(2);
    expect(result!.height).toBe(2);
    expect(result!.data[0]).toBe(10);
  });

  it("applyPen で指定座標のピクセルが変わる", () => {
    const editor = usePixelEditor();
    editor.init(makeImageData(3, 3, 255, 255, 255));
    editor.applyPen(1, 1, 0, 128, 255);
    const idx = (1 * 3 + 1) * 4;
    expect(editor.pixels.value![idx]).toBe(0);
    expect(editor.pixels.value![idx + 1]).toBe(128);
    expect(editor.pixels.value![idx + 2]).toBe(255);
    expect(editor.pixels.value![idx + 3]).toBe(255);
  });

  it("applyEraser で指定座標のアルファが 0 になる", () => {
    const editor = usePixelEditor();
    editor.init(makeImageData(2, 2, 100, 100, 100));
    editor.applyEraser(0, 0);
    expect(editor.pixels.value![3]).toBe(0);
  });

  it("applyFill で連続領域が塗り替えられる", () => {
    const editor = usePixelEditor();
    editor.init(makeImageData(3, 3, 255, 255, 255));
    editor.applyFill(0, 0, 0, 0, 0);
    // 全ピクセルが黒になるはず
    for (let i = 0; i < 3 * 3; i++) {
      expect(editor.pixels.value![i * 4]).toBe(0);
    }
  });

  it("範囲外への applyPen は何もしない", () => {
    const editor = usePixelEditor();
    editor.init(makeImageData(2, 2, 255, 255, 255));
    const before = new Uint8ClampedArray(editor.pixels.value!);
    editor.applyPen(5, 5, 0, 0, 0);
    expect(Array.from(editor.pixels.value!)).toEqual(Array.from(before));
  });

  it("pushUndo → undo で元の状態に戻る", () => {
    const editor = usePixelEditor();
    editor.init(makeImageData(2, 2, 255, 255, 255));
    editor.pushUndo();
    editor.applyPen(0, 0, 0, 0, 0);
    expect(editor.pixels.value![0]).toBe(0);
    editor.undo();
    expect(editor.pixels.value![0]).toBe(255);
  });

  it("canUndo は pushUndo 後に true になる", () => {
    const editor = usePixelEditor();
    editor.init(makeImageData(2, 2, 255, 255, 255));
    expect(editor.canUndo.value).toBe(false);
    editor.pushUndo();
    expect(editor.canUndo.value).toBe(true);
  });

  it("init でスタックがリセットされる", () => {
    const editor = usePixelEditor();
    editor.init(makeImageData(2, 2, 255, 255, 255));
    editor.pushUndo();
    editor.init(makeImageData(2, 2, 0, 0, 0));
    expect(editor.canUndo.value).toBe(false);
  });
});
