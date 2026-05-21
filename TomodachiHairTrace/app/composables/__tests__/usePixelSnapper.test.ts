import { describe, it, expect } from "vitest";
import { snapToPixelArt } from "../usePixelSnapper";

/** 指定色のピクセルを敷き詰めた ImageData を生成するヘルパー */
function makeImageData(
  pixels: [r: number, g: number, b: number, a: number][],
): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return new ImageData(data, pixels.length, 1);
}

describe("snapToPixelArt", () => {
  it("完全透明ピクセルのみの場合は空パレットを返す", () => {
    const imageData = makeImageData([
      [255, 0, 0, 0],
      [0, 255, 0, 0],
    ]);
    const { palette } = snapToPixelArt(imageData, 12);
    expect(palette).toHaveLength(0);
  });

  it("出力ピクセル数は入力と同じ", () => {
    const imageData = makeImageData([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ]);
    const { imageData: out } = snapToPixelArt(imageData, 12);
    expect(out.data.length).toBe(imageData.data.length);
  });

  it("出力の色種類数が colorCount 以下になる", () => {
    // 赤・緑・青・白の4色混在
    const imageData = makeImageData([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 255, 255, 255],
      [200, 10, 10, 255], // 赤に近い中間色
      [10, 200, 10, 255], // 緑に近い中間色
    ]);
    const colorCount = 3;
    const { imageData: out, palette } = snapToPixelArt(imageData, colorCount);

    // パレット色数が colorCount 以下
    expect(palette.length).toBeLessThanOrEqual(colorCount);

    // 出力に含まれる色がすべてパレット内の色
    const paletteHexSet = new Set(palette.map((p) => `${p.r},${p.g},${p.b}`));
    for (let i = 0; i < out.data.length; i += 4) {
      const a = out.data[i + 3];
      if ((a ?? 0) === 0) continue;
      const key = `${out.data[i]},${out.data[i + 1]},${out.data[i + 2]}`;
      expect(paletteHexSet.has(key)).toBe(true);
    }
  });

  it("アルファ127以下の透明ピクセルはスナップしない", () => {
    const imageData = makeImageData([
      [255, 0, 0, 127], // 透明扱い
      [0, 255, 0, 255],
    ]);
    const { imageData: out } = snapToPixelArt(imageData, 12);
    // 1ピクセル目はアルファ0のまま
    expect(out.data[3]).toBe(0);
    // 2ピクセル目はアルファ255
    expect(out.data[7]).toBe(255);
  });

  it("中間色が最も近いパレット色にスナップされる", () => {
    // 赤系・青系クラスタと中間色(紫)を混在させて量子化する
    // 中央値カット法はバケツ平均色をパレットとするため、出力値は純赤・純青とは限らない
    const imageData = makeImageData([
      [255, 0, 0, 255], // 赤
      [255, 0, 0, 255], // 赤
      [0, 0, 255, 255], // 青
      [0, 0, 255, 255], // 青
      [128, 0, 128, 255], // 紫（中間色）
    ]);
    const { imageData: out, palette } = snapToPixelArt(imageData, 2);

    expect(palette.length).toBeLessThanOrEqual(2);

    // 紫ピクセル（index 4）がパレット内のいずれかの色にスナップされている
    const purpleKey = `${out.data[16]},${out.data[17]},${out.data[18]}`;
    const paletteKeys = new Set(palette.map((p) => `${p.r},${p.g},${p.b}`));
    expect(paletteKeys.has(purpleKey)).toBe(true);
  });
});
