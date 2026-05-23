<script setup lang="ts">
import CropCanvas from "~/components/CropCanvas.vue";
import {
  snapToPixelArt,
  type PixelSnapResult,
} from "~/composables/usePixelSnapper";
import type { PaletteEntry } from "~/composables/useColorPalette";
import { useBackgroundRemoval } from "~/composables/useBackgroundRemoval";
import {
  applyColorAdjust,
  type ColorAdjustParams,
} from "~/composables/useColorAdjust";
import { matchToTomodachiPalette } from "~/composables/useTomodachiPalette";
import {
  paletteEntriesToRecipe,
  imageDataToRecipe,
  type ColorRecipeEntry,
} from "~/composables/useColorRecipe";

/** トーストの表示時間（ms） */
const TOAST_DURATION = 1500;

const cropCanvasRef = ref<InstanceType<typeof CropCanvas> | null>(null);
const sourceImg = ref<HTMLImageElement | null>(null);
const resultImageData = ref<ImageData | null>(null);
const colorPalette = ref<PaletteEntry[]>([]);
const recipeEntries = ref<ColorRecipeEntry[]>([]);
const toastMsg = ref<string | null>(null);
/** プレビューと編集モードの切り替えフラグ */
const isEditing = ref(false);

const { removeBg, isRemoving, removeError } = useBackgroundRemoval();

/** エディタで使用するパレット（レシピまたは量子化パレット） */
const editorPalette = computed(() =>
  recipeEntries.value.length > 0 ? recipeEntries.value : colorPalette.value,
);

/** 画像をリセットして全状態をクリアする */
function onReset() {
  sourceImg.value = null;
  resultImageData.value = null;
  colorPalette.value = [];
  recipeEntries.value = [];
  isEditing.value = false;
}

/** トーストを一定時間表示する */
function showToast(msg: string) {
  toastMsg.value = msg;
  setTimeout(() => {
    toastMsg.value = null;
  }, TOAST_DURATION);
}

/** 画像がロードされたとき状態をリセットして新しい画像をセットする */
function onImageLoaded(img: HTMLImageElement) {
  sourceImg.value = img;
  resultImageData.value = null;
  colorPalette.value = [];
  recipeEntries.value = [];
  isEditing.value = false;
}

/** クロップ範囲を処理してドット絵とカラーパレットを生成する */
function onConvert(
  size: 64 | 128 | 256,
  colorCount: number | null,
  adjustParams: ColorAdjustParams,
  useTomodachiPalette: boolean,
) {
  const out = cropCanvasRef.value?.getCroppedCanvas(size);
  if (!out) return;
  const ctx = out.getContext("2d")!;
  // 出力キャンバスの実サイズを使う（アスペクト比維持のため非正方形になる場合がある）
  const raw = ctx.getImageData(0, 0, out.width, out.height);
  // 色調整を変換前に適用する
  const adjusted = applyColorAdjust(raw, adjustParams);
  const sizeLabel = `${out.width}×${out.height}`;
  isEditing.value = false;
  // 84色トモコレパレットモード
  if (useTomodachiPalette) {
    resultImageData.value = matchToTomodachiPalette(adjusted);
    colorPalette.value = [];
    recipeEntries.value = imageDataToRecipe(resultImageData.value);
    showToast(`変換完了 · ${sizeLabel} · 🎮 84色パレット`);
    return;
  }
  if (colorCount === null) {
    resultImageData.value = adjusted;
    colorPalette.value = [];
    // 色数制限なしは色が多すぎるためレシピを生成しない
    recipeEntries.value = [];
    showToast(`変換完了 · ${sizeLabel} · 色数制限なし`);
    return;
  }
  const { imageData, palette }: PixelSnapResult = snapToPixelArt(
    adjusted,
    colorCount,
  );
  resultImageData.value = imageData;
  colorPalette.value = palette;
  recipeEntries.value = paletteEntriesToRecipe(palette);
  showToast(`変換完了 · ${sizeLabel} · ${palette.length}色`);
}

/** 背景を削除してsourceImgを更新する */
async function onRemoveBg() {
  if (!sourceImg.value) return;
  try {
    sourceImg.value = await removeBg(sourceImg.value);
    showToast("背景を削除しました");
  } catch {
    showToast(removeError.value ?? "背景削除に失敗しました");
  }
}

/** エディタで編集されたとき resultImageData を更新する */
function onEditorUpdate(imageData: ImageData) {
  resultImageData.value = imageData;
  // 編集後もレシピを最新に保つ
  if (recipeEntries.value.length > 0) {
    recipeEntries.value = imageDataToRecipe(imageData);
  }
}

/** カラーパレットからHEXコードをコピーしたときのフィードバックを表示する */
function onHexCopied(hex: string) {
  showToast(`コピーしました ${hex}`);
}
</script>

