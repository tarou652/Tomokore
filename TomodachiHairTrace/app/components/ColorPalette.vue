<script setup lang="ts">
import type { PaletteEntry } from "~/composables/useColorPalette";

const props = defineProps<{
  palette: PaletteEntry[];
}>();

const emit = defineEmits<{
  copied: [hex: string];
}>();

/** HEXカラーコードを大文字でクリップボードにコピーしてイベントをemitする */
async function onCopyHex(hex: string) {
  await navigator.clipboard.writeText(hex.toUpperCase()).catch(() => {});
  emit("copied", hex.toUpperCase());
}
</script>

<template>
  <section class="card">
    <header class="card-header" style="background: #ffc8d6">
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0"
          style="border: 2px solid #2a1f1b; box-shadow: 0 2px 0 0 #2a1f1b"
        >
          <span style="font-size: 14px">🎨</span>
        </div>
        <div>
          <h2
            class="font-bold"
            style="font-size: 14px; color: #2a1f1b; line-height: 1.2"
          >
            カラーパレット
          </h2>
          <p style="font-size: 11px; color: #4a3a33; margin-top: 2px">
            クリックで HEX コピー
          </p>
        </div>
      </div>
      <span class="chip" style="background: #ffe7a3"
        >{{ props.palette.length }}色</span
      >
    </header>
    <div class="p-4">
      <!-- スウォッチグリッド -->
      <div class="grid grid-cols-6 gap-2.5 mb-4">
        <button
          v-for="entry in props.palette"
          :key="entry.hex"
          class="group flex flex-col items-center gap-1"
          :title="`クリックでコピー: ${entry.hex.toUpperCase()}`"
          @click="onCopyHex(entry.hex)"
        >
          <span
            class="block w-full aspect-square rounded-xl transition-transform group-hover:scale-110"
            style="border: 2px solid #2a1f1b; box-shadow: 0 3px 0 0 #2a1f1b"
            :style="{ background: entry.hex }"
          />
          <span
            class="mono text-center truncate w-full"
            style="font-size: 9px; color: #7a6a5f"
          >
            {{ entry.hex.toUpperCase() }}
          </span>
        </button>
      </div>
      <!-- 詳細リスト -->
      <div class="pt-3 -mx-4 px-4" style="border-top: 2px dashed #2a1f1b">
        <div
          class="flex items-center mono uppercase tracking-wider px-1 pb-1.5 font-bold"
          style="font-size: 10px; color: #7a6a5f"
        >
          <div class="w-6" />
          <div class="w-20 pl-2">hex</div>
          <div class="flex-1 pl-2">分布</div>
          <div class="w-14 text-right">%</div>
        </div>
        <div class="space-y-1">
          <button
            v-for="entry in props.palette"
            :key="`list-${entry.hex}`"
            class="w-full flex items-center px-1.5 py-1.5 rounded-xl transition-colors"
            style="color: #2a1f1b"
            :title="`クリックでコピー: ${entry.hex.toUpperCase()}`"
            @mouseenter="
              ($event.currentTarget as HTMLElement).style.background = '#fff6e1'
            "
            @mouseleave="
              ($event.currentTarget as HTMLElement).style.background = ''
            "
            @click="onCopyHex(entry.hex)"
          >
            <span
              class="block w-6 h-6 rounded-md shrink-0"
              style="border: 2px solid #2a1f1b; box-shadow: 0 2px 0 0 #2a1f1b"
              :style="{ background: entry.hex }"
            />
            <span
              class="mono font-bold w-20 pl-2 text-left tabular-nums"
              style="font-size: 11px"
            >
              {{ entry.hex.toUpperCase() }}
            </span>
            <span class="flex-1 pl-2">
              <span class="rail block">
                <span
                  :style="{
                    background: entry.hex,
                    width: `${Math.max(2, (entry.count / (props.palette[0]?.count ?? 1)) * 100)}%`,
                  }"
                />
              </span>
            </span>
            <span
              class="mono font-bold w-14 text-right tabular-nums"
              style="font-size: 11px"
            >
              {{ entry.percentage.toFixed(1) }}%
            </span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
