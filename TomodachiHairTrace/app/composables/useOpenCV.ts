export type Point = { x: number; y: number };
export type Contour = Point[];

interface OpenCVMat {
  data: Uint8ClampedArray;
  data32S: Int32Array;
  rows: number;
  cols: number;
  delete(): void;
}
interface OpenCVMatVector {
  get(i: number): OpenCVMat;
  size(): number;
  delete(): void;
}

declare global {
  interface Window {
    cv?: {
      Mat: new () => OpenCVMat;
      MatVector: new () => OpenCVMatVector;
      Size: new (w: number, h: number) => { width: number; height: number };
      matFromArray(
        rows: number,
        cols: number,
        type: number,
        arr: ArrayLike<number>,
      ): OpenCVMat;
      GaussianBlur(
        src: OpenCVMat,
        dst: OpenCVMat,
        ksize: { width: number; height: number },
        sigmaX: number,
      ): void;
      Canny(src: OpenCVMat, dst: OpenCVMat, t1: number, t2: number): void;
      findContours(
        src: OpenCVMat,
        contours: OpenCVMatVector,
        hierarchy: OpenCVMat,
        mode: number,
        method: number,
      ): void;
      approxPolyDP(
        curve: OpenCVMat,
        approxCurve: OpenCVMat,
        epsilon: number,
        closed: boolean,
      ): void;
      contourArea(contour: OpenCVMat): number;
      RETR_EXTERNAL: number;
      CHAIN_APPROX_SIMPLE: number;
      CV_8UC1: number;
      onRuntimeInitialized?: () => void;
    };
  }
}

let loadPromise: Promise<void> | null = null;

function ensureOpenCV(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    if (window.cv?.Mat) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.8.0/opencv.js";
    script.async = true;
    script.onerror = () =>
      reject(new Error("OpenCV.js の読み込みに失敗しました"));
    script.onload = () => {
      if (window.cv?.Mat) {
        resolve();
      } else if (window.cv) {
        window.cv.onRuntimeInitialized = () => resolve();
      } else {
        reject(new Error("OpenCV.js の初期化に失敗しました"));
      }
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export function useOpenCV() {
  const isLoaded = ref(false);
  const isLoading = ref(false);
  const loadError = ref<string | null>(null);

  async function load(): Promise<void> {
    if (isLoaded.value) return;
    isLoading.value = true;
    try {
      await ensureOpenCV();
      isLoaded.value = true;
    } catch (e) {
      loadError.value =
        e instanceof Error ? e.message : "OpenCV の読み込みに失敗しました";
      loadPromise = null;
    } finally {
      isLoading.value = false;
    }
  }

  function cannyFromMask(
    maskData: Uint8Array,
    width: number,
    height: number,
    threshold1 = 50,
    threshold2 = 150,
  ): { edges: Uint8Array; width: number; height: number } | null {
    const cv = window.cv;
    if (!cv?.Mat) return null;
    const src = cv.matFromArray(height, width, cv.CV_8UC1, maskData);
    const blurred = new cv.Mat();
    const dst = new cv.Mat();
    try {
      cv.GaussianBlur(src, blurred, new cv.Size(3, 3), 0);
      cv.Canny(blurred, dst, threshold1, threshold2);
      return { edges: new Uint8Array(dst.data), width, height };
    } finally {
      src.delete();
      blurred.delete();
      dst.delete();
    }
  }

  function findContours(
    edgeData: Uint8Array,
    width: number,
    height: number,
    minArea = 20,
  ): { contours: Contour[]; totalPoints: number } | null {
    const cv = window.cv;
    if (!cv?.Mat) return null;
    const src = cv.matFromArray(height, width, cv.CV_8UC1, edgeData);
    const contoursMat = new cv.MatVector();
    const hierarchy = new cv.Mat();
    try {
      cv.findContours(
        src,
        contoursMat,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE,
      );
      const contours: Contour[] = [];
      let totalPoints = 0;
      for (let i = 0; i < contoursMat.size(); i++) {
        const c = contoursMat.get(i);
        if (cv.contourArea(c) < minArea) continue;
        const pts: Point[] = [];
        for (let j = 0; j < c.data32S.length; j += 2) {
          pts.push({ x: c.data32S[j], y: c.data32S[j + 1] });
        }
        contours.push(pts);
        totalPoints += pts.length;
      }
      return { contours, totalPoints };
    } finally {
      src.delete();
      contoursMat.delete();
      hierarchy.delete();
    }
  }

  function simplifyContours(contours: Contour[], epsilon: number): Contour[] {
    const cv = window.cv;
    if (!cv?.Mat || epsilon <= 0) return contours;
    return contours.map((pts) => {
      const flat = new Int32Array(pts.length * 2);
      pts.forEach((p, i) => {
        flat[i * 2] = p.x;
        flat[i * 2 + 1] = p.y;
      });
      const src = cv.matFromArray(pts.length, 1, 12, flat); // CV_32SC2 = 12
      const dst = new cv.Mat();
      try {
        cv.approxPolyDP(src, dst, epsilon, true);
        const result: Point[] = [];
        for (let j = 0; j < dst.data32S.length; j += 2) {
          result.push({ x: dst.data32S[j], y: dst.data32S[j + 1] });
        }
        return result;
      } finally {
        src.delete();
        dst.delete();
      }
    });
  }

  return {
    isLoaded,
    isLoading,
    loadError,
    load,
    cannyFromMask,
    findContours,
    simplifyContours,
  };
}
