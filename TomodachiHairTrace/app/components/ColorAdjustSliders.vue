<script setup lang="ts">
import {
  type ColorAdjustParams,
  DEFAULT_COLOR_ADJUST,
} from "~/composables/useColorAdjust";

const props = withDefaults(
  defineProps<{
    params: ColorAdjustParams;
  }>(),
  {
    params: () => ({ ...DEFAULT_COLOR_ADJUST }),
  },
);

const emit = defineEmits<{
  "update:params": [params: ColorAdjustParams];
}>();

/** スライダー定義一覧 */
const SLIDERS = [
  {
    key: "brightness" as const,
    label: "あかるさ",
    emoji: "☀️",
    min: -100,
    max: 100,
  },
  {
    key: "contrast" as const,
    label: "コントラスト",
    emoji: "◐",
    min: -100,
    max: 100,
  },
  {
    key: "saturation" as const,
    label: "あざやかさ",
    emoji: "🎨",
    min: -100,
    max: 100,
  },
  {
    key: "sharpness" as const,
    label: "シャープ",
    emoji: "🔎",
    min: 0,
    max: 100,
  },
] as const;

/** 値を符号付きで表示する（min が負の場合のみ符号を付ける） */
function formatVal(v: number, min: number): string {
  if (min < 0) return v > 0 ? `+${v}` : `${v}`;
  return `${v}`;
}

/** スライダーの値が変わったとき params を更新してemitする */
function onSliderChange(key: keyof ColorAdjustParams, value: number) {
  emit("update:params", { ...props.params, [key]: value });
}

/** 全パラメータをデフォルト値にリセットする */
function onReset() {
  emit("update:params", { ...DEFAULT_COLOR_ADJUST });
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p
        class="font-bold uppercase tracking-wider"
        style="font-size: 11px; color: #4a3a33"
      >
        いろちょうせい
      </p>
      <button
        class="btn py-0.5 px-2.5"
        style="font-size: 10px"
        @click="onReset"
      >
        リセット
      </button>
    </div>

    <div v-for="s in SLIDERS" :key="s.key" class="space-y-0.5">
      <div class="flex items-center justify-between">
        <span style="font-size: 11px; color: #4a3a33">
          {{ s.emoji }} {{ s.label }}
        </span>
        <span
          class="mono font-bold"
          :style="{
            fontSize: '10px',
            color: params[s.key] !== 0 ? '#ff7a5c' : '#7a6a5f',
          }"
        >
          {{ formatVal(params[s.key], s.min) }}
        </span>
      </div>
      <input
        type="range"
        :min="s.min"
        :max="s.max"
        step="1"
        :value="params[s.key]"
        class="w-full"
        style="accent-color: #ff7a5c; cursor: pointer"
        @input="
          onSliderChange(
            s.key,
            Number(($event.target as HTMLInputElement).value),
          )
        "
      />
    </div>
  </div>
</template>
