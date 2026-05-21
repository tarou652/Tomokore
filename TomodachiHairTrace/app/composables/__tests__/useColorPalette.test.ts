import { describe, it, expect } from "vitest";
import { quantizeColors, extractColorPalette } from "../useColorPalette";

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

describe("quantizeColors", () => {
  it("完全透明ピクセルだけの場合は空配列を返す", () => {
    const imageData = makeImageData([
      [255, 0, 0, 0],
      [0, 255, 0, 0],
    ]);
    expect(quantizeColors(imageData)).toEqual([]);
  });

  it("1ピクセル画像は1エントリを返す", () => {
    // min(targetColors, pixels.length) = 1 なのでバケツは1つ
    const imageData = makeImageData([[255, 0, 0, 255]]);
    const result = quantizeColors(imageData, 12);
    expect(result).toHaveLength(1);
    expect(result[0]!.hex).toBe("#ff0000");
    expect(result[0]!.percentage).toBeCloseTo(100);
  });

  it("targetColors を超える色数を返さない", () => {
    // R チャンネルが異なる16色
    const pixels: [number, number, number, number][] = Array.from(
      { length: 16 },
      (_, i) => [i * 16, 0, 0, 255],
    );
    const imageData = makeImageData(pixels);
    const result = quantizeColors(imageData, 4);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it("アルファ127以下のピクセルは無視する", () => {
    const imageData = makeImageData([
      [255, 0, 0, 127], // 透明扱い（閾値128未満）
      [0, 255, 0, 255],
    ]);
    const result = quantizeColors(imageData, 12);
    expect(result).toHaveLength(1);
    expect(result[0]!.hex).toBe("#00ff00");
  });

  it("出現頻度の多い色が先頭に来る", () => {
    const imageData = makeImageData([
      [255, 0, 0, 255], // 赤1
      [0, 0, 255, 255], // 青1
      [0, 0, 255, 255], // 青2
    ]);
    const result = quantizeColors(imageData, 12);
    // 青が2ピクセルで多いので先頭
    expect(result[0]!.count).toBeGreaterThanOrEqual(result[1]!.count);
  });

  it("percentageの合計がおよそ100になる", () => {
    const imageData = makeImageData([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ]);
    const result = quantizeColors(imageData, 12);
    const total = result.reduce((sum, e) => sum + e.percentage, 0);
    expect(total).toBeCloseTo(100, 0);
  });
});

describe("extractColorPalette", () => {
  it("ユニーク色を全て返す", () => {
    const imageData = makeImageData([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ]);
    const result = extractColorPalette(imageData);
    expect(result).toHaveLength(3);
  });

  it("同じ色はまとめてcountに加算する", () => {
    const imageData = makeImageData([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ]);
    const result = extractColorPalette(imageData);
    const red = result.find((e) => e.hex === "#ff0000");
    expect(red?.count).toBe(2);
  });

  it("出現頻度の多い色が先頭に来る", () => {
    const imageData = makeImageData([
      [0, 0, 255, 255],
      [255, 0, 0, 255],
      [255, 0, 0, 255],
    ]);
    const result = extractColorPalette(imageData);
    expect(result[0]!.hex).toBe("#ff0000");
  });
});
