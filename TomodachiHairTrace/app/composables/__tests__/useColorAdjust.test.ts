import { describe, it, expect } from "vitest";
import { applyColorAdjust, DEFAULT_COLOR_ADJUST } from "../useColorAdjust";

/** 単一ピクセルの ImageData を生成するヘルパー */
function makePixel(r: number, g: number, b: number, a = 255): ImageData {
  return new ImageData(new Uint8ClampedArray([r, g, b, a]), 1, 1);
}

/** n×n の均一色 ImageData を生成するヘルパー（畳み込みテスト用） */
function makeUniform(n: number, r: number, g: number, b: number): ImageData {
  const data = new Uint8ClampedArray(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return new ImageData(data, n, n);
}

describe("applyColorAdjust", () => {
  it("全パラメータ 0 のとき入力と同じデータを返す", () => {
    const src = makePixel(100, 150, 200);
    const result = applyColorAdjust(src, DEFAULT_COLOR_ADJUST);
    expect(Array.from(result.data)).toEqual(Array.from(src.data));
  });

  it("brightness +100 で値が 255 にクランプされる", () => {
    const src = makePixel(100, 100, 100);
    const result = applyColorAdjust(src, {
      ...DEFAULT_COLOR_ADJUST,
      brightness: 100,
    });
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(255);
    expect(result.data[2]).toBe(255);
  });

  it("brightness -100 で値が 0 にクランプされる", () => {
    const src = makePixel(100, 100, 100);
    const result = applyColorAdjust(src, {
      ...DEFAULT_COLOR_ADJUST,
      brightness: -100,
    });
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it("contrast +50 で中間グレーより明るいピクセルがより明るくなる", () => {
    const src = makePixel(200, 200, 200);
    const result = applyColorAdjust(src, {
      ...DEFAULT_COLOR_ADJUST,
      contrast: 50,
    });
    expect(result.data[0]).toBeGreaterThan(200);
  });

  it("saturation -100 でグレースケールになる（R=G=B）", () => {
    const src = makePixel(200, 100, 50);
    const result = applyColorAdjust(src, {
      ...DEFAULT_COLOR_ADJUST,
      saturation: -100,
    });
    expect(result.data[0]).toBe(result.data[1]);
    expect(result.data[1]).toBe(result.data[2]);
  });

  it("saturation +100 で彩度が上がる（最大値チャンネルがより大きくなる）", () => {
    const src = makePixel(200, 100, 50);
    const result = applyColorAdjust(src, {
      ...DEFAULT_COLOR_ADJUST,
      saturation: 100,
    });
    // 最大チャンネル(R)が元より大きいか、最小チャンネル(B)が元より小さいはず
    expect(result.data[0]).toBeGreaterThanOrEqual(200);
  });

  it("透明ピクセル（alpha=0）は輝度値が変化しない", () => {
    const src = makePixel(200, 100, 50, 0);
    const result = applyColorAdjust(src, {
      ...DEFAULT_COLOR_ADJUST,
      brightness: 100,
    });
    // 透明ピクセルはスキップされるので RGB が元のまま
    expect(result.data[0]).toBe(200);
    expect(result.data[3]).toBe(0);
  });

  it("出力の width/height が入力と一致する", () => {
    const src = makeUniform(5, 128, 128, 128);
    const result = applyColorAdjust(src, {
      ...DEFAULT_COLOR_ADJUST,
      brightness: 10,
    });
    expect(result.width).toBe(5);
    expect(result.height).toBe(5);
  });

  it("sharpness > 0 のとき均一色画像は変化しない（エッジがないので）", () => {
    // 3×3 の均一色は畳み込み結果 = 5*c - 4*c = c なので変化なし
    const src = makeUniform(3, 100, 150, 200);
    const result = applyColorAdjust(src, {
      ...DEFAULT_COLOR_ADJUST,
      sharpness: 100,
    });
    // エッジ以外の中心ピクセル（idx=4）が変化していないことを確認
    expect(result.data[4 * 4]).toBe(100);
    expect(result.data[4 * 4 + 1]).toBe(150);
    expect(result.data[4 * 4 + 2]).toBe(200);
  });
});
