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

const emit = defineEmits<{
  convert: [size: Resolution];
}>();

const targetSize = ref<Resolution>(128);

/** 現在選択中の解像度で変換イベントをemitする */
function onConvert() {
  emit("convert", targetSize.value);
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
      <button class="btn btn-primary btn-lg w-full" @click="onConvert">
        ✦ へんかん する！
      </button>
    </div>
  </section>
</template>
