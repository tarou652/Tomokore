/** 透明ピクセルと判断するアルファ値の閾値 */
const ALPHA_THRESHOLD = 128;

/** パレット色を RGB と HEX で保持する型 */
export interface TomodachiPaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

/**
 * トモダチコレクション新作 84色パレット HEX データ（7行×12列）
 * 参照: https://yu08083.github.io/Tomodachi-Life-Palette-Tool/
 */
const TOMODACHI_PALETTE_HEX = [
  // Row 0: 最も明るい
  "#FFFFFF",
  "#F1F0F8",
  "#F0F0F8",
  "#F0F7FF",
  "#F0FBF3",
  "#F1F3EE",
  "#F4FAF0",
  "#FCFDEF",
  "#FEF3EF",
  "#FAF0EF",
  "#FDEDDD",
  "#FE0000",
  // Row 1
  "#EBEBEB",
  "#CFC8E9",
  "#C7CDE7",
  "#C8E8FD",
  "#C9F1D7",
  "#C8DBC8",
  "#DAEFC8",
  "#FBF9C8",
  "#FCD6C9",
  "#EFC9C8",
  "#E4CFB0",
  "#FFFF00",
  // Row 2
  "#D5D5D3",
  "#A692D7",
  "#929FD4",
  "#92D6FD",
  "#93E6BA",
  "#92BC94",
  "#BBE194",
  "#FAF492",
  "#FAB492",
  "#E19691",
  "#CAA976",
  "#05FF00",
  // Row 3
  "#BCBCBC",
  "#6500C2",
  "#004BC0",
  "#08C2FD",
  "#00DA90",
  "#019616",
  "#92D315",
  "#F9F001",
  "#F68400",
  "#D42700",
  "#90620D",
  "#01FFFF",
  // Row 4
  "#9C9C9A",
  "#5600A9",
  "#0040A4",
  "#01A5D8",
  "#02BC7B",
  "#04800E",
  "#7DB50C",
  "#D6CE01",
  "#D57101",
  "#B62100",
  "#774200",
  "#0000FE",
  // Row 5
  "#727272",
  "#420084",
  "#013281",
  "#0283AB",
  "#00935F",
  "#01650D",
  "#638D0D",
  "#A8A301",
  "#A85801",
  "#901600",
  "#5D380C",
  "#8801FE",
  // Row 6: 最も暗い
  "#000000",
  "#22004C",
  "#001648",
  "#014962",
  "#015534",
  "#013800",
  "#355001",
  "#605D00",
  "#612E01",
  "#510D00",
  "#34220C",
  "#FF00C2",
] as const;

/** HEX 文字列を RGB に変換する */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** 84色トモコレパレット（起動時に事前計算済み） */
export const TOMODACHI_PALETTE: readonly TomodachiPaletteColor[] =
  TOMODACHI_PALETTE_HEX.map((hex) => ({ hex, ...hexToRgb(hex) }));

/**
 * redmean 知覚的 RGB 距離の二乗を返す
 * 参考: https://www.compuphase.com/cmetric.htm
 */
function redmeanDistSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const rMean = (r1 + r2) / 2;
  const dR = r1 - r2;
  const dG = g1 - g2;
  const dB = b1 - b2;
  return (
    (2 + rMean / 256) * dR * dR +
    4 * dG * dG +
    (2 + (255 - rMean) / 256) * dB * dB
  );
}

/** RGB に最も近いトモコレパレット色を返す */
function nearestPaletteColor(
  r: number,
  g: number,
  b: number,
): TomodachiPaletteColor {
  let best = TOMODACHI_PALETTE[0]!;
  let bestDist = Infinity;
  for (const color of TOMODACHI_PALETTE) {
    const d = redmeanDistSq(r, g, b, color.r, color.g, color.b);
    if (d < bestDist) {
      bestDist = d;
      best = color;
    }
  }
  return best;
}

/**
 * ImageData の各ピクセルを 84色トモコレパレットに置き換えた新しい ImageData を返す
 * 透明ピクセル（alpha < 128）はそのままコピーする
 */
export function matchToTomodachiPalette(src: ImageData): ImageData {
  const { data, width, height } = src;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const od = out.data;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 255;
    if (a < ALPHA_THRESHOLD) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const nearest = nearestPaletteColor(r, g, b);
    od[i] = nearest.r;
    od[i + 1] = nearest.g;
    od[i + 2] = nearest.b;
  }
  return out;
}
