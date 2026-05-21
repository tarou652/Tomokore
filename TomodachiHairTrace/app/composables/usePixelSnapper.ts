import { quantizeColors, type PaletteEntry } from "./useColorPalette";

/** 透明ピクセルと判断するアルファ値の閾値 */
const ALPHA_THRESHOLD = 128;

export interface PixelSnapResult {
  imageData: ImageData;
  palette: PaletteEntry[];
}

/** 2色間のRGB距離の二乗を返す（sqrt不要でパフォーマンス向上） */
function colorDistSq(
  r: number,
  g: number,
  b: number,
  entry: PaletteEntry,
): number {
  const dr = r - entry.r;
  const dg = g - entry.g;
  const db = b - entry.b;
  return dr * dr + dg * dg + db * db;
}

/** パレット内で最も近い色のインデックスを返す */
function nearestIdx(
  r: number,
  g: number,
  b: number,
  palette: PaletteEntry[],
): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = colorDistSq(r, g, b, palette[i]!);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * imageData を colorCount 色に減色し、各ピクセルをパレットにスナップして返す
 * 中間色・アンチエイリアスを除去してクリーンなドット絵を生成する
 */
export function snapToPixelArt(
  imageData: ImageData,
  colorCount: number,
): PixelSnapResult {
  const palette = quantizeColors(imageData, colorCount);
  if (palette.length === 0) return { imageData, palette: [] };

  const { data, width, height } = imageData;
  const out = new ImageData(
    new Uint8ClampedArray(width * height * 4),
    width,
    height,
  );
  const od = out.data;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 255;
    if (a < ALPHA_THRESHOLD) {
      // 透明ピクセルはそのまま保持する
      od[i + 3] = 0;
      continue;
    }
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const p = palette[nearestIdx(r, g, b, palette)]!;
    od[i] = p.r;
    od[i + 1] = p.g;
    od[i + 2] = p.b;
    od[i + 3] = 255;
  }

  return { imageData: out, palette };
}
