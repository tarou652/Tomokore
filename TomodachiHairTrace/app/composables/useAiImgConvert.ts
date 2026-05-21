import { pipeline, RawImage } from "@huggingface/transformers";

// アニメ特化の超解像モデル（~5MB, WebGPU対応）
const MODEL_ID = "Xenova/2x_APISR_RRDB_GAN_generator-onnx";

type ImageToImagePipeline = Awaited<ReturnType<typeof pipeline>>;

let pipe: ImageToImagePipeline | null = null;

export interface AiConvertProgress {
  status: "loading" | "ready" | "running" | "idle";
  progress: number; // 0-100
  message: string;
}

export function useAiImgConvert() {
  const state = ref<AiConvertProgress>({ status: "idle", progress: 0, message: "" });

  async function load() {
    if (pipe) return;
    state.value = { status: "loading", progress: 0, message: "モデルを読み込み中…" };

    pipe = await pipeline("image-to-image", MODEL_ID, {
      device: "webgpu",
      progress_callback: (p: { progress?: number; status?: string }) => {
        if (typeof p.progress === "number") {
          state.value = {
            status: "loading",
            progress: Math.round(p.progress),
            message: `モデルを読み込み中… ${Math.round(p.progress)}%`,
          };
        }
      },
    }).catch(async () => {
      // WebGPU非対応の場合はCPUにフォールバック
      return pipeline("image-to-image", MODEL_ID, {
        progress_callback: (p: { progress?: number }) => {
          if (typeof p.progress === "number") {
            state.value = {
              status: "loading",
              progress: Math.round(p.progress),
              message: `モデルを読み込み中 (CPU)… ${Math.round(p.progress)}%`,
            };
          }
        },
      });
    });

    state.value = { status: "ready", progress: 100, message: "準備完了" };
  }

  // 元画像をAIで強調してからターゲットサイズにダウンスケール
  async function convert(
    sourceImg: HTMLImageElement,
    targetSize: number,
  ): Promise<ImageData> {
    if (!pipe) await load();

    state.value = { status: "running", progress: 0, message: "AI処理中…" };

    // HuggingFace RawImage に変換
    const rawInput = await RawImage.fromURL(sourceImg.src);

    // APISR で 2x アップスケール・強調
    const output = await (pipe as (img: RawImage) => Promise<RawImage>)(rawInput);

    // Canvas に描画してからターゲットサイズにダウンスケール
    const tmp = document.createElement("canvas");
    tmp.width = output.width;
    tmp.height = output.height;
    const tmpCtx = tmp.getContext("2d")!;

    // RawImage の data を ImageData に変換
    const channels = output.channels;
    const raw = output.data as Uint8Array | Float32Array;
    const imgData = new ImageData(output.width, output.height);
    for (let i = 0; i < output.width * output.height; i++) {
      if (channels === 3) {
        imgData.data[i * 4]     = Math.round(Number(raw[i * 3]) * (raw instanceof Float32Array ? 255 : 1));
        imgData.data[i * 4 + 1] = Math.round(Number(raw[i * 3 + 1]) * (raw instanceof Float32Array ? 255 : 1));
        imgData.data[i * 4 + 2] = Math.round(Number(raw[i * 3 + 2]) * (raw instanceof Float32Array ? 255 : 1));
      } else {
        imgData.data[i * 4]     = Math.round(Number(raw[i * channels]) * (raw instanceof Float32Array ? 255 : 1));
        imgData.data[i * 4 + 1] = Math.round(Number(raw[i * channels + 1]) * (raw instanceof Float32Array ? 255 : 1));
        imgData.data[i * 4 + 2] = Math.round(Number(raw[i * channels + 2]) * (raw instanceof Float32Array ? 255 : 1));
      }
      imgData.data[i * 4 + 3] = 255;
    }
    tmpCtx.putImageData(imgData, 0, 0);

    // ターゲットサイズへニアレストネイバーでダウンスケール
    const out = document.createElement("canvas");
    out.width = targetSize;
    out.height = targetSize;
    const outCtx = out.getContext("2d")!;
    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(tmp, 0, 0, targetSize, targetSize);

    state.value = { status: "ready", progress: 100, message: "完了" };
    return outCtx.getImageData(0, 0, targetSize, targetSize);
  }

  return { state, load, convert };
}
