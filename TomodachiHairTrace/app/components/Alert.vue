<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    color?: string;
  }>(),
  { color: "orange" },
);
</script>

<template>
  <div
    class="flex items-center p-4 rounded-lg bg-white shadow-md border-2 transition-transform hover:-translate-y-0.5 hover:shadow-lg"
    :style="{ borderColor: props.color }"
  >
    <slot />
  </div>
</template>
