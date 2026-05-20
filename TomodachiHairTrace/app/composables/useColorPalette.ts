/** 透明ピクセルと判断するアルファ値の閾値 */
const ALPHA_THRESHOLD = 128;

export interface PaletteEntry {
  hex: string;
  r: number;
  g: number;
  b: number;
  count: number;
  percentage: number;
}

/** RGB値を6桁16進数カラーコードに変換する */
function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

type Pixel = [number, number, number];

/** 中央値カット法でバケツを最大分散チャンネルで2分割する */
function splitBucket(pixels: Pixel[]): [Pixel[], Pixel[]] {
  let rMin = 255,
    rMax = 0,
    gMin = 255,
    gMax = 0,
    bMin = 255,
    bMax = 0;
  for (const [r, g, b] of pixels) {
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
    if (g < gMin) gMin = g;
    if (g > gMax) gMax = g;
    if (b < bMin) bMin = b;
    if (b > bMax) bMax = b;
  }
  const rRange = rMax - rMin,
    gRange = gMax - gMin,
    bRange = bMax - bMin;
  // 最も値域が広いチャンネルで分割する
  const ch =
    rRange >= gRange && rRange >= bRange ? 0 : gRange >= bRange ? 1 : 2;
  const sorted = [...pixels].sort((a, b) => a[ch]! - b[ch]!);
  const mid = Math.floor(sorted.length / 2);
  return [sorted.slice(0, mid), sorted.slice(mid)];
}

/** バケツ内ピクセルの平均色からPaletteEntryを生成する */
function bucketToEntry(pixels: Pixel[], total: number): PaletteEntry {
  let rSum = 0,
    gSum = 0,
    bSum = 0;
  for (const [r, g, b] of pixels) {
    rSum += r;
    gSum += g;
    bSum += b;
  }
  const n = pixels.length;
  const r = Math.round(rSum / n);
  const g = Math.round(gSum / n);
  const b = Math.round(bSum / n);
  return {
    hex: toHex(r, g, b),
    r,
    g,
    b,
    count: n,
    percentage: (n / total) * 100,
  };
}

/** 中央値カット法でimageDataをtargetColors色に減色しパレットを返す */
export function quantizeColors(
  imageData: ImageData,
  targetColors = 12,
): PaletteEntry[] {
  const { data } = imageData;
  const pixels: Pixel[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < ALPHA_THRESHOLD) continue;
    pixels.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]);
  }
  if (pixels.length === 0) return [];

  const k = Math.min(targetColors, pixels.length);
  let buckets: Pixel[][] = [pixels];

  while (buckets.length < k) {
    // 最も画素数が多いバケツを分割して色数を増やす
    let maxIdx = 0;
    for (let i = 1; i < buckets.length; i++) {
      if (buckets[i]!.length > buckets[maxIdx]!.length) maxIdx = i;
    }
    const target = buckets[maxIdx]!;
    if (target.length < 2) break;
    const [a, b] = splitBucket(target);
    buckets.splice(maxIdx, 1, a, b);
  }

  const total = pixels.length;
  return buckets
    .filter((b) => b.length > 0)
    .map((b) => bucketToEntry(b, total))
    .sort((a, b) => b.count - a.count);
}

/** imageData内の全ユニーク色を出現頻度降順で返す（量子化なし） */
export function extractColorPalette(imageData: ImageData): PaletteEntry[] {
  const counts = new Map<
    string,
    { r: number; g: number; b: number; count: number }
  >();
  const { data, width, height } = imageData;
  const total = width * height;

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 255) < ALPHA_THRESHOLD) continue;
    const r = data[i] ?? 0,
      g = data[i + 1] ?? 0,
      b = data[i + 2] ?? 0;
    const hex = toHex(r, g, b);
    const entry = counts.get(hex);
    if (entry) entry.count++;
    else counts.set(hex, { r, g, b, count: 1 });
  }

  const entries: PaletteEntry[] = [];
  for (const [hex, { r, g, b, count }] of counts) {
    entries.push({ hex, r, g, b, count, percentage: (count / total) * 100 });
  }
  return entries.sort((a, b) => b.count - a.count);
}
