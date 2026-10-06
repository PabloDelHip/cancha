<script setup lang="ts">
withDefaults(defineProps<{ label?: string; rows?: number }>(), { label: 'Cargando…', rows: 4 })
</script>

<template>
  <div role="status" aria-live="polite" class="animate-pulse space-y-4 py-2">
    <span class="sr-only">{{ label }}</span>
    <div class="h-8 w-1/3 rounded-lg bg-zinc-200" />
    <div class="h-4 w-1/2 rounded bg-zinc-200" />
    <div class="card space-y-3 p-4">
      <div v-for="i in rows" :key="i" class="flex items-center gap-3">
        <div class="size-9 rounded-full bg-zinc-200" />
        <div class="h-3 flex-1 rounded bg-zinc-200" :style="{ maxWidth: `${60 + ((i * 13) % 35)}%` }" />
        <div class="h-3 w-10 rounded bg-zinc-200" />
      </div>
    </div>
  </div>
</template>
