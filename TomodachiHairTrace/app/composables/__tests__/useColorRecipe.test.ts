import { describe, it, expect } from "vitest";
import {
  rgbToHsv,
  paletteEntriesToRecipe,
  imageDataToRecipe,
} from "../useColorRecipe";
import type { PaletteEntry } from "../useColorPalette";

/** テスト用 PaletteEntry を生成するヘルパー */
function makeEntry(
  r: number,
  g: number,
  b: number,
  count = 100,
  percentage = 10,
): PaletteEntry {
  const hex =
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  return { hex, r, g, b, count, percentage };
}

describe("rgbToHsv", () => {
  it("赤(255,0,0)は H:0 S:100 V:100", () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 100, v: 100 });
  });

  it("緑(0,255,0)は H:120 S:100 V:100", () => {
    expect(rgbToHsv(0, 255, 0)).toEqual({ h: 120, s: 100, v: 100 });
  });

  it("青(0,0,255)は H:240 S:100 V:100", () => {
    expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 100, v: 100 });
  });

  it("黒(0,0,0)は H:0 S:0 V:0", () => {
    expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
  });

  it("白(255,255,255)は H:0 S:0 V:100", () => {
    expect(rgbToHsv(255, 255, 255)).toEqual({ h: 0, s: 0, v: 100 });
  });

  it("グレー(128,128,128)は S:0", () => {
    const { s } = rgbToHsv(128, 128, 128);
    expect(s).toBe(0);
  });

  it("すべての出力値が有効な範囲内（H:0-360, S:0-100, V:0-100）", () => {
    const cases = [
      [200, 100, 50],
      [10, 200, 150],
      [80, 80, 200],
      [255, 128, 0],
    ] as const;
    for (const [r, g, b] of cases) {
      const { h, s, v } = rgbToHsv(r, g, b);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(360);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("paletteEntriesToRecipe", () => {
  it("PaletteEntry に h, s, v が付加される", () => {
    const entries = [makeEntry(255, 0, 0)];
    const recipe = paletteEntriesToRecipe(entries);
    expect(recipe[0]).toMatchObject({ h: 0, s: 100, v: 100 });
  });

  it("count と percentage が保持される", () => {
    const entries = [makeEntry(100, 150, 200, 500, 33.3)];
    const recipe = paletteEntriesToRecipe(entries);
    expect(recipe[0]!.count).toBe(500);
    expect(recipe[0]!.percentage).toBe(33.3);
  });

  it("#FFFFFF はパレット位置 row:0 col:0 を持つ", () => {
    const entry = makeEntry(255, 255, 255);
    entry.hex = "#FFFFFF";
    const recipe = paletteEntriesToRecipe([entry]);
    expect(recipe[0]!.paletteRow).toBe(0);
    expect(recipe[0]!.paletteCol).toBe(0);
  });

  it("#000000 はパレット位置 row:6 col:0 を持つ", () => {
    const entry = makeEntry(0, 0, 0);
    entry.hex = "#000000";
    const recipe = paletteEntriesToRecipe([entry]);
    expect(recipe[0]!.paletteRow).toBe(6);
    expect(recipe[0]!.paletteCol).toBe(0);
  });

  it("パレット外の色は paletteRow と paletteCol が null", () => {
    const entries = [makeEntry(18, 52, 86)]; // #123456 相当
    const recipe = paletteEntriesToRecipe(entries);
    expect(recipe[0]!.paletteRow).toBeNull();
    expect(recipe[0]!.paletteCol).toBeNull();
  });

  it("複数エントリの長さが保持される", () => {
    const entries = [
      makeEntry(255, 0, 0),
      makeEntry(0, 0, 0),
      makeEntry(255, 255, 255),
    ];
    const recipe = paletteEntriesToRecipe(entries);
    expect(recipe).toHaveLength(3);
  });
});

describe("imageDataToRecipe", () => {
  it("単色画像から1エントリのレシピを返す", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255]);
    const imageData = new ImageData(data, 1, 1);
    const recipe = imageDataToRecipe(imageData);
    expect(recipe).toHaveLength(1);
    expect(recipe[0]!.r).toBe(255);
    expect(recipe[0]!.g).toBe(0);
    expect(recipe[0]!.b).toBe(0);
  });

  it("透明ピクセルのみの画像は空のレシピを返す", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 0]);
    const imageData = new ImageData(data, 1, 1);
    const recipe = imageDataToRecipe(imageData);
    expect(recipe).toHaveLength(0);
  });

  it("2色画像から2エントリのレシピを返す", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    const imageData = new ImageData(data, 2, 1);
    const recipe = imageDataToRecipe(imageData);
    expect(recipe).toHaveLength(2);
  });
});
