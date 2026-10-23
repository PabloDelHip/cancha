<script setup lang="ts">
import { computed } from 'vue'

/** Fondo de la familia Stadium Lights (tabla y partido): cielo nocturno, cancha y dos torres de reflectores. */
const props = defineProps<{ width: number; height: number }>()
/** Torres de reflectores: posición del foco y punto de la cancha al que apunta (fijos). */
const towers = computed(() => {
  const w = props.width
  const h = props.height
  return [
    { x: 70, y: 70, tx: w * 0.62, ty: h * 0.78 },
    { x: w - 70, y: 70, tx: w * 0.38, ty: h * 0.78 },
  ]
})
const beam = (t: { x: number; y: number; tx: number; ty: number }, spread: number) => `M${t.x - 30} ${t.y} L${t.x + 30} ${t.y} L${t.tx + spread} ${t.ty} L${t.tx - spread} ${t.ty} Z`
</script>

<template>
  <svg class="sl-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="sl-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#10264f" />
        <stop offset="0.55" stop-color="#071226" />
        <stop offset="1" stop-color="#03130c" />
      </linearGradient>
      <linearGradient id="sl-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.34" />
        <stop offset="1" stop-color="#cfe2ff" stop-opacity="0" />
      </linearGradient>
      <radialGradient id="sl-flare">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="0.25" stop-color="#e6f0ff" stop-opacity="0.8" />
        <stop offset="1" stop-color="#9ec5ff" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="sl-grass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0d5a33" stop-opacity="0" />
        <stop offset="1" stop-color="#0d5a33" stop-opacity="0.85" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#sl-sky)" />
    <rect :y="height * 0.6" width="100%" :height="height * 0.4" fill="url(#sl-grass)" />
    <!-- Franjas del pasto y líneas de la cancha en perspectiva -->
    <path v-for="k in 6" :key="k" :d="`M${-200 + k * 60} ${height} L${width * 0.5 - 260 + k * 80} ${height * 0.62} L${width * 0.5 - 220 + k * 80} ${height * 0.62} L${-110 + k * 60 + 160} ${height} Z`" fill="#ffffff" :opacity="k % 2 ? 0.025 : 0" />
    <ellipse :cx="width / 2" :cy="height * 0.86" :rx="width * 0.34" :ry="height * 0.05" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="3" />
    <line x1="0" :y1="height * 0.86" :x2="width" :y2="height * 0.86" stroke="#ffffff" stroke-opacity="0.1" stroke-width="3" />
    <g v-for="(t, i) in towers" :key="i">
      <path :d="beam(t, width * 0.2)" fill="url(#sl-beam)" opacity="0.55" />
      <path :d="beam(t, width * 0.09)" fill="url(#sl-beam)" opacity="0.7" />
      <rect :x="t.x - 46" :y="t.y - 30" width="92" height="56" rx="6" fill="#0b1630" stroke="#cfe2ff" stroke-opacity="0.5" />
      <circle v-for="d in 8" :key="d" :cx="t.x - 33 + ((d - 1) % 4) * 22" :cy="t.y - 14 + Math.floor((d - 1) / 4) * 24" r="7" fill="#ffffff" />
      <circle :cx="t.x" :cy="t.y" r="150" fill="url(#sl-flare)" opacity="0.65" />
    </g>
  </svg>
</template>

<style scoped>
.sl-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
