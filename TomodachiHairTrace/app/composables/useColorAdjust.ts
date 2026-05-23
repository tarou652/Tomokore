/** 透明ピクセルと判断するアルファ値の閾値 */
const ALPHA_THRESHOLD = 128;

export interface ColorAdjustParams {
  brightness: number; // -100 ~ +100
  contrast: number; // -100 ~ +100
  saturation: number; // -100 ~ +100
  sharpness: number; // 0 ~ 100
}

/** 色調整パラメータのデフォルト値（全 0 = 無変換） */
export const DEFAULT_COLOR_ADJUST: ColorAdjustParams = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
};

/** 値を 0-255 に丸めてクランプする */
function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** 明度オフセットとコントラストスケールをピクセルに適用する */
function applyBrightnessContrast(
  r: number,
  g: number,
  b: number,
  brightness: number,
  contrast: number,
): [number, number, number] {
  // brightness: -100~+100 を ±255 のオフセットに変換
  const bOffset = (brightness / 100) * 255;
  r = clamp(r + bOffset);
  g = clamp(g + bOffset);
  b = clamp(b + bOffset);

  // contrast: 中間グレー(128)を基準に線形スケール
  if (contrast !== 0) {
    const cFactor = (100 + contrast) / 100;
    r = clamp((r - 128) * cFactor + 128);
    g = clamp((g - 128) * cFactor + 128);
    b = clamp((b - 128) * cFactor + 128);
  }

  return [r, g, b];
}

/** BT.709 輝度を基準に彩度を調整する */
function applySaturation(
  r: number,
  g: number,
  b: number,
  saturation: number,
): [number, number, number] {
  if (saturation === 0) return [r, g, b];
  // 輝度係数（BT.709）
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sFactor = (100 + saturation) / 100;
  return [
    clamp(lum + (r - lum) * sFactor),
    clamp(lum + (g - lum) * sFactor),
    clamp(lum + (b - lum) * sFactor),
  ];
}

/** 十字ラプラシアン + 単位行列の 3×3 シャープネスカーネル */
const SHARPEN_KERNEL = [0, -1, 0, -1, 5, -1, 0, -1, 0] as const;

/** 3×3 シャープネス畳み込みを strength(0-1) の強度で適用する */
function applySharpness(src: ImageData, strength: number): ImageData {
  const { data, width, height } = src;
  // エッジ（1px）は処理せずそのままコピー
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const od = out.data;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if ((data[idx + 3] ?? 0) < ALPHA_THRESHOLD) continue;

      for (let c = 0; c < 3; c++) {
        const orig = data[idx + c] ?? 0;
        let sharpened = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const kidx = ((y + ky) * width + (x + kx)) * 4;
            sharpened +=
              (data[kidx + c] ?? 0) * SHARPEN_KERNEL[(ky + 1) * 3 + (kx + 1)]!;
          }
        }
        // 元の値とシャープ結果を strength で線形補間する
        od[idx + c] = clamp(orig + strength * (sharpened - orig));
      }
    }
  }

  return out;
}

/**
 * ImageData に色調整を適用して新しい ImageData を返す
 * 全パラメータが 0 の場合はコピーを即返す
 */
export function applyColorAdjust(
  src: ImageData,
  params: ColorAdjustParams,
): ImageData {
  const { brightness, contrast, saturation, sharpness } = params;

  if (
    brightness === 0 &&
    contrast === 0 &&
    saturation === 0 &&
    sharpness === 0
  ) {
    return new ImageData(
      new Uint8ClampedArray(src.data),
      src.width,
      src.height,
    );
  }

  const { data, width, height } = src;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const od = out.data;

  if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] ?? 255;
      if (a < ALPHA_THRESHOLD) continue;

      let r = data[i] ?? 0;
      let g = data[i + 1] ?? 0;
      let b = data[i + 2] ?? 0;

      [r, g, b] = applyBrightnessContrast(r, g, b, brightness, contrast);
      [r, g, b] = applySaturation(r, g, b, saturation);

      od[i] = r;
      od[i + 1] = g;
      od[i + 2] = b;
      od[i + 3] = a;
    }
  }

  if (sharpness > 0) {
    return applySharpness(out, sharpness / 100);
  }

  return out;
}
