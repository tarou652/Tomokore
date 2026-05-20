<script setup lang="ts">
const emit = defineEmits<{
  loaded: [img: HTMLImageElement];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDraggingOver = ref(false);

/** ファイルから HTMLImageElement を生成して loaded イベントをemitする */
function loadImage(file: File) {
  if (!file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => emit("loaded", img);
  img.src = url;
}

/** ファイル選択inputの変更を処理する */
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) loadImage(file);
  (e.target as HTMLInputElement).value = "";
}

/** ドロップされたファイルを処理する */
function onDrop(e: DragEvent) {
  isDraggingOver.value = false;
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) loadImage(file);
}
</script>

<template>
  <UCard>
    <template #header>
      <span class="text-sm font-medium">画像を読み込む</span>
    </template>
    <div
      class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none"
      :class="
        isDraggingOver
          ? 'border-sky-400 bg-sky-950/30'
          : 'border-slate-700 hover:border-slate-500'
      "
      @click="fileInputRef?.click()"
      @dragover.prevent="isDraggingOver = true"
      @dragleave="isDraggingOver = false"
      @drop="onDrop"
    >
      <div class="text-4xl mb-2">🖼</div>
      <p class="text-sm text-slate-400">クリックまたはドロップ</p>
      <p class="text-xs text-slate-600 mt-1">PNG · JPG · WEBP</p>
    </div>
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/*"
      @change="onFileChange"
    />
  </UCard>
</template>
