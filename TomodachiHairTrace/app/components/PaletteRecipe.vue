<script setup lang="ts">
import type { ColorRecipeEntry } from "~/composables/useColorRecipe";

const props = defineProps<{
  entries: ColorRecipeEntry[];
}>();

/** パーセンテージバーの基準となる最大ピクセル数 */
const maxCount = computed(() =>
  Math.max(...props.entries.map((e) => e.count), 1),
);

/** 色相値を CSS hsl 色文字列に変換する */
function hueToColor(h: number): string {
  return `hsl(${h}, 100%, 50%)`;
}
</script>

<template>
  <section class="card">
    <header class="card-header" style="background: #ede8ff">
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0"
          style="border: 2px solid #2a1f1b; box-shadow: 0 2px 0 0 #2a1f1b"
        >
          <span style="font-size: 14px">📋</span>
        </div>
        <div>
          <h2
            class="font-bold"
            style="font-size: 14px; color: #2a1f1b; line-height: 1.2"
          >
            使用色レシピ
          </h2>
          <p style="font-size: 11px; color: #4a3a33; margin-top: 2px">
            {{ entries.length }}色 · HSV値とパレット位置
          </p>
        </div>
      </div>
    </header>

    <div class="p-3 space-y-1.5" style="max-height: 380px; overflow-y: auto">
      <div
        v-for="entry in entries"
        :key="entry.hex"
        class="flex items-center gap-2.5 p-2 rounded-xl"
        style="background: rgba(42, 31, 27, 0.04)"
      >
        <!-- カラースウォッチ -->
        <div
          class="shrink-0 rounded-lg"
          style="
            width: 32px;
            height: 32px;
            border: 2px solid #2a1f1b;
            box-shadow: 0 2px 0 0 #2a1f1b;
          "
          :style="{ background: entry.hex }"
        />

        <!-- 情報カラム -->
        <div class="flex-1 min-w-0">
          <!-- 行1: HEX コード + パレットバッジ -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              class="mono font-bold"
              style="font-size: 11px; color: #2a1f1b"
            >
              {{ entry.hex.toUpperCase() }}
            </span>
            <span
              v-if="entry.paletteRow !== null"
              class="mono font-bold px-1.5 py-0.5 rounded-md"
              style="
                font-size: 9px;
                background: #ede8ff;
                color: #5600a9;
                border: 1.5px solid #5600a9;
              "
            >
              🎮 R{{ entry.paletteRow + 1 }}·C{{ entry.paletteCol! + 1 }}
            </span>
          </div>

          <!-- 行2: 使用率バー -->
          <div class="flex items-center gap-1.5 mt-0.5">
            <div
              class="flex-1 rounded-full overflow-hidden"
              style="height: 5px; background: rgba(42, 31, 27, 0.12)"
            >
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${(entry.count / maxCount) * 100}%`,
                  background: entry.hex,
                }"
              />
            </div>
            <span
              class="mono shrink-0"
              style="
                font-size: 10px;
                color: #7a6a5f;
                min-width: 38px;
                text-align: right;
              "
            >
              {{ entry.percentage.toFixed(1) }}%
            </span>
          </div>

          <!-- 行3: HSV 値 -->
          <div class="flex items-center gap-1.5 mt-0.5">
            <span
              class="shrink-0 rounded-full"
              style="
                display: inline-block;
                width: 10px;
                height: 10px;
                border: 1px solid rgba(42, 31, 27, 0.2);
              "
              :style="{ background: hueToColor(entry.h) }"
            />
            <span class="mono" style="font-size: 10px; color: #4a3a33">
              H:{{ entry.h }}° S:{{ entry.s }}% V:{{ entry.v }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
