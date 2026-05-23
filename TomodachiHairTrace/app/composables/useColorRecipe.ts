import { extractColorPalette, type PaletteEntry } from "./useColorPalette";
import { TOMODACHI_PALETTE } from "./useTomodachiPalette";

/** 使用色レシピの1エントリ */
export interface ColorRecipeEntry {
  hex: string;
  r: number;
  g: number;
  b: number;
  count: number;
  percentage: number;
  /** HSV: 色相 0–360 */
  h: number;
  /** HSV: 彩度 0–100 */
  s: number;
  /** HSV: 明度 0–100 */
  v: number;
  /** トモコレパレット内の行番号（0–6）。含まれない場合は null */
  paletteRow: number | null;
  /** トモコレパレット内の列番号（0–11）。含まれない場合は null */
  paletteCol: number | null;
}

/** TOMODACHI_PALETTE の1行あたりの色数 */
const PALETTE_COLS = 12;

/**
 * RGB を HSV（h: 0–360, s: 0–100, v: 0–100）に変換する
 * 参考: https://en.wikipedia.org/wiki/HSL_and_HSV
 */
export function rgbToHsv(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rN) h = ((gN - bN) / delta) % 6;
    else if (max === gN) h = (bN - rN) / delta + 2;
    else h = (rN - gN) / delta + 4;
    h = Math.round((((h * 60) % 360) + 360) % 360);
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);
  return { h, s, v };
}

/** HEX がトモコレパレット内にあれば行・列インデックスを返す */
function findPalettePos(hex: string): { row: number; col: number } | null {
  const upper = hex.toUpperCase();
  const idx = TOMODACHI_PALETTE.findIndex((c) => c.hex.toUpperCase() === upper);
  if (idx === -1) return null;
  return { row: Math.floor(idx / PALETTE_COLS), col: idx % PALETTE_COLS };
}

/** PaletteEntry[] に HSV とパレット位置情報を付加して ColorRecipeEntry[] を返す */
export function paletteEntriesToRecipe(
  entries: PaletteEntry[],
): ColorRecipeEntry[] {
  return entries.map((e) => {
    const { h, s, v } = rgbToHsv(e.r, e.g, e.b);
    const pos = findPalettePos(e.hex);
    return {
      ...e,
      h,
      s,
      v,
      paletteRow: pos?.row ?? null,
      paletteCol: pos?.col ?? null,
    };
  });
}

/** ImageData から色を抽出して ColorRecipeEntry[] を返す（出現頻度降順） */
export function imageDataToRecipe(imageData: ImageData): ColorRecipeEntry[] {
  return paletteEntriesToRecipe(extractColorPalette(imageData));
}
