import { describe, it, expect } from "vitest";
import {
  matchToTomodachiPalette,
  TOMODACHI_PALETTE,
} from "../useTomodachiPalette";

/** 単一ピクセルの ImageData を生成するヘルパー */
function makePixel(r: number, g: number, b: number, a = 255): ImageData {
  return new ImageData(new Uint8ClampedArray([r, g, b, a]), 1, 1);
}

describe("TOMODACHI_PALETTE", () => {
  it("84色含まれる", () => {
    expect(TOMODACHI_PALETTE).toHaveLength(84);
  });

  it("全色がユニーク（重複なし）", () => {
    const hexes = TOMODACHI_PALETTE.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(84);
  });

  it("白 #FFFFFF が含まれる", () => {
    expect(TOMODACHI_PALETTE.some((c) => c.hex === "#FFFFFF")).toBe(true);
  });

  it("黒 #000000 が含まれる", () => {
    expect(TOMODACHI_PALETTE.some((c) => c.hex === "#000000")).toBe(true);
  });

  it("各エントリの RGB が HEX と整合する", () => {
    for (const color of TOMODACHI_PALETTE) {
      const n = parseInt(color.hex.slice(1), 16);
      expect(color.r).toBe((n >> 16) & 0xff);
      expect(color.g).toBe((n >> 8) & 0xff);
      expect(color.b).toBe(n & 0xff);
    }
  });
});

describe("matchToTomodachiPalette", () => {
  it("純白(255,255,255)は #FFFFFF にマッチする", () => {
    const src = makePixel(255, 255, 255);
    const result = matchToTomodachiPalette(src);
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(255);
    expect(result.data[2]).toBe(255);
  });

  it("純黒(0,0,0)は #000000 にマッチする", () => {
    const src = makePixel(0, 0, 0);
    const result = matchToTomodachiPalette(src);
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it("出力ピクセルは必ずパレット内の色になる", () => {
    const src = makePixel(123, 45, 67);
    const result = matchToTomodachiPalette(src);
    const r = result.data[0]!;
    const g = result.data[1]!;
    const b = result.data[2]!;
    const inPalette = TOMODACHI_PALETTE.some(
      (c) => c.r === r && c.g === g && c.b === b,
    );
    expect(inPalette).toBe(true);
  });

  it("複数の異なる色もすべてパレット内の色になる", () => {
    const testColors = [
      [200, 100, 50],
      [10, 200, 150],
      [80, 80, 200],
      [255, 200, 0],
    ] as const;
    for (const [r, g, b] of testColors) {
      const src = makePixel(r, g, b);
      const result = matchToTomodachiPalette(src);
      const inPalette = TOMODACHI_PALETTE.some(
        (c) =>
          c.r === result.data[0] &&
          c.g === result.data[1] &&
          c.b === result.data[2],
      );
      expect(inPalette).toBe(true);
    }
  });

  it("透明ピクセル（alpha=0）は RGB が変化しない", () => {
    const src = makePixel(123, 45, 67, 0);
    const result = matchToTomodachiPalette(src);
    expect(result.data[0]).toBe(123);
    expect(result.data[1]).toBe(45);
    expect(result.data[2]).toBe(67);
    expect(result.data[3]).toBe(0);
  });

  it("アルファ値は変化しない（不透明ピクセル）", () => {
    const src = makePixel(100, 100, 100, 200);
    const result = matchToTomodachiPalette(src);
    expect(result.data[3]).toBe(200);
  });

  it("width/height が入力と一致する", () => {
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(200);
    const src = new ImageData(data, 5, 5);
    const result = matchToTomodachiPalette(src);
    expect(result.width).toBe(5);
    expect(result.height).toBe(5);
  });
});
