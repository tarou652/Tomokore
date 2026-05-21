import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useImageCrop } from "../useImageCrop";

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
    expect(cropRect.value.x + cropRect.value.size).toBeLessThanOrEqual(
      canvas.width,
    );
    expect(cropRect.value.y + cropRect.value.size).toBeLessThanOrEqual(
      canvas.height,
    );
  });

  it("getCroppedCanvas は画像未設定時に null を返す", () => {
    const { getCroppedCanvas } = useImageCrop(canvasRef);
    expect(getCroppedCanvas(64)).toBeNull();
  });

  it("getCroppedCanvas は指定サイズのキャンバスを返す", () => {
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

  it("onMouseup がドラッグを終了する（例外なく完了する）", () => {
    const { onMouseup } = useImageCrop(canvasRef);
    expect(() => onMouseup()).not.toThrow();
  });
});
