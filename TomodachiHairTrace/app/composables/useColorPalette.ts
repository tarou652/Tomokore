export interface PaletteEntry {
  hex: string;
  r: number;
  g: number;
  b: number;
  count: number;
  percentage: number;
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function extractColorPalette(imageData: ImageData): PaletteEntry[] {
  const counts = new Map<
    string,
    { r: number; g: number; b: number; count: number }
  >();
  const { data, width, height } = imageData;
  const total = width * height;

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < 128) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
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
