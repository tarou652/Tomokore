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
  w: number;
  h: number;
}

export interface AspectPreset {
  id: string;
  label: string;
  emoji: string;
  wRatio: number;
  hRatio: number;
}

/** トモコレの描画エリアに対応するアスペクト比プリセット一覧 */
export const ASPECT_PRESETS: AspectPreset[] = [
  { id: "square", label: "顔", emoji: "🧑", wRatio: 1, hRatio: 1 },
  { id: "portrait", label: "たてなが", emoji: "📖", wRatio: 2, hRatio: 3 },
  { id: "landscape", label: "よこなが", emoji: "📺", wRatio: 16, hRatio: 9 },
  { id: "game", label: "ゲーム", emoji: "🎮", wRatio: 3, hRatio: 2 },
];

export function useImageCrop(canvasRef: Ref<HTMLCanvasElement | null>) {
  const cropRect = ref<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const displayScale = ref(1);
  const aspectRatio = ref<{ w: number; h: number }>({ w: 1, h: 1 });

  let imgEl: HTMLImageElement | null = null;
  let dragMode: "move" | "tl" | "tr" | "bl" | "br" | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let startRect: CropRect = { x: 0, y: 0, w: 0, h: 0 };

  /** canvas の 2D コンテキストを取得する */
  function getCtx() {
    return canvasRef.value?.getContext("2d") ?? null;
  }

  /** アスペクト比を維持しながらキャンバス内に収まる最大クロップ枠を中央配置する */
  function initCropRect(cw: number, ch: number) {
    const { w: rw, h: rh } = aspectRatio.value;
    let cropW = cw;
    let cropH = (cw * rh) / rw;
    // 高さがキャンバスを超える場合は高さ基準で再計算
    if (cropH > ch) {
      cropH = ch;
      cropW = (ch * rw) / rh;
    }
    cropRect.value = {
      x: Math.round((cw - cropW) / 2),
      y: Math.round((ch - cropH) / 2),
      w: Math.round(cropW),
      h: Math.round(cropH),
    };
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
    initCropRect(canvas.width, canvas.height);
    draw();
  }

  /** アスペクト比を変更してクロップ枠を再初期化する */
  function setAspectRatio(wRatio: number, hRatio: number) {
    aspectRatio.value = { w: wRatio, h: hRatio };
    const canvas = canvasRef.value;
    if (!canvas || !imgEl) return;
    initCropRect(canvas.width, canvas.height);
    draw();
  }

  /** クロップ枠をオーバーレイ付きでキャンバスに描画する */
  function draw() {
    const ctx = getCtx();
    const canvas = canvasRef.value;
    if (!ctx || !canvas || !imgEl) return;
    const { x, y, w, h } = cropRect.value;

    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

    // 枠外を暗転させる
    ctx.fillStyle = `rgba(0,0,0,${OVERLAY_ALPHA})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 選択範囲だけ元の画像を再描画してクリアに見せる
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    const corners = [
      { hx: x, hy: y },
      { hx: x + w, hy: y },
      { hx: x, hy: y + h },
      { hx: x + w, hy: y + h },
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
    const { x, y, w, h } = cropRect.value;
    const corners = [
      { id: "tl" as const, hx: x, hy: y },
      { id: "tr" as const, hx: x + w, hy: y },
      { id: "bl" as const, hx: x, hy: y + h },
      { id: "br" as const, hx: x + w, hy: y + h },
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
      const { x, y, w, h } = cropRect.value;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
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

  /** アスペクト比を維持しながら幅から高さを計算する */
  function heightFromWidth(w: number): number {
    const { w: rw, h: rh } = aspectRatio.value;
    return (w * rh) / rw;
  }

  /** アスペクト比を維持しながら高さから幅を計算する */
  function widthFromHeight(h: number): number {
    const { w: rw, h: rh } = aspectRatio.value;
    return (h * rw) / rh;
  }

  /** ドラッグ中にクロップ枠をアスペクト比を維持しながら更新して再描画する */
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
        const { x, y, w, h } = cropRect.value;
        canvas.style.cursor =
          mx >= x && mx <= x + w && my >= y && my <= y + h
            ? "move"
            : "crosshair";
      }
      return;
    }

    const cw = canvas.width;
    const ch = canvas.height;
    const { x, y, w, h } = startRect;
    let nx = x,
      ny = y,
      nw = w,
      nh = h;

    if (dragMode === "move") {
      nx = Math.max(0, Math.min(cw - w, x + (mx - dragStartX)));
      ny = Math.max(0, Math.min(ch - h, y + (my - dragStartY)));
    } else if (dragMode === "br") {
      // 右下コーナー: 左上固定・幅優先でアスペクト比を維持
      nw = Math.max(MIN_CROP_SIZE, mx - x);
      nw = Math.min(nw, cw - x);
      nh = heightFromWidth(nw);
      if (ny + nh > ch) {
        nh = ch - ny;
        nw = widthFromHeight(nh);
      }
    } else if (dragMode === "tl") {
      // 左上コーナー: 右下固定
      const fixX = x + w;
      const fixY = y + h;
      nw = Math.max(MIN_CROP_SIZE, fixX - mx);
      nw = Math.min(nw, fixX);
      nh = heightFromWidth(nw);
      if (nh > fixY) {
        nh = fixY;
        nw = widthFromHeight(nh);
      }
      nx = fixX - nw;
      ny = fixY - nh;
    } else if (dragMode === "tr") {
      // 右上コーナー: 左下固定
      const fixY = y + h;
      nw = Math.max(MIN_CROP_SIZE, mx - x);
      nw = Math.min(nw, cw - x);
      nh = heightFromWidth(nw);
      if (nh > fixY) {
        nh = fixY;
        nw = widthFromHeight(nh);
      }
      nx = x;
      ny = fixY - nh;
    } else if (dragMode === "bl") {
      // 左下コーナー: 右上固定
      const fixX = x + w;
      nw = Math.max(MIN_CROP_SIZE, fixX - mx);
      nw = Math.min(nw, fixX);
      nh = heightFromWidth(nw);
      if (ny + nh > ch) {
        nh = ch - ny;
        nw = widthFromHeight(nh);
      }
      nx = fixX - nw;
      ny = y;
    }

    cropRect.value = {
      x: Math.round(nx),
      y: Math.round(ny),
      w: Math.round(nw),
      h: Math.round(nh),
    };
    draw();
  }

  /** ドラッグ終了時にモードをリセットする */
  function onMouseup() {
    dragMode = null;
  }

  /** クロップ範囲をアスペクト比を維持して書き出す（長辺が targetSize になる） */
  function getCroppedCanvas(targetSize: number): HTMLCanvasElement | null {
    if (!imgEl) return null;
    const scale = displayScale.value;
    const { x, y, w, h } = cropRect.value;
    // 長辺を targetSize に合わせ、短辺はアスペクト比から計算する
    const outW = w >= h ? targetSize : Math.round((targetSize * w) / h);
    const outH = h > w ? targetSize : Math.round((targetSize * h) / w);
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      imgEl,
      x / scale,
      y / scale,
      w / scale,
      h / scale,
      0,
      0,
      outW,
      outH,
    );
    return out;
  }

  return {
    cropRect: readonly(cropRect),
    setImage,
    setAspectRatio,
    draw,
    onMousedown,
    onMousemove,
    onMouseup,
    getCroppedCanvas,
  };
}
