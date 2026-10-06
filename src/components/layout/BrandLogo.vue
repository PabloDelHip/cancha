<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'light' | 'dark'; tagline?: string }>(), { tone: 'light', tagline: undefined })
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <svg viewBox="0 0 32 32" class="size-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" :fill="tone === 'light' ? '#a3e635' : '#0e2c1f'" />
      <path d="M8 22 16 8l8 14" fill="none" :stroke="tone === 'light' ? '#081a12' : '#a3e635'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="16" cy="22" r="3" :fill="tone === 'light' ? '#081a12' : '#a3e635'" />
    </svg>
    <span class="leading-none">
      <span class="block font-display text-2xl font-extrabold tracking-tight uppercase" :class="tone === 'light' ? 'text-white' : 'text-zinc-950'">
        Cancha
      </span>
      <span v-if="tagline" class="block text-[10px] font-semibold tracking-widest uppercase" :class="tone === 'light' ? 'text-lime-400' : 'text-pitch-600'">
        {{ tagline }}
      </span>
    </span>
  </span>
</template>
