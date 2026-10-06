<script setup lang="ts">
import type { Tone } from '@/utils/labels'

withDefaults(defineProps<{ label: string; tone?: Tone; pulse?: boolean }>(), { tone: 'neutral' })

const tones: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  green: 'bg-pitch-50 text-pitch-700 ring-pitch-200',
  lime: 'bg-lime-100 text-lime-800 ring-lime-300',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
}
const dots: Record<Tone, string> = {
  neutral: 'bg-zinc-400',
  green: 'bg-pitch-500',
  lime: 'bg-lime-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-sky-500',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset"
    :class="tones[tone]"
  >
    <span class="relative flex size-1.5" aria-hidden="true">
      <span v-if="pulse" class="absolute inline-flex size-full animate-ping rounded-full opacity-75" :class="dots[tone]" />
      <span class="relative inline-flex size-1.5 rounded-full" :class="dots[tone]" />
    </span>
    {{ label }}
  </span>
</template>
