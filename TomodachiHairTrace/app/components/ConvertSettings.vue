<script setup lang="ts">
import {
  type ColorAdjustParams,
  DEFAULT_COLOR_ADJUST,
} from "~/composables/useColorAdjust";

/** 選択可能な解像度プリセット */
const RESOLUTIONS = [64, 128, 256] as const;
type Resolution = (typeof RESOLUTIONS)[number];

/** 解像度ごとの表示オプション */
const RESOLUTION_OPTS: { size: Resolution; label: string; emoji: string }[] = [
  { size: 64, label: "ちいさめ", emoji: "🌱" },
  { size: 128, label: "おすすめ", emoji: "✨" },
  { size: 256, label: "こまかめ", emoji: "🔍" },
];

/** 色数の最小・最大値 */
const COLOR_COUNT_MIN = 8;
const COLOR_COUNT_MAX = 16;
/** 色数のデフォルト値 */
const COLOR_COUNT_DEFAULT = 12;

const emit = defineEmits<{
  convert: [
    size: Resolution,
    colorCount: number | null,
    adjustParams: ColorAdjustParams,
    useTomodachiPalette: boolean,
  ];
}>();

const targetSize = ref<Resolution>(128);
const colorCount = ref(COLOR_COUNT_DEFAULT);
/** 色数制限を有効にするかどうか（use84Palette と排他） */
const useColorLimit = ref(true);
/** 84色トモコレパレットで変換するかどうか（useColorLimit と排他） */
const use84Palette = ref(false);
const adjustParams = ref<ColorAdjustParams>({ ...DEFAULT_COLOR_ADJUST });

/** 色数制限トグル（84色パレットと排他） */
function onToggleColorLimit() {
  useColorLimit.value = !useColorLimit.value;
  if (useColorLimit.value) use84Palette.value = false;
}

/** 84色パレットトグル（色数制限と排他） */
function onToggle84Palette() {
  use84Palette.value = !use84Palette.value;
  if (use84Palette.value) useColorLimit.value = false;
}

/** 現在の設定で変換イベントをemitする */
function onConvert() {
  emit(
    "convert",
    targetSize.value,
    useColorLimit.value ? colorCount.value : null,
    adjustParams.value,
    use84Palette.value,
  );
}
</script>

<template>
  <section class="card">
    <header class="card-header" style="background: #ffd9c9">
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0"
          style="border: 2px solid #2a1f1b; box-shadow: 0 2px 0 0 #2a1f1b"
        >
          <span style="font-size: 14px">✨</span>
        </div>
        <div>
          <h2
            class="font-bold"
            style="font-size: 14px; color: #2a1f1b; line-height: 1.2"
          >
            へんかんせってい
          </h2>
          <p style="font-size: 11px; color: #4a3a33; margin-top: 2px">
            どのくらい細かくする？
          </p>
        </div>
      </div>
    </header>
    <div class="p-4 space-y-4">
      <!-- 解像度選択 -->
      <div>
        <p
          class="font-bold uppercase tracking-wider mb-2"
          style="font-size: 11px; color: #4a3a33"
        >
          かいぞうど
        </p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="opt in RESOLUTION_OPTS"
            :key="opt.size"
            class="btn flex-col gap-1 py-2.5"
            :class="{ 'btn-active': targetSize === opt.size }"
            style="height: 64px"
            @click="targetSize = opt.size"
          >
            <span style="font-size: 20px; line-height: 1">{{ opt.emoji }}</span>
            <span class="mono font-bold" style="font-size: 11px">
              {{ opt.size }}px
            </span>
            <span style="font-size: 9px; color: #4a3a33">{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- 色数スライダー -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p
            class="font-bold uppercase tracking-wider"
            style="font-size: 11px; color: #4a3a33"
          >
            いろすう
            <span v-if="use84Palette" class="mono" style="color: #5600a9">
              84色
            </span>
            <span v-else-if="useColorLimit" class="mono" style="color: #ff7a5c">
              {{ colorCount }}色
            </span>
            <span v-else class="mono" style="color: #7a6a5f">なし</span>
          </p>
          <div class="flex items-center gap-3">
            <label
              class="flex items-center gap-1.5 cursor-pointer"
              style="font-size: 11px; color: #4a3a33"
            >
              <input
                type="checkbox"
                :checked="useColorLimit"
                style="
                  accent-color: #ff7a5c;
                  cursor: pointer;
                  width: 14px;
                  height: 14px;
                "
                @change="onToggleColorLimit"
              />
              <span class="font-bold">しぼる</span>
            </label>
            <label
              class="flex items-center gap-1.5 cursor-pointer"
              style="font-size: 11px; color: #4a3a33"
            >
              <input
                type="checkbox"
                :checked="use84Palette"
                style="
                  accent-color: #5600a9;
                  cursor: pointer;
                  width: 14px;
                  height: 14px;
                "
                @change="onToggle84Palette"
              />
              <span class="font-bold">🎮 84色</span>
            </label>
          </div>
        </div>
        <div v-if="use84Palette" class="flex items-center gap-1.5">
          <span
            class="w-2 h-2 rounded-full shrink-0"
            style="background: #5600a9; display: inline-block"
          />
          <p style="font-size: 11px; color: #5600a9">
            トモコレ84色パレットに変換します
          </p>
        </div>
        <div v-else-if="useColorLimit" class="flex items-center gap-2">
          <span class="mono" style="font-size: 10px; color: #7a6a5f">
            {{ COLOR_COUNT_MIN }}
          </span>
          <input
            v-model.number="colorCount"
            type="range"
            :min="COLOR_COUNT_MIN"
            :max="COLOR_COUNT_MAX"
            step="1"
            class="flex-1"
            style="accent-color: #ff7a5c; cursor: pointer"
          />
          <span class="mono" style="font-size: 10px; color: #7a6a5f">
            {{ COLOR_COUNT_MAX }}
          </span>
        </div>
        <p v-else style="font-size: 11px; color: #7a6a5f">
          元の色をそのまま使います
        </p>
      </div>

      <!-- 色調整スライダー -->
      <div class="pt-3" style="border-top: 1.5px dashed rgba(42, 31, 27, 0.15)">
        <ColorAdjustSliders
          :params="adjustParams"
          @update:params="adjustParams = $event"
        />
      </div>

      <button class="btn btn-primary btn-lg w-full" @click="onConvert">
        ✦ へんかん する！
      </button>
    </div>
  </section>
</template>
