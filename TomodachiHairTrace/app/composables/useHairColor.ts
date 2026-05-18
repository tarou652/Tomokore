export interface HairColorGuide {
  base: string;
  shadow: string;
  highlight: string;
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function extractHairColors(
  maskData: Uint8Array,
  maskWidth: number,
  maskHeight: number,
  imageEl: HTMLImageElement,
): HairColorGuide | null {
  const canvas = document.createElement("canvas");
  canvas.width = maskWidth;
  canvas.height = maskHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(imageEl, 0, 0, maskWidth, maskHeight);
  const { data } = ctx.getImageData(0, 0, maskWidth, maskHeight);

  const pixels: [number, number, number][] = [];
  for (let i = 0; i < maskData.length; i++) {
    if (maskData[i] !== 255) continue;
    const p = i * 4;
    pixels.push([data[p], data[p + 1], data[p + 2]]);
  }
  if (pixels.length === 0) return null;

  // Subsample for performance
  const step = Math.max(1, Math.floor(pixels.length / 8000));
  const sampled = pixels.filter((_, i) => i % step === 0);
  sampled.sort((a, b) => luminance(...a) - luminance(...b));

  const n = sampled.length;
  return {
    shadow: toHex(...sampled[Math.floor(n * 0.1)]),
    base: toHex(...sampled[Math.floor(n * 0.5)]),
    highlight: toHex(...sampled[Math.floor(n * 0.9)]),
  };
}
