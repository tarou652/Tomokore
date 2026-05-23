import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useImageCrop, ASPECT_PRESETS } from "../useImageCrop";

/** テスト用のキャンバスモックを生成するヘルパー */
function makeCanvasMock() {
  const ctx = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    getImageData: vi.fn(),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high" as ImageSmoothingQuality,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    fillText: vi.fn(),
  };

  const canvas = {
    width: 0,
    height: 0,
    style: { cursor: "" },
    getContext: vi.fn(() => ctx),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
    })),
    toDataURL: vi.fn(() => "data:image/png;base64,"),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

/** テスト用の画像モックを生成するヘルパー */
function makeImageMock(w = 100, h = 100) {
  return {
    naturalWidth: w,
    naturalHeight: h,
  } as HTMLImageElement;
}

describe("useImageCrop", () => {
  let canvasRef: ReturnType<typeof ref<HTMLCanvasElement | null>>;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    const mock = makeCanvasMock();
    canvas = mock.canvas;
    canvasRef = ref<HTMLCanvasElement | null>(canvas);
  });

  it("setImage がキャンバスのサイズを画像に合わせて設定する", () => {
    const { setImage } = useImageCrop(canvasRef);
    const img = makeImageMock(200, 100);
    setImage(img);
    // DISPLAY_MAX=400 なので 200x100 はそのまま
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
  });

  it("setImage が画像を DISPLAY_MAX 以下にスケールダウンする", () => {
    const { setImage } = useImageCrop(canvasRef);
    const img = makeImageMock(800, 800);
    setImage(img);
    // DISPLAY_MAX=400 なので 800x800 → 400x400
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(400);
  });

  it("setImage 後の cropRect は画像内に収まっている", () => {
    const { setImage, cropRect } = useImageCrop(canvasRef);
    const img = makeImageMock(200, 100);
    setImage(img);
    expect(cropRect.value.x).toBeGreaterThanOrEqual(0);
    expect(cropRect.value.y).toBeGreaterThanOrEqual(0);
    expect(cropRect.value.x + cropRect.value.w).toBeLessThanOrEqual(
      canvas.width,
    );
    expect(cropRect.value.y + cropRect.value.h).toBeLessThanOrEqual(
      canvas.height,
    );
  });

  it("デフォルト（1:1）の cropRect は正方形になる", () => {
    const { setImage, cropRect } = useImageCrop(canvasRef);
    setImage(makeImageMock(200, 200));
    expect(cropRect.value.w).toBe(cropRect.value.h);
  });

  it("setAspectRatio(2,3) 後の cropRect が 2:3 のアスペクト比を維持する", () => {
    const { setImage, setAspectRatio, cropRect } = useImageCrop(canvasRef);
    setImage(makeImageMock(200, 200));
    setAspectRatio(2, 3);
    const ratio = cropRect.value.w / cropRect.value.h;
    expect(ratio).toBeCloseTo(2 / 3, 1);
  });

  it("setAspectRatio(16,9) 後の cropRect が 16:9 のアスペクト比を維持する", () => {
    const { setImage, setAspectRatio, cropRect } = useImageCrop(canvasRef);
    setImage(makeImageMock(200, 200));
    setAspectRatio(16, 9);
    const ratio = cropRect.value.w / cropRect.value.h;
    expect(ratio).toBeCloseTo(16 / 9, 1);
  });

  it("getCroppedCanvas は画像未設定時に null を返す", () => {
    const { getCroppedCanvas } = useImageCrop(canvasRef);
    expect(getCroppedCanvas(64)).toBeNull();
  });

  it("getCroppedCanvas は 1:1 画像で長辺 = targetSize の正方形キャンバスを返す", () => {
    const { setImage, getCroppedCanvas } = useImageCrop(canvasRef);
    setImage(makeImageMock(100, 100));

    // document.createElement をモック
    const outCanvas = makeCanvasMock().canvas;
    vi.spyOn(document, "createElement").mockReturnValueOnce(
      outCanvas as unknown as HTMLElement,
    );

    const result = getCroppedCanvas(64);
    expect(result).not.toBeNull();
    expect(outCanvas.width).toBe(64);
    expect(outCanvas.height).toBe(64);
  });

  it("getCroppedCanvas は 2:3 アスペクト比でも long side = targetSize になる", () => {
    const { setImage, setAspectRatio, getCroppedCanvas } =
      useImageCrop(canvasRef);
    setImage(makeImageMock(200, 200));
    setAspectRatio(2, 3);

    const outCanvas = makeCanvasMock().canvas;
    vi.spyOn(document, "createElement").mockReturnValueOnce(
      outCanvas as unknown as HTMLElement,
    );

    getCroppedCanvas(128);
    // 縦 > 横 なので height = 128、width = 128 * (2/3) ≈ 85
    expect(outCanvas.height).toBe(128);
    expect(outCanvas.width).toBeCloseTo(85, 0);
  });

  it("ASPECT_PRESETS に 4 件のプリセットが定義されている", () => {
    expect(ASPECT_PRESETS).toHaveLength(4);
  });

  it("ASPECT_PRESETS の最初のプリセットが 1:1 の正方形である", () => {
    const first = ASPECT_PRESETS[0]!;
    expect(first.wRatio / first.hRatio).toBe(1);
  });

  it("onMouseup がドラッグを終了する（例外なく完了する）", () => {
    const { onMouseup } = useImageCrop(canvasRef);
    expect(() => onMouseup()).not.toThrow();
  });
});
