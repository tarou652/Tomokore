<script setup lang="ts">
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
  convert: [size: Resolution, colorCount: number | null];
}>();

const targetSize = ref<Resolution>(128);
const colorCount = ref(COLOR_COUNT_DEFAULT);
/** 色数制限を有効にするかどうか */
const useColorLimit = ref(true);

/** 現在の設定で変換イベントをemitする */
function onConvert() {
  emit(
    "convert",
    targetSize.value,
    useColorLimit.value ? colorCount.value : null,
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
              {{ opt.size }}×{{ opt.size }}
            </span>
            <span style="font-size: 9px; color: #4a3a33">{{ opt.label }}</span>
          </button>
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <p
            class="font-bold uppercase tracking-wider"
            style="font-size: 11px; color: #4a3a33"
          >
            いろすう
            <span v-if="useColorLimit" class="mono" style="color: #ff7a5c">
              {{ colorCount }}色
            </span>
            <span v-else class="mono" style="color: #7a6a5f">なし</span>
          </p>
          <label
            class="flex items-center gap-1.5 cursor-pointer"
            style="font-size: 11px; color: #4a3a33"
          >
            <input
              v-model="useColorLimit"
              type="checkbox"
              style="
                accent-color: #ff7a5c;
                cursor: pointer;
                width: 14px;
                height: 14px;
              "
            />
            <span class="font-bold">しぼる</span>
          </label>
        </div>
        <div v-if="useColorLimit" class="flex items-center gap-2">
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
      <button class="btn btn-primary btn-lg w-full" @click="onConvert">
        ✦ へんかん する！
      </button>
    </div>
  </section>
</template>
