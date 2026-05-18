import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'

export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
}

export function useFaceDetect() {
  const isReady = ref(false)
  const isProcessing = ref(false)
  let landmarker: import('@mediapipe/tasks-vision').FaceLandmarker | null = null

  async function init() {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
    )
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      numFaces: 1,
      runningMode: 'IMAGE',
    })
    isReady.value = true
  }

  async function detect(imageEl: HTMLImageElement): Promise<FaceLandmarkerResult | null> {
    if (!landmarker) return null
    isProcessing.value = true
    try {
      return landmarker.detect(imageEl)
    }
    finally {
      isProcessing.value = false
    }
  }

  // 正規化ランドマーク座標からピクセル単位の顔バウンディングボックスを計算
  function getFaceBox(result: FaceLandmarkerResult, imgW: number, imgH: number): FaceBox | null {
    const lm = result.faceLandmarks?.[0]
    if (!lm || lm.length === 0) return null

    let minX = 1, minY = 1, maxX = 0, maxY = 0
    for (const p of lm) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }

    // 前髪・頭頂部を含むよう上方向にマージンを追加
    const padTop = (maxY - minY) * 0.6
    const padSide = (maxX - minX) * 0.15
    return {
      x: Math.max(0, (minX - padSide) * imgW),
      y: Math.max(0, (minY - padTop) * imgH),
      width: Math.min(imgW, (maxX - minX + padSide * 2) * imgW),
      height: Math.min(imgH, (maxY - minY + padTop) * imgH),
    }
  }

  return { isReady, isProcessing, init, detect, getFaceBox }
}