<template>
  <div style="min-height: 100vh">
    <!-- 装飾用フローティングシェイプ -->
    <div
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 overflow-hidden"
      style="z-index: 0"
    >
      <div
        class="absolute rounded-full float-1"
        style="
          top: 96px;
          left: 6%;
          width: 40px;
          height: 40px;
          background: #ffc8d6;
          border: 2.5px solid #2a1f1b;
        "
      />
      <div
        class="absolute rounded-full float-2"
        style="
          top: 40%;
          right: 5%;
          width: 56px;
          height: 56px;
          background: #c4e3f7;
          border: 2.5px solid #2a1f1b;
        "
      />
      <div
        class="absolute rounded-2xl rotate-12 float-3"
        style="
          bottom: 18%;
          left: 4%;
          width: 48px;
          height: 48px;
          background: #beebd3;
          border: 2.5px solid #2a1f1b;
        "
      />
      <div
        class="absolute rotate-45 float-1"
        style="
          top: 68%;
          right: 10%;
          width: 32px;
          height: 32px;
          background: #ffd66b;
          border: 2.5px solid #2a1f1b;
        "
      />
    </div>

    <!-- ヘッダー -->
    <header
      class="sticky top-0 z-30"
      style="
        background: rgba(255, 246, 225, 0.92);
        border-bottom: 2.5px solid #2a1f1b;
        backdrop-filter: blur(8px);
      "
    >
      <div class="max-w-[1152px] mx-auto px-6 py-3 flex items-center gap-3">
        <div
          class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style="
            background: #ffd66b;
            border: 2.5px solid #2a1f1b;
            box-shadow: 0 3px 0 0 #2a1f1b;
          "
        >
          <span style="font-size: 22px">👾</span>
        </div>
        <div style="line-height: 1.2">
          <div
            class="font-extrabold tracking-tight"
            style="font-size: 16px; color: #2a1f1b"
          >
            Tomodachi Hair Trace
          </div>
          <div class="mono" style="font-size: 10px; color: #7a6a5f">
            しゃしん → ドット絵 へんかんツール · v0.5
          </div>
        </div>
        <div class="ml-auto hidden sm:flex items-center gap-2">
          <span class="chip" style="background: #beebd3">
            <span
              class="w-1.5 h-1.5 rounded-full"
              style="background: #5fc290; display: inline-block"
            />
            READY
          </span>
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main
      class="max-w-[1152px] mx-auto px-6 py-8"
      style="position: relative; z-index: 1"
    >
      <!-- ヒーローストリップ -->
      <div class="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1
            class="font-extrabold"
            style="
              font-size: clamp(24px, 4vw, 36px);
              color: #2a1f1b;
              line-height: 1.2;
            "
          >
            しゃしんを
            <span
              class="inline-block -rotate-2 px-2 py-0.5 rounded-xl"
              style="
                background: #ff7a5c;
                color: #fff;
                border: 2.5px solid #2a1f1b;
                box-shadow: 0 3px 0 0 #2a1f1b;
              "
            >
              ドット絵
            </span>
            に
          </h1>
          <p class="mt-2" style="font-size: 15px; color: #4a3a33">
            3 ステップで、おともだちの顔をかわいいピクセルアートに変換します。
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="chip" style="background: #ffe7a3">① アップロード</span>
          <span class="chip" style="background: #beebd3">② きりとり</span>
          <span class="chip" style="background: #ffc8d6">③ へんかん</span>
        </div>
      </div>

      <!-- 2カラムグリッド -->
      <div
        class="grid gap-6"
        style="grid-template-columns: 1fr; align-items: start"
      >
        <div
          class="grid gap-6"
          style="
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            align-items: start;
            min-width: 0;
          "
        >
          <!-- 左カラム: アップロード・クロップ・設定 -->
          <div class="space-y-5" style="max-width: 420px">
            <ImageUpload @loaded="onImageLoaded" @reset="onReset" />
            <div v-if="sourceImg" class="card p-4 space-y-3">
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0"
                  style="
                    border: 2px solid #2a1f1b;
                    box-shadow: 0 2px 0 0 #2a1f1b;
                  "
                >
                  <span style="font-size: 14px">✂️</span>
                </div>
                <div>
                  <p
                    class="font-bold"
                    style="font-size: 14px; color: #2a1f1b; line-height: 1.2"
                  >
                    はいけいさくじょ
                  </p>
                  <p style="font-size: 11px; color: #4a3a33; margin-top: 2px">
                    AIが背景を自動で取り除きます（初回のみDL）
                  </p>
                </div>
              </div>
              <button
                class="btn btn-lg w-full"
                :disabled="isRemoving"
                style="
                  background: #c4e3f7;
                  border: 2.5px solid #2a1f1b;
                  box-shadow: 0 3px 0 0 #2a1f1b;
                "
                @click="onRemoveBg"
              >
                <span v-if="isRemoving">⏳ しょりちゅう…</span>
                <span v-else>✂️ はいけいをけす</span>
              </button>
            </div>
            <CropCanvas
              v-if="sourceImg"
              ref="cropCanvasRef"
              :image="sourceImg"
            />
            <ConvertSettings v-if="sourceImg" @convert="onConvert" />
          </div>

          <!-- 右カラム: ドット絵・カラーパレット -->
          <div class="space-y-5" style="min-width: 0">
            <template v-if="resultImageData">
              <!-- プレビュー/編集モード切り替えタブ -->
              <div class="flex gap-1.5">
                <button
                  class="btn py-1 px-3"
                  :class="{ 'btn-active': !isEditing }"
                  style="font-size: 11px"
                  @click="isEditing = false"
                >
                  👁 プレビュー
                </button>
                <button
                  class="btn py-1 px-3"
                  :class="{ 'btn-active': isEditing }"
                  style="font-size: 11px"
                  @click="isEditing = true"
                >
                  ✏️ 編集
                </button>
              </div>

              <!-- 編集モード -->
              <PixelEditor
                v-if="isEditing"
                :image-data="resultImageData"
                :palette="editorPalette"
                @update="onEditorUpdate"
              />

              <!-- プレビューモード -->
              <template v-else>
                <PixelGridPreview :image-data="resultImageData" />
                <ColorPalette
                  v-if="colorPalette.length > 0"
                  :palette="colorPalette"
                  @copied="onHexCopied"
                />
                <PaletteRecipe
                  v-if="recipeEntries.length > 0"
                  :entries="recipeEntries"
                />
              </template>
            </template>

            <!-- エンプティステート -->
            <div
              v-else
              class="card flex flex-col items-center justify-center text-center p-8 relative overflow-hidden"
              style="min-height: 460px"
            >
              <div
                class="absolute inset-0"
                style="
                  background-image: radial-gradient(
                    circle at 1px 1px,
                    rgba(42, 31, 27, 0.08) 1px,
                    transparent 0
                  );
                  background-size: 20px 20px;
                  z-index: 0;
                "
              />
              <div
                class="relative flex flex-col items-center"
                style="z-index: 1"
              >
                <div
                  class="bounce-tiny w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style="
                    background: #ffd66b;
                    border: 2.5px solid #2a1f1b;
                    box-shadow: 0 4px 0 0 #2a1f1b;
                  "
                >
                  <span style="font-size: 40px">👾</span>
                </div>
                <div class="font-bold" style="font-size: 18px; color: #2a1f1b">
                  {{
                    sourceImg
                      ? "「へんかん する！」をおして"
                      : "まずはしゃしんをえらんでね"
                  }}
                </div>
                <div class="mt-1" style="font-size: 14px; color: #7a6a5f">
                  {{
                    sourceImg
                      ? "ドット絵に へんしんします ✨"
                      : "おともだちのかおをドット絵にするよ"
                  }}
                </div>
                <div
                  class="mt-6 grid grid-cols-3 gap-3 w-full"
                  style="max-width: 360px"
                >
                  <div
                    v-for="step in [
                      {
                        n: 1,
                        label: 'アップロード',
                        emoji: '📷',
                        bg: '#ffe7a3',
                      },
                      { n: 2, label: 'きりとり', emoji: '✂️', bg: '#beebd3' },
                      { n: 3, label: 'へんかん', emoji: '✨', bg: '#ffc8d6' },
                    ]"
                    :key="step.n"
                    class="card flex flex-col items-center py-3 px-2"
                    style="border-radius: 18px; box-shadow: 0 4px 0 0 #2a1f1b"
                    :style="{ background: step.bg }"
                  >
                    <div
                      style="
                        font-size: 24px;
                        line-height: 1;
                        margin-bottom: 4px;
                      "
                    >
                      {{ step.emoji }}
                    </div>
                    <div
                      class="mono font-bold"
                      style="font-size: 10px; color: #4a3a33"
                    >
                      STEP {{ step.n }}
                    </div>
                    <div
                      class="font-bold"
                      style="font-size: 12px; color: #2a1f1b"
                    >
                      {{ step.label }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- フッター -->
      <footer
        class="mt-12 mb-4 flex items-center justify-between mono"
        style="font-size: 10px; color: #7a6a5f"
      >
        <div>👾 Tomodachi Hair Trace · pixel art studio</div>
        <div>built with &lt;canvas&gt; · fully local, no upload</div>
      </footer>
    </main>

    <!-- トースト通知 -->
    <Transition name="toast-fade">
      <div
        v-if="toastMsg"
        class="toast fixed z-50 left-1/2 -translate-x-1/2"
        style="bottom: 32px"
      >
        <div
          class="flex items-center gap-2 font-bold rounded-full px-4 py-2"
          style="
            background: #fff;
            color: #2a1f1b;
            border: 2.5px solid #2a1f1b;
            box-shadow: 0 4px 0 0 #2a1f1b;
            font-size: 14px;
          "
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            style="background: #5fc290; display: inline-block"
          />
          {{ toastMsg }}
        </div>
      </div>
    </Transition>
  </div>
</template>
