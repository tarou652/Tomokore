<script setup lang="ts">
/** 選択可能な解像度プリセット */
const RESOLUTIONS = [64, 128, 256] as const;
type Resolution = (typeof RESOLUTIONS)[number];

const emit = defineEmits<{
  convert: [size: Resolution];
}>();

const targetSize = ref<Resolution>(64);

/** 現在選択中の解像度で変換イベントをemitする */
function onConvert() {
  emit("convert", targetSize.value);
}
</script>

<template>
  <UCard>
    <template #header>
      <span class="text-sm font-medium">変換設定</span>
    </template>
    <div class="space-y-4">
      <div>
        <p class="text-xs text-slate-400 mb-2">解像度</p>
        <div class="flex gap-2">
          <UButton
            v-for="size in RESOLUTIONS"
            :key="size"
            :variant="targetSize === size ? 'solid' : 'outline'"
            size="sm"
            @click="targetSize = size"
          >
            {{ size }}×{{ size }}
          </UButton>
        </div>
      </div>
      <UButton class="w-full" @click="onConvert">変換する</UButton>
    </div>
  </UCard>
</template>
