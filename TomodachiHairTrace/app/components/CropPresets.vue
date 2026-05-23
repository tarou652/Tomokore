<script setup lang="ts">
import { ASPECT_PRESETS, type AspectPreset } from "~/composables/useImageCrop";

const emit = defineEmits<{
  select: [preset: AspectPreset];
}>();

const activeId = ref(ASPECT_PRESETS[0]!.id);

/** プリセットを選択してアスペクト比変更イベントをemitする */
function onSelect(preset: AspectPreset) {
  activeId.value = preset.id;
  emit("select", preset);
}
</script>

<template>
  <div class="flex gap-1.5 flex-wrap">
    <button
      v-for="preset in ASPECT_PRESETS"
      :key="preset.id"
      class="btn flex items-center gap-1 py-1.5 px-2.5"
      :class="{ 'btn-active': activeId === preset.id }"
      style="font-size: 12px"
      @click="onSelect(preset)"
    >
      <span>{{ preset.emoji }}</span>
      <span class="font-bold">{{ preset.label }}</span>
    </button>
  </div>
</template>
