<script setup lang="ts">
import { computed } from 'vue'

/** Fondo de la familia Ice Blue (tabla y partido): cielo helado con cristales en las esquinas y destellos. */
const props = defineProps<{ width: number; height: number; head: number }>()
/** Cristales fijos (triángulos) en las esquinas. */
const shards = computed(() => {
  const w = props.width
  const h = props.height
  return [
    `M${w} 0 L${w * 0.62} 0 L${w * 0.86} ${h * 0.12} Z`,
    `M${w} 0 L${w * 0.86} ${h * 0.12} L${w} ${h * 0.24} Z`,
    `M${w * 0.62} 0 L${w * 0.48} 0 L${w * 0.7} ${h * 0.06} Z`,
    `M0 ${h} L0 ${h * 0.8} L${w * 0.18} ${h * 0.92} Z`,
    `M0 ${h} L${w * 0.18} ${h * 0.92} L${w * 0.34} ${h} Z`,
  ]
})
</script>

<template>
  <svg class="ib-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="ib-sky" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#d6ecff" />
        <stop offset="0.5" stop-color="#eef7ff" />
        <stop offset="1" stop-color="#dcefff" />
      </linearGradient>
      <linearGradient id="ib-shard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.9" />
        <stop offset="1" stop-color="#7cc4ff" stop-opacity="0.45" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#ib-sky)" />
    <path v-for="(d, i) in shards" :key="i" :d="d" fill="url(#ib-shard)" stroke="#ffffff" stroke-width="2" :opacity="0.55 + (i % 2) * 0.25" />
    <g stroke="#9fd3ff" stroke-width="2" opacity="0.5" fill="none">
      <path :d="`M${width * 0.08} ${head * 0.2} l26 0 m-13 -13 l0 26 m-9 -17 l18 18 m0 -18 l-18 18`" />
      <path :d="`M${width * 0.93} ${height * 0.55} l20 0 m-10 -10 l0 20 m-7 -13 l14 14 m0 -14 l-14 14`" />
    </g>
  </svg>
</template>

<style scoped>
.ib-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
