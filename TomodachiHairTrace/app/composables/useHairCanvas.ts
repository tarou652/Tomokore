import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { FaceBox } from "./useFaceDetect";
import type { Contour } from "./useOpenCV";

export const CANVAS_SIZE = 256;

export function useHairCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  function getCtx() {
    return canvasRef.value?.getContext("2d") ?? null;
  }

  function clear() {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  // 元画像を顔バウンディングボックスに合わせてキャンバスに描画
  function drawSource(img: HTMLImageElement, box: FaceBox) {
    const ctx = getCtx();
    if (!ctx) return;
    clear();
    ctx.drawImage(
      img,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );
  }

  function drawGrid() {
    const ctx = getCtx();
    if (!ctx) return;
    const step = CANVAS_SIZE / 8;
    ctx.save();
    ctx.strokeStyle = "rgba(0, 200, 255, 0.25)";
    ctx.lineWidth = 0.5;
    for (let i = step; i < CANVAS_SIZE; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCenterLine() {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255, 80, 80, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE / 2, 0);
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
    ctx.stroke();
    ctx.restore();
  }

  // MediaPipe のランドマークをキャンバス座標に変換して描画
  function drawLandmarks(
    result: FaceLandmarkerResult,
    box: FaceBox,
    imgW: number,
    imgH: number,
  ) {
    const ctx = getCtx();
    const lm = result.faceLandmarks?.[0];
    if (!ctx || !lm) return;

    ctx.save();
    ctx.fillStyle = "rgba(0, 255, 128, 0.5)";
    for (const p of lm) {
      const px = ((p.x * imgW - box.x) / box.width) * CANVAS_SIZE;
      const py = ((p.y * imgH - box.y) / box.height) * CANVAS_SIZE;
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function exportPng(): string {
    return canvasRef.value?.toDataURL("image/png") ?? "";
  }

  function toCanvasCoord(
    srcX: number,
    srcY: number,
    box: FaceBox,
  ): [number, number] {
    return [
      ((srcX - box.x) / box.width) * CANVAS_SIZE,
      ((srcY - box.y) / box.height) * CANVAS_SIZE,
    ];
  }

  function drawHairMask(
    maskData: Uint8Array,
    maskWidth: number,
    maskHeight: number,
    box: FaceBox,
    color = "rgba(255, 180, 0, 0.35)",
  ) {
    const ctx = getCtx();
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const d = imageData.data;
    // Parse color string to RGBA components for pixel manipulation
    const tmp = document.createElement("canvas");
    const tc = tmp.getContext("2d")!;
    tc.fillStyle = color;
    tc.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = tc.getImageData(0, 0, 1, 1).data;
    const alpha = a / 255;

    for (let cy = 0; cy < CANVAS_SIZE; cy++) {
      for (let cx = 0; cx < CANVAS_SIZE; cx++) {
        const srcX = Math.round((cx / CANVAS_SIZE) * box.width + box.x);
        const srcY = Math.round((cy / CANVAS_SIZE) * box.height + box.y);
        if (srcX < 0 || srcY < 0 || srcX >= maskWidth || srcY >= maskHeight)
          continue;
        if (maskData[srcY * maskWidth + srcX] !== 255) continue;
        const i = (cy * CANVAS_SIZE + cx) * 4;
        d[i] = Math.round(d[i] * (1 - alpha) + r * alpha);
        d[i + 1] = Math.round(d[i + 1] * (1 - alpha) + g * alpha);
        d[i + 2] = Math.round(d[i + 2] * (1 - alpha) + b * alpha);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function drawContourLines(
    contours: Contour[],
    maskWidth: number,
    maskHeight: number,
    box: FaceBox,
    color = "rgba(0, 255, 200, 0.8)",
    lineWidth = 1.5,
  ) {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    for (const pts of contours) {
      if (pts.length < 2) continue;
      ctx.beginPath();
      const scaleX = maskWidth > 0 ? box.width / maskWidth : 1;
      const scaleY = maskHeight > 0 ? box.height / maskHeight : 1;
      const [x0, y0] = toCanvasCoord(
        pts[0].x * scaleX + box.x,
        pts[0].y * scaleY + box.y,
        box,
      );
      ctx.moveTo(x0, y0);
      for (let i = 1; i < pts.length; i++) {
        const [x, y] = toCanvasCoord(
          pts[i].x * scaleX + box.x,
          pts[i].y * scaleY + box.y,
          box,
        );
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSilhouette(
    contours: Contour[],
    maskWidth: number,
    maskHeight: number,
    box: FaceBox,
    color = "rgba(255, 80, 80, 0.9)",
    lineWidth = 2,
  ) {
    drawContourLines(contours, maskWidth, maskHeight, box, color, lineWidth);
  }

  function drawCardinalSpline(
    ctx: CanvasRenderingContext2D,
    pts: Array<{ x: number; y: number }>,
    tension = 0.4,
  ) {
    if (pts.length < 3) return;
    const n = pts.length;
    const getP = (i: number) => pts[((i % n) + n) % n];
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
      const p0 = getP(i - 1);
      const p1 = getP(i);
      const p2 = getP(i + 1);
      const p3 = getP(i + 2);
      const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
      const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
      const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
      const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.closePath();
  }

  function drawSmoothSilhouette(
    contours: Contour[],
    maskWidth: number,
    maskHeight: number,
    box: FaceBox,
    color = "rgba(255, 140, 0, 0.9)",
    lineWidth = 2.5,
  ) {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const pts of contours) {
      if (pts.length < 3) continue;
      const scaleX = maskWidth > 0 ? box.width / maskWidth : 1;
      const scaleY = maskHeight > 0 ? box.height / maskHeight : 1;
      const canvasPts = pts.map((p) => {
        const [x, y] = toCanvasCoord(
          p.x * scaleX + box.x,
          p.y * scaleY + box.y,
          box,
        );
        return { x, y };
      });
      ctx.beginPath();
      drawCardinalSpline(ctx, canvasPts);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBangHighlight(
    bangMask: Uint8Array | null,
    bangYMaxInCanvas: number,
    maskWidth: number,
    maskHeight: number,
    box: FaceBox,
    color = "rgba(255, 100, 255, 0.2)",
  ) {
    const ctx = getCtx();
    if (!ctx) return;
    if (bangMask) {
      drawHairMask(bangMask, maskWidth, maskHeight, box, color);
    } else {
      ctx.save();
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, CANVAS_SIZE, bangYMaxInCanvas);
      ctx.restore();
    }
  }

  return {
    clear,
    drawSource,
    drawGrid,
    drawCenterLine,
    drawLandmarks,
    exportPng,
    drawHairMask,
    drawContourLines,
    drawSilhouette,
    drawSmoothSilhouette,
    drawBangHighlight,
  };
}
