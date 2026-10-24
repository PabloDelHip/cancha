<script setup lang="ts">
import { computed } from 'vue'

/** Fondo de la familia Neon League (tabla y partido): negro con halo verde, piso de rejilla en perspectiva y líneas de barrido. */
const props = defineProps<{ width: number; height: number }>()
/** Líneas del piso en perspectiva (fijas). */
const floor = computed(() => {
  const w = props.width
  const h = props.height
  const top = h * 0.62
  const lines: string[] = []
  for (let i = -10; i <= 10; i++) lines.push(`M${w / 2 + i * 26} ${top} L${w / 2 + i * 220} ${h + 40}`)
  for (let k = 0; k < 9; k++) {
    const y = top + (h - top) * Math.pow(k / 8, 1.8)
    lines.push(`M-40 ${y} L${w + 40} ${y}`)
  }
  return lines.join(' ')
})
</script>

<template>
  <svg class="nl-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="nl-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#39ff88" stop-opacity="0" />
        <stop offset="1" stop-color="#39ff88" stop-opacity="0.55" />
      </linearGradient>
      <radialGradient id="nl-halo" cx="85%" cy="10%" r="60%">
        <stop offset="0" stop-color="#39ff88" stop-opacity="0.22" />
        <stop offset="1" stop-color="#39ff88" stop-opacity="0" />
      </radialGradient>
      <pattern id="nl-scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="0.35" /></pattern>
    </defs>
    <rect width="100%" height="100%" fill="#030605" />
    <rect width="100%" height="100%" fill="url(#nl-halo)" />
    <path :d="floor" stroke="url(#nl-fade)" stroke-width="2" fill="none" />
    <rect width="100%" height="100%" fill="url(#nl-scan)" />
  </svg>
</template>

<style scoped>
.nl-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
