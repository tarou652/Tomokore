import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface FaceResult {
  landmarks: NormalizedLandmark[];
  // 顔の主要な境界点（正規化座標 0-1）
  faceBox: { x: number; y: number; w: number; h: number };
  // 前髪ラインの推定y座標（正規化）
  foreheadY: number;
}

let landmarker: FaceLandmarker | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureLandmarker() {
  if (landmarker) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "/mediapipe-wasm",
    );
    landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      outputFaceBlendshapes: false,
      runningMode: "IMAGE",
      numFaces: 1,
    });
  })();

  return loadPromise;
}

// MediaPipe face mesh landmark index groups
// ref: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
const FOREHEAD_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const FACE_OVAL_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

export function useFaceDetection() {
  const isLoading = ref(false);
  const isReady = ref(false);
  const error = ref<string | null>(null);

  async function init() {
    isLoading.value = true;
    error.value = null;
    try {
      await ensureLandmarker();
      isReady.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "MediaPipe load failed";
    } finally {
      isLoading.value = false;
    }
  }

  async function detect(img: HTMLImageElement): Promise<FaceResult | null> {
    await ensureLandmarker();
    if (!landmarker) return null;

    const result = landmarker.detect(img);
    if (!result.faceLandmarks.length) return null;

    const lms = result.faceLandmarks[0];
    if (!lms) return null;

    // 顔の外接矩形
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const lm of lms) {
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }

    // 上部20%のランドマークから前髪ラインを推定
    const topY = minY;
    // 髪は顔topよりさらに上にある（顔高さの30-50%分上を推定）
    const faceHeight = maxY - minY;
    const estimatedForeheadY = Math.max(0, topY - faceHeight * 0.05);

    return {
      landmarks: lms as NormalizedLandmark[],
      faceBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      foreheadY: estimatedForeheadY,
    };
  }

  return { isLoading, isReady, error, init, detect };
}
