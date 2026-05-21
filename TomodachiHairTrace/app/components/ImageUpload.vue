<script setup lang="ts">
const emit = defineEmits<{
  loaded: [img: HTMLImageElement];
  reset: [];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDraggingOver = ref(false);
const loadedFileName = ref<string | null>(null);

/** ファイルから HTMLImageElement を生成して loaded イベントをemitする */
function loadImage(file: File) {
  if (!file.type.startsWith("image/")) return;
  loadedFileName.value = file.name;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => emit("loaded", img);
  img.src = url;
}

/** 読み込んだ画像をリセットしてリセットイベントをemitする */
function onReset() {
  loadedFileName.value = null;
  emit("reset");
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
  <section class="card">
    <header class="card-header" style="background: #ffe7a3">
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0"
          style="border: 2px solid #2a1f1b; box-shadow: 0 2px 0 0 #2a1f1b"
        >
          <span style="font-size: 14px">📤</span>
        </div>
        <div>
          <h2
            class="font-bold"
            style="font-size: 14px; color: #2a1f1b; line-height: 1.2"
          >
            しゃしんをえらぶ
          </h2>
          <p style="font-size: 11px; color: #4a3a33; margin-top: 2px">
            ドラッグ＆ドロップでも OK
          </p>
        </div>
      </div>
      <button
        v-if="loadedFileName"
        class="btn"
        style="font-size: 12px; padding: 4px 10px"
        @click.stop="onReset"
      >
        🗑 リセット
      </button>
    </header>
    <div class="p-4">
      <!-- ロード済み表示 -->
      <div
        v-if="loadedFileName"
        class="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer"
        style="
          border: 2.5px solid #2a1f1b;
          background: #fff;
          box-shadow: 0 3px 0 0 #2a1f1b;
        "
        @click="fileInputRef?.click()"
      >
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style="background: #ffe7a3; border: 2px solid #2a1f1b"
        >
          <span style="font-size: 20px">🖼</span>
        </div>
        <div class="min-w-0 flex-1">
          <div
            class="font-bold truncate"
            style="font-size: 13px; color: #2a1f1b"
          >
            {{ loadedFileName }}
          </div>
        </div>
        <span
          class="chip shrink-0"
          style="background: #beebd3; font-size: 11px"
        >
          ✓ よみこみ完了
        </span>
      </div>

      <!-- 未ロード時ドロップゾーン -->
      <div
        v-else
        class="drop flex flex-col items-center justify-center gap-2 cursor-pointer select-none"
        :class="{ 'drop-active': isDraggingOver }"
        style="height: 176px"
        @click="fileInputRef?.click()"
        @dragover.prevent="isDraggingOver = true"
        @dragleave="isDraggingOver = false"
        @drop="onDrop"
      >
        <div
          class="bounce-tiny w-12 h-12 rounded-full bg-white flex items-center justify-center"
          style="border: 2.5px solid #2a1f1b; box-shadow: 0 3px 0 0 #2a1f1b"
        >
          <span style="font-size: 22px">🖼</span>
        </div>
        <div class="font-bold" style="font-size: 15px; color: #2a1f1b">
          クリックまたはドロップ
        </div>
        <div class="flex items-center gap-1.5">
          <span class="chip" style="background: #ffc8d6">PNG</span>
          <span class="chip" style="background: #beebd3">JPG</span>
          <span class="chip" style="background: #c4e3f7">WEBP</span>
        </div>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        accept="image/*"
        @change="onFileChange"
      />
    </div>
  </section>
</template>
