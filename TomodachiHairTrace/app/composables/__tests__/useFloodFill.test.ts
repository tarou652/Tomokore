import { describe, it, expect } from "vitest";
import { floodFill } from "../useFloodFill";

/** n×n の均一色ピクセル配列を生成するヘルパー */
function makePixels(
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = a;
  }
  return pixels;
}

/** 指定座標のピクセルカラーを取得するヘルパー */
function getPixel(
  pixels: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * w + x) * 4;
  return [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, pixels[i + 3]!];
}

describe("floodFill", () => {
  it("単色の 3×3 全体が塗り替えられる", () => {
    const pixels = makePixels(3, 3, 255, 255, 255);
    floodFill(pixels, 3, 3, 0, 0, 0, 0, 0);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(getPixel(pixels, 3, x, y)).toEqual([0, 0, 0, 255]);
      }
    }
  });

  it("隣接しない別色ピクセルは変化しない", () => {
    // 左半分が白、右半分が赤の 2×1 画像
    const pixels = new Uint8ClampedArray([
      255,
      255,
      255,
      255, // (0,0) 白
      255,
      0,
      0,
      255, // (1,0) 赤
    ]);
    floodFill(pixels, 2, 1, 0, 0, 0, 0, 0);
    // 白→黒に変わった
    expect(getPixel(pixels, 2, 0, 0)).toEqual([0, 0, 0, 255]);
    // 赤は変化しない
    expect(getPixel(pixels, 2, 1, 0)).toEqual([255, 0, 0, 255]);
  });

  it("L字形の連続領域が全て塗り替えられる", () => {
    // 3×3 で (1,1) だけ別色
    const pixels = makePixels(3, 3, 200, 200, 200);
    pixels[(1 * 3 + 1) * 4] = 100;
    pixels[(1 * 3 + 1) * 4 + 1] = 100;
    pixels[(1 * 3 + 1) * 4 + 2] = 100;
    // (0,0) から塗りつぶすと (1,1) 以外が全て変わる
    floodFill(pixels, 3, 3, 0, 0, 0, 0, 0);
    expect(getPixel(pixels, 3, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(getPixel(pixels, 3, 2, 2)).toEqual([0, 0, 0, 255]);
    // 中央の別色ピクセルは変化しない
    expect(getPixel(pixels, 3, 1, 1)).toEqual([100, 100, 100, 255]);
  });

  it("同じ色で塗りつぶしても変化しない", () => {
    const pixels = makePixels(2, 2, 100, 100, 100);
    const before = new Uint8ClampedArray(pixels);
    floodFill(pixels, 2, 2, 0, 0, 100, 100, 100);
    expect(Array.from(pixels)).toEqual(Array.from(before));
  });

  it("範囲外の座標を渡しても例外が起きない", () => {
    const pixels = makePixels(2, 2, 255, 255, 255);
    expect(() => floodFill(pixels, 2, 2, -1, 0, 0, 0, 0)).not.toThrow();
    expect(() => floodFill(pixels, 2, 2, 0, 5, 0, 0, 0)).not.toThrow();
  });

  it("newA を指定するとアルファ値が変わる", () => {
    const pixels = makePixels(1, 1, 255, 255, 255);
    floodFill(pixels, 1, 1, 0, 0, 0, 0, 0, 0);
    expect(getPixel(pixels, 1, 0, 0)).toEqual([0, 0, 0, 0]);
  });
});
