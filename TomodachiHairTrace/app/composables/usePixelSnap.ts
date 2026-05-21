// メディアンカット法で色を削減し、各ピクセルを最近傍色にスナップする

interface Rgb { r: number; g: number; b: number }

function colorDistance(a: Rgb, b: Rgb): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

function medianCut(colors: Rgb[], depth: number): Rgb[] {
  if (depth === 0 || colors.length === 0) {
    if (colors.length === 0) return [];
    const r = Math.round(colors.reduce((s, c) => s + c.r, 0) / colors.length);
    const g = Math.round(colors.reduce((s, c) => s + c.g, 0) / colors.length);
    const b = Math.round(colors.reduce((s, c) => s + c.b, 0) / colors.length);
    return [{ r, g, b }];
  }

  const rRange = Math.max(...colors.map(c => c.r)) - Math.min(...colors.map(c => c.r));
  const gRange = Math.max(...colors.map(c => c.g)) - Math.min(...colors.map(c => c.g));
  const bRange = Math.max(...colors.map(c => c.b)) - Math.min(...colors.map(c => c.b));

  const channel: keyof Rgb = rRange >= gRange && rRange >= bRange ? 'r' : gRange >= bRange ? 'g' : 'b';
  const sorted = [...colors].sort((a, b) => a[channel] - b[channel]);
  const mid = Math.floor(sorted.length / 2);

  return [
    ...medianCut(sorted.slice(0, mid), depth - 1),
    ...medianCut(sorted.slice(mid), depth - 1),
  ];
}

function nearestColor(c: Rgb, palette: Rgb[]): Rgb {
  let best = palette[0]!;
  let bestDist = Infinity;
  for (const p of palette) {
    const d = colorDistance(c, p);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

export function pixelSnap(imageData: ImageData, maxColors: number): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);

  // サンプリング（最大2000ピクセル分の色を使ってパレット生成）
  const step = Math.max(1, Math.floor((width * height) / 2000));
  const samples: Rgb[] = [];
  for (let i = 0; i < data.length; i += 4 * step) {
    if ((data[i + 3] ?? 0) < 128) continue;
    samples.push({ r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 });
  }

  // 色数上限に合わせた深さ（2^depth = パレット数）
  const depth = Math.ceil(Math.log2(maxColors));
  const palette = medianCut(samples, depth).slice(0, maxColors);
  if (palette.length === 0) return imageData;

  // 各ピクセルを最近傍色にスナップ
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 128) {
      output.data[i + 3] = 0;
      continue;
    }
    const snapped = nearestColor(
      { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 },
      palette,
    );
    output.data[i]     = snapped.r;
    output.data[i + 1] = snapped.g;
    output.data[i + 2] = snapped.b;
    output.data[i + 3] = 255;
  }

  return output;
}
