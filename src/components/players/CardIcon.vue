<script setup lang="ts">
defineProps<{ color: 'yellow' | 'red' }>()
</script>

<template>
  <span
    class="inline-block h-3.5 w-2.5 rounded-[2px] shadow-sm"
    :class="color === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'"
    aria-hidden="true"
  />
</template>
