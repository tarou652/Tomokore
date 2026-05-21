import type { FaceResult } from "./useFaceDetection";

const CANVAS_SIZE = 256;

// トモコレ顔の正規化比率（256px内での顔位置）
const FACE_CENTER_X = 0.5;
const FACE_CENTER_Y = 0.55;
const FACE_WIDTH_RATIO = 0.55; // 顔幅/キャンバス幅
const FACE_HEIGHT_RATIO = 0.6; // 顔高さ/キャンバス高さ

export function useHairTraceCanvas() {
  function drawGuide(
    canvas: HTMLCanvasElement,
    sourceImg: HTMLImageElement,
    faceResult: FaceResult,
  ) {
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    // 顔を256x256にフィットさせるスケール・オフセット計算
    const { faceBox } = faceResult;
    const srcW = sourceImg.naturalWidth;
    const srcH = sourceImg.naturalHeight;

    // 顔をトモコレのFACE_WIDTH_RATIO幅に収める
    const targetFaceW = CANVAS_SIZE * FACE_WIDTH_RATIO;
    const scale = targetFaceW / (faceBox.w * srcW);

    const faceCenterSrcX = (faceBox.x + faceBox.w / 2) * srcW;
    const faceCenterSrcY = (faceBox.y + faceBox.h / 2) * srcH;

    const drawX = CANVAS_SIZE * FACE_CENTER_X - faceCenterSrcX * scale;
    const drawY = CANVAS_SIZE * FACE_CENTER_Y - faceCenterSrcY * scale;

    // 元画像を描画
    ctx.drawImage(sourceImg, drawX, drawY, srcW * scale, srcH * scale);

    // グリッド（描きやすさガイド）
    drawGrid(ctx);

    // 中央ガイドライン
    drawCenterLine(ctx);

    // 顔楕円ガイド
    drawFaceOval(ctx, faceResult, srcW, srcH, drawX, drawY, scale);
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = "rgba(100, 200, 255, 0.2)";
    ctx.lineWidth = 0.5;
    const step = 16;
    for (let x = 0; x <= CANVAS_SIZE; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_SIZE; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCenterLine(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 200, 100, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE / 2, 0);
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
    ctx.stroke();
    ctx.restore();
  }

  function drawFaceOval(
    ctx: CanvasRenderingContext2D,
    faceResult: FaceResult,
    srcW: number,
    srcH: number,
    drawX: number,
    drawY: number,
    scale: number,
  ) {
    const { faceBox } = faceResult;

    const cx = drawX + (faceBox.x + faceBox.w / 2) * srcW * scale;
    const cy = drawY + (faceBox.y + faceBox.h / 2) * srcH * scale;
    const rx = (faceBox.w * srcW * scale) / 2;
    const ry = (faceBox.h * srcH * scale) / 2;

    ctx.save();
    ctx.strokeStyle = "rgba(100, 255, 150, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 前髪ラインを推定（顔上端からさらに少し上）
    const foreheadY = drawY + faceResult.foreheadY * srcH * scale;
    ctx.strokeStyle = "rgba(255, 150, 100, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    const hairLineLeft = cx - rx * 1.2;
    const hairLineRight = cx + rx * 1.2;
    ctx.beginPath();
    ctx.moveTo(hairLineLeft, foreheadY);
    ctx.lineTo(hairLineRight, foreheadY);
    ctx.stroke();

    ctx.restore();
  }

  function drawSilhouetteOnly(
    canvas: HTMLCanvasElement,
    sourceImg: HTMLImageElement,
    faceResult: FaceResult,
  ) {
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const { faceBox } = faceResult;
    const srcW = sourceImg.naturalWidth;
    const srcH = sourceImg.naturalHeight;

    const targetFaceW = CANVAS_SIZE * FACE_WIDTH_RATIO;
    const scale = targetFaceW / (faceBox.w * srcW);

    const faceCenterSrcX = (faceBox.x + faceBox.w / 2) * srcW;
    const faceCenterSrcY = (faceBox.y + faceBox.h / 2) * srcH;

    const drawX = CANVAS_SIZE * FACE_CENTER_X - faceCenterSrcX * scale;
    const drawY = CANVAS_SIZE * FACE_CENTER_Y - faceCenterSrcY * scale;

    ctx.drawImage(sourceImg, drawX, drawY, srcW * scale, srcH * scale);

    drawGrid(ctx);
    drawCenterLine(ctx);
  }

  return { drawGuide, drawSilhouetteOnly };
}
