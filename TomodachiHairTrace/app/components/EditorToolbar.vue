<script setup lang="ts">
import type { EditorTool } from "~/composables/usePixelEditor";

/** ツール一覧の定義 */
const TOOLS: { id: EditorTool; emoji: string; label: string }[] = [
  { id: "pen", emoji: "✏️", label: "ペン" },
  { id: "eraser", emoji: "⬜", label: "けしゴム" },
  { id: "fill", emoji: "🪣", label: "ぬりつぶし" },
];

const props = withDefaults(
  defineProps<{
    tool: EditorTool;
    color: { r: number; g: number; b: number };
    symmetryH: boolean;
    symmetryV: boolean;
    canUndo: boolean;
    palette: { hex: string; r: number; g: number; b: number }[];
  }>(),
  { palette: () => [] },
);

const emit = defineEmits<{
  "update:tool": [tool: EditorTool];
  "update:color": [color: { r: number; g: number; b: number }];
  "update:symmetryH": [v: boolean];
  "update:symmetryV": [v: boolean];
  undo: [];
}>();

/** 選択中の色を HEX 文字列で返す */
const selectedHex = computed(
  () =>
    "#" +
    [props.color.r, props.color.g, props.color.b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join(""),
);

/** HEX 入力から color を更新する */
function onHexChange(hex: string): void {
  if (hex.length !== 7) return;
  const n = parseInt(hex.slice(1), 16);
  if (isNaN(n)) return;
  emit("update:color", {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  });
}
</script>

<template>
  <div
    class="px-3 py-2 flex flex-wrap gap-2 items-center"
    style="border-bottom: 1.5px dashed rgba(42, 31, 27, 0.15)"
  >
    <!-- ツール選択 -->
    <div class="flex gap-1">
      <button
        v-for="t in TOOLS"
        :key="t.id"
        class="btn py-1 px-2"
        :class="{ 'btn-active': tool === t.id }"
        style="font-size: 11px"
        @click="emit('update:tool', t.id)"
      >
        {{ t.emoji }} {{ t.label }}
      </button>
    </div>

    <!-- 対称ボタン -->
    <div class="flex gap-1">
      <button
        class="btn py-1 px-2"
        :class="{ 'btn-active': symmetryH }"
        style="font-size: 11px"
        @click="emit('update:symmetryH', !symmetryH)"
      >
        ↔ 左右
      </button>
      <button
        class="btn py-1 px-2"
        :class="{ 'btn-active': symmetryV }"
        style="font-size: 11px"
        @click="emit('update:symmetryV', !symmetryV)"
      >
        ↕ 上下
      </button>
    </div>

    <!-- カラーピッカー + 選択色表示 -->
    <div class="flex items-center gap-1">
      <div
        class="rounded shrink-0"
        style="
          width: 22px;
          height: 22px;
          border: 2px solid #2a1f1b;
          box-shadow: 0 2px 0 0 #2a1f1b;
        "
        :style="{ background: selectedHex }"
      />
      <input
        type="color"
        :value="selectedHex"
        class="cursor-pointer"
        style="
          width: 22px;
          height: 22px;
          border: none;
          padding: 0;
          background: none;
        "
        @input="onHexChange(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- パレット色スウォッチ -->
    <div v-if="palette.length > 0" class="flex flex-wrap gap-0.5">
      <button
        v-for="c in palette"
        :key="c.hex"
        class="rounded cursor-pointer"
        :style="{
          width: '14px',
          height: '14px',
          background: c.hex,
          border:
            selectedHex === c.hex
              ? '2px solid #2a1f1b'
              : '1.5px solid rgba(42, 31, 27, 0.25)',
          outline: selectedHex === c.hex ? '1.5px solid #fff' : 'none',
          outlineOffset: '-3px',
        }"
        @click="emit('update:color', { r: c.r, g: c.g, b: c.b })"
      />
    </div>

    <!-- Undo ボタン -->
    <button
      class="btn py-1 px-2 ml-auto"
      :disabled="!canUndo"
      style="font-size: 11px"
      @click="emit('undo')"
    >
      ↩ もどす
    </button>
  </div>
</template>
