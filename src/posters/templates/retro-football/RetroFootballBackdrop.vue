<script setup lang="ts">
import { computed } from 'vue'

/** Fondo de la familia Retro Football (tabla y partido): papel crema con medios tonos, franjas curvas arriba y franjas al pie. */
const props = defineProps<{ width: number; height: number; head: number; foot: number }>()
const STRIPES = ['#c2410c', '#e0a526', '#2f5d50', '#7c3a12']
/** Franjas que bajan en curva desde la esquina superior derecha. */
const bands = computed(() => {
  const w = props.width
  const h = props.head
  return STRIPES.map((c, i) => ({ c, d: `M${w * 0.7 + i * 42} -10 C${w * 0.76 + i * 42} ${h * 0.22}, ${w * 0.86 + i * 26} ${h * 0.34}, ${w + 20} ${h * 0.3 + i * 40}`, w: 38 }))
})
</script>

<template>
  <svg class="rf-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id="rf-dots" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="9" cy="9" r="3.4" fill="#7c3a12" /></pattern>
      <linearGradient id="rf-fade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="1" />
        <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <mask id="rf-mask"><rect width="100%" height="100%" fill="url(#rf-fade)" /></mask>
      <filter id="rf-paper"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.15  0 0 0 0.12 0" /></filter>
    </defs>
    <rect width="100%" height="100%" fill="#f1e3c3" />
    <rect width="100%" height="100%" fill="url(#rf-dots)" mask="url(#rf-mask)" opacity="0.18" />
    <path v-for="b in bands" :key="b.c" :d="b.d" :stroke="b.c" :stroke-width="b.w" fill="none" />
    <g :transform="`translate(0 ${height - foot / 2})`">
      <rect v-for="(c, i) in STRIPES" :key="c" :y="i * (foot / 8)" :width="width" :height="foot / 8" :fill="c" />
    </g>
    <rect width="100%" height="100%" filter="url(#rf-paper)" />
  </svg>
</template>

<style scoped>
.rf-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
