<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ label: string; value: string | number; hint?: string; icon?: Component; highlight?: boolean }>()
</script>

<template>
  <div
    class="rounded-2xl border p-4"
    :class="highlight ? 'border-pitch-800 bg-pitch-900 text-white' : 'border-zinc-200/80 bg-white'"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs font-semibold tracking-wider uppercase" :class="highlight ? 'text-pitch-200' : 'text-zinc-500'">
        {{ label }}
      </p>
      <component :is="icon" v-if="icon" class="size-4" :class="highlight ? 'text-lime-400' : 'text-zinc-400'" aria-hidden="true" />
    </div>
    <p class="tabular mt-2 font-display text-4xl leading-none font-bold">{{ value }}</p>
    <p v-if="hint" class="mt-1.5 text-xs" :class="highlight ? 'text-pitch-200' : 'text-zinc-500'">{{ hint }}</p>
  </div>
</template>
