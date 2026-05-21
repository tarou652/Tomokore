<script setup lang="ts">
const count = ref(0);

/** カウントを1増やす */
function increment() {
  count.value++;
}

/** カウントを1減らす */
function decrement() {
  count.value--;
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-sm font-medium">Counter: {{ count }}</span>
    <button
      class="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300 transition-colors"
      @click="increment"
    >
      Increment
    </button>
    <button
      class="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300 transition-colors"
      @click="decrement"
    >
      Decrement
    </button>
  </div>
</template>
