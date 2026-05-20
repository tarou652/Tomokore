<script setup lang="ts">
import type { PaletteEntry } from "~/composables/useColorPalette";

const props = defineProps<{
  palette: PaletteEntry[];
}>();

/** HEXカラーコードを大文字でクリップボードにコピーする */
async function onCopyHex(hex: string) {
  await navigator.clipboard.writeText(hex.toUpperCase()).catch(() => {});
}
</script>

<template>
  <UCard>
    <template #header>
      <span class="text-sm font-medium">カラーパレット</span>
      <span class="text-xs text-slate-500 ml-2"
        >{{ props.palette.length }}色</span
      >
    </template>
    <!-- スウォッチグリッド -->
    <div class="grid grid-cols-6 gap-2 mb-4">
      <div
        v-for="entry in props.palette"
        :key="entry.hex"
        class="group relative cursor-pointer"
        :title="`クリックでコピー: ${entry.hex.toUpperCase()}`"
        @click="onCopyHex(entry.hex)"
      >
        <div
          class="w-full aspect-square rounded border border-white/15 transition-transform group-hover:scale-110"
          :style="{ backgroundColor: entry.hex }"
        />
        <p
          class="text-[9px] font-mono text-slate-400 text-center mt-0.5 leading-tight"
        >
          {{ entry.hex.toUpperCase() }}
        </p>
      </div>
    </div>
    <!-- 詳細リスト -->
    <div class="space-y-1">
      <div
        v-for="entry in props.palette"
        :key="`list-${entry.hex}`"
        class="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-800/50 rounded px-1 py-0.5 transition-colors"
        :title="`クリックでコピー: ${entry.hex.toUpperCase()}`"
        @click="onCopyHex(entry.hex)"
      >
        <div
          class="w-5 h-5 rounded shrink-0 border border-white/15"
          :style="{ backgroundColor: entry.hex }"
        />
        <code class="font-mono text-slate-300 w-20 shrink-0">
          {{ entry.hex.toUpperCase() }}
        </code>
        <div class="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full"
            :style="{
              width: `${(entry.count / (props.palette[0]?.count ?? 1)) * 100}%`,
              backgroundColor: entry.hex,
            }"
          />
        </div>
        <span class="text-slate-500 w-12 text-right shrink-0">
          {{ entry.percentage.toFixed(1) }}%
        </span>
      </div>
    </div>
  </UCard>
</template>
