import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import type { FaceBox } from './useFaceDetect'

export const CANVAS_SIZE = 256

export function useHairCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  function getCtx() {
    return canvasRef.value?.getContext('2d') ?? null
  }

  function clear() {
    const ctx = getCtx()
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }

  // 元画像を顔バウンディングボックスに合わせてキャンバスに描画
  function drawSource(img: HTMLImageElement, box: FaceBox) {
    const ctx = getCtx()
    if (!ctx) return
    clear()
    ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }

  function drawGrid() {
    const ctx = getCtx()
    if (!ctx) return
    const step = CANVAS_SIZE / 8
    ctx.save()
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.25)'
    ctx.lineWidth = 0.5
    for (let i = step; i < CANVAS_SIZE; i += step) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, CANVAS_SIZE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(CANVAS_SIZE, i)
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawCenterLine() {
    const ctx = getCtx()
    if (!ctx) return
    ctx.save()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(CANVAS_SIZE / 2, 0)
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE)
    ctx.stroke()
    ctx.restore()
  }

  // MediaPipe のランドマークをキャンバス座標に変換して描画
  function drawLandmarks(result: FaceLandmarkerResult, box: FaceBox, imgW: number, imgH: number) {
    const ctx = getCtx()
    const lm = result.faceLandmarks?.[0]
    if (!ctx || !lm) return

    ctx.save()
    ctx.fillStyle = 'rgba(0, 255, 128, 0.5)'
    for (const p of lm) {
      const px = ((p.x * imgW - box.x) / box.width) * CANVAS_SIZE
      const py = ((p.y * imgH - box.y) / box.height) * CANVAS_SIZE
      ctx.beginPath()
      ctx.arc(px, py, 1, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  function exportPng(): string {
    return canvasRef.value?.toDataURL('image/png') ?? ''
  }

  return { clear, drawSource, drawGrid, drawCenterLine, drawLandmarks, exportPng }
}
