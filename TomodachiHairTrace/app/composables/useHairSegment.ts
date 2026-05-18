import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { FaceBox } from "./useFaceDetect";
import { CANVAS_SIZE } from "./useHairCanvas";

export interface HairMaskResult {
  sourceMask: Uint8Array;
  sourceWidth: number;
  sourceHeight: number;
  hairPixelCount: number;
}

export interface BangRegion {
  eyeLevelY: number;
  bangMask: Uint8Array;
  bangPixelCount: number;
  bangYMaxInCanvas: number;
}

export function useHairSegment() {
  const isReady = ref(false);
  const isProcessing = ref(false);
  const error = ref<string | null>(null);
  let segmenter: import("@mediapipe/tasks-vision").ImageSegmenter | null = null;

  async function init() {
    try {
      const { ImageSegmenter, FilesetResolver } =
        await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
      );
      segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
      isReady.value = true;
    } catch (e) {
      error.value = "ImageSegmenter の初期化に失敗しました";
    }
  }

  async function segment(
    imageEl: HTMLImageElement,
  ): Promise<HairMaskResult | null> {
    if (!segmenter) return null;
    isProcessing.value = true;
    try {
      const result = segmenter.segment(imageEl);
      const categoryMask = result.categoryMask;
      if (!categoryMask) return null;

      const raw = categoryMask.getAsUint8Array();
      categoryMask.close();

      const sourceMask = new Uint8Array(raw.length);
      let hairPixelCount = 0;
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === 1) {
          sourceMask[i] = 255;
          hairPixelCount++;
        }
      }
      return {
        sourceMask,
        sourceWidth: imageEl.naturalWidth,
        sourceHeight: imageEl.naturalHeight,
        hairPixelCount,
      };
    } finally {
      isProcessing.value = false;
    }
  }

  return { isReady, isProcessing, error, init, segment };
}

export function computeBangRegion(
  hairMask: HairMaskResult,
  faceResult: FaceLandmarkerResult,
  box: FaceBox,
  imgH: number,
): BangRegion | null {
  const lm = faceResult.faceLandmarks?.[0];
  if (!lm || lm.length === 0) return null;

  // ランドマーク #33: 左目外角, #263: 右目外角
  const eyeLevelY = ((lm[33].y + lm[263].y) / 2) * imgH;

  const bangMask = new Uint8Array(hairMask.sourceMask.length);
  let bangPixelCount = 0;
  for (let y = 0; y < hairMask.sourceHeight; y++) {
    if (y >= eyeLevelY) continue;
    for (let x = 0; x < hairMask.sourceWidth; x++) {
      const idx = y * hairMask.sourceWidth + x;
      if (hairMask.sourceMask[idx] === 255) {
        bangMask[idx] = 255;
        bangPixelCount++;
      }
    }
  }

  const bangYMaxInCanvas = Math.max(
    0,
    Math.min(CANVAS_SIZE, ((eyeLevelY - box.y) / box.height) * CANVAS_SIZE),
  );

  return { eyeLevelY, bangMask, bangPixelCount, bangYMaxInCanvas };
}
