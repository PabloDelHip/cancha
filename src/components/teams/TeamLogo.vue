<script setup lang="ts">
import { computed, useId } from 'vue'
import type { TeamRef } from '@/types'

const props = withDefaults(defineProps<{ team: TeamRef | null | undefined; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }>(), {
  size: 'md',
})

const px = computed(() => ({ xs: 20, sm: 28, md: 40, lg: 64, xl: 96 })[props.size])
const clipId = `crest-${useId()}`
const label = computed(() => (props.team ? `Escudo de ${props.team.name}` : 'Equipo'))
</script>

<template>
  <img
    v-if="team?.logoUrl"
    :src="team.logoUrl"
    :alt="label"
    :width="px"
    :height="px"
    class="shrink-0 object-contain"
    :style="{ width: `${px}px`, height: `${px}px` }"
    loading="lazy"
  />
  <!-- Escudo generado con los colores del club cuando no hay logo. -->
  <svg
    v-else
    viewBox="0 0 40 46"
    :width="px"
    :height="px * 1.15"
    role="img"
    :aria-label="label"
    class="shrink-0"
  >
    <defs>
      <clipPath :id="clipId">
        <path d="M20 1.5 37.5 6.5V22c0 11.5-7.6 18.6-17.5 22.5C10.1 40.6 2.5 33.5 2.5 22V6.5Z" />
      </clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <rect width="40" height="46" :fill="team?.colors.primary ?? '#a1a1aa'" />
      <path d="M-4 30 44 14v9L-4 39Z" :fill="team?.colors.secondary ?? '#e4e4e7'" opacity="0.9" />
    </g>
    <path
      d="M20 1.5 37.5 6.5V22c0 11.5-7.6 18.6-17.5 22.5C10.1 40.6 2.5 33.5 2.5 22V6.5Z"
      fill="none"
      stroke="#000"
      stroke-opacity="0.15"
      stroke-width="1.5"
    />
    <text
      v-if="size !== 'xs'"
      x="20"
      y="21"
      text-anchor="middle"
      font-family="Barlow Condensed, sans-serif"
      font-weight="800"
      font-size="12"
      fill="#fff"
      stroke="#000"
      stroke-opacity="0.25"
      stroke-width="0.6"
      paint-order="stroke"
    >
      {{ team?.shortName ?? '?' }}
    </text>
  </svg>
</template>
