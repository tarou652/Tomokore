import { ref, readonly } from "vue";
import type { Ref } from "vue";

/** 表示キャンバスの最大幅・高さ（px） */
const DISPLAY_MAX = 400;
/** コーナーハンドルの当たり判定半径（px） */
const HANDLE_R = 8;
/** クロップ枠の最小辺長（px） */
const MIN_CROP_SIZE = 20;
/** 枠外オーバーレイの不透明度 */
const OVERLAY_ALPHA = 0.55;
/** クロップ枠・ハンドル線の色 */
const BORDER_COLOR = "#38bdf8";
/** コーナーハンドルの塗り色 */
const HANDLE_COLOR = "#fff";
/** 枠線・ハンドル線の太さ */
const BORDER_WIDTH = 1.5;

export interface CropRect {
  x: number;
  y: number;
  size: number;
}

export function useImageCrop(canvasRef: Ref<HTMLCanvasElement | null>) {
  const cropRect = ref<CropRect>({ x: 0, y: 0, size: 0 });
  const displayScale = ref(1);

  let imgEl: HTMLImageElement | null = null;
  let dragMode: "move" | "tl" | "tr" | "bl" | "br" | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let startRect: CropRect = { x: 0, y: 0, size: 0 };

  /** canvas の 2D コンテキストを取得する */
  function getCtx() {
    return canvasRef.value?.getContext("2d") ?? null;
  }

  /** 画像をキャンバスにセットしてクロップ枠を初期化する */
  function setImage(img: HTMLImageElement) {
    imgEl = img;
    const canvas = canvasRef.value;
    if (!canvas) return;
    // DISPLAY_MAX を超えないよう縮小スケールを計算する
    const scale = Math.min(
      DISPLAY_MAX / img.naturalWidth,
      DISPLAY_MAX / img.naturalHeight,
      1,
    );
    displayScale.value = scale;
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const minDim = Math.min(canvas.width, canvas.height);
    cropRect.value = {
      x: Math.round((canvas.width - minDim) / 2),
      y: Math.round((canvas.height - minDim) / 2),
      size: minDim,
    };
    draw();
  }

  /** クロップ枠をオーバーレイ付きでキャンバスに描画する */
  function draw() {
    const ctx = getCtx();
    const canvas = canvasRef.value;
    if (!ctx || !canvas || !imgEl) return;
    const { x, y, size } = cropRect.value;

    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

    // 枠外を暗転させる
    ctx.fillStyle = `rgba(0,0,0,${OVERLAY_ALPHA})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 選択範囲だけ元の画像を再描画してクリアに見せる
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    const corners = [
      { hx: x, hy: y },
      { hx: x + size, hy: y },
      { hx: x, hy: y + size },
      { hx: x + size, hy: y + size },
    ];
    for (const c of corners) {
      ctx.beginPath();
      ctx.arc(c.hx, c.hy, HANDLE_R / 2, 0, Math.PI * 2);
      ctx.fillStyle = HANDLE_COLOR;
      ctx.fill();
      ctx.strokeStyle = BORDER_COLOR;
      ctx.lineWidth = BORDER_WIDTH;
      ctx.stroke();
    }
  }

  /** マウスイベントのキャンバス座標を返す */
  function getPos(e: MouseEvent) {
    const canvas = canvasRef.value!;
    const r = canvas.getBoundingClientRect();
    return {
      mx: (e.clientX - r.left) * (canvas.width / r.width),
      my: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  /** 座標がコーナーハンドルに当たっているか判定してIDを返す */
  function hitHandle(mx: number, my: number) {
    const { x, y, size } = cropRect.value;
    const corners = [
      { id: "tl" as const, hx: x, hy: y },
      { id: "tr" as const, hx: x + size, hy: y },
      { id: "bl" as const, hx: x, hy: y + size },
      { id: "br" as const, hx: x + size, hy: y + size },
    ];
    for (const c of corners) {
      if (Math.hypot(mx - c.hx, my - c.hy) <= HANDLE_R) return c.id;
    }
    return null;
  }

  /** ドラッグ開始時にモードとスナップショットを記録する */
  function onMousedown(e: MouseEvent) {
    const { mx, my } = getPos(e);
    const handle = hitHandle(mx, my);
    if (handle) {
      dragMode = handle;
    } else {
      const { x, y, size } = cropRect.value;
      if (mx >= x && mx <= x + size && my >= y && my <= y + size) {
        dragMode = "move";
      } else {
        return;
      }
    }
    dragStartX = mx;
    dragStartY = my;
    startRect = { ...cropRect.value };
    e.preventDefault();
  }

  /** ドラッグ中にクロップ枠を更新して再描画する */
  function onMousemove(e: MouseEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const { mx, my } = getPos(e);

    if (!dragMode) {
      // ホバー時のカーソル形状を切り替える
      const handle = hitHandle(mx, my);
      if (handle) {
        canvas.style.cursor =
          handle === "tl" || handle === "br" ? "nwse-resize" : "nesw-resize";
      } else {
        const { x, y, size } = cropRect.value;
        canvas.style.cursor =
          mx >= x && mx <= x + size && my >= y && my <= y + size
            ? "move"
            : "crosshair";
      }
      return;
    }

    const cw = canvas.width;
    const ch = canvas.height;
    const { x, y, size } = startRect;
    let nx = x;
    let ny = y;
    let nsize = size;

    if (dragMode === "move") {
      nx = Math.max(0, Math.min(cw - size, x + (mx - dragStartX)));
      ny = Math.max(0, Math.min(ch - size, y + (my - dragStartY)));
    } else if (dragMode === "br") {
      nsize = Math.max(MIN_CROP_SIZE, Math.max(mx - x, my - y));
      nsize = Math.min(nsize, cw - x, ch - y);
      nx = x;
      ny = y;
    } else if (dragMode === "tl") {
      nsize = Math.max(MIN_CROP_SIZE, Math.max(x + size - mx, y + size - my));
      nsize = Math.min(nsize, x + size, y + size);
      nx = x + size - nsize;
      ny = y + size - nsize;
    } else if (dragMode === "tr") {
      nsize = Math.max(MIN_CROP_SIZE, Math.max(mx - x, y + size - my));
      nsize = Math.min(nsize, cw - x, y + size);
      nx = x;
      ny = y + size - nsize;
    } else if (dragMode === "bl") {
      nsize = Math.max(MIN_CROP_SIZE, Math.max(x + size - mx, my - y));
      nsize = Math.min(nsize, x + size, ch - y);
      nx = x + size - nsize;
      ny = y;
    }

    cropRect.value = { x: nx, y: ny, size: nsize };
    draw();
  }

  /** ドラッグ終了時にモードをリセットする */
  function onMouseup() {
    dragMode = null;
  }

  /** クロップ範囲を targetSize px の正方形キャンバスに書き出す */
  function getCroppedCanvas(targetSize: number): HTMLCanvasElement | null {
    if (!imgEl) return null;
    const scale = displayScale.value;
    const { x, y, size } = cropRect.value;
    const out = document.createElement("canvas");
    out.width = targetSize;
    out.height = targetSize;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      imgEl,
      x / scale,
      y / scale,
      size / scale,
      size / scale,
      0,
      0,
      targetSize,
      targetSize,
    );
    return out;
  }

  return {
    cropRect: readonly(cropRect),
    setImage,
    draw,
    onMousedown,
    onMousemove,
    onMouseup,
    getCroppedCanvas,
  };
}
