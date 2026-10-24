<script setup lang="ts">
/** Fondo de la familia Champions Gold (tabla y partido): azul noche con estrellas doradas, anillos y el doble marco dorado. */
defineProps<{ width: number; height: number; head: number }>()
/** Estrellas fijas (pseudoaleatorias deterministas): misma imagen siempre. */
const stars = Array.from({ length: 60 }, (_, i) => ({ x: ((i * 0.6180339) % 1) * 100, y: ((i * 0.7548777 + 0.13) % 1) * 24, r: 0.6 + ((i * 7) % 5) * 0.35, o: 0.15 + ((i * 3) % 7) * 0.08 }))
</script>

<template>
  <svg class="cg-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <radialGradient id="cg-glow" cx="50%" cy="0%" r="90%">
        <stop offset="0%" stop-color="#1e3a7a" />
        <stop offset="55%" stop-color="#0b1736" />
        <stop offset="100%" stop-color="#040915" />
      </radialGradient>
      <linearGradient id="cg-gold" x1="0" x2="1">
        <stop offset="0%" stop-color="#8a6a1f" />
        <stop offset="50%" stop-color="#f3d27a" />
        <stop offset="100%" stop-color="#8a6a1f" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#cg-glow)" />
    <circle v-for="(s, i) in stars" :key="i" :cx="`${s.x}%`" :cy="`${s.y}%`" :r="s.r * 1.6" fill="#f3d27a" :opacity="s.o" />
    <circle :cx="width / 2" :cy="head * 0.42" :r="width * 0.42" fill="none" stroke="#d4af37" stroke-opacity="0.08" stroke-width="2" />
    <circle :cx="width / 2" :cy="head * 0.42" :r="width * 0.36" fill="none" stroke="#d4af37" stroke-opacity="0.06" stroke-width="1.5" />
    <rect x="22" y="22" :width="width - 44" :height="height - 44" fill="none" stroke="url(#cg-gold)" stroke-width="3" />
    <rect x="34" y="34" :width="width - 68" :height="height - 68" fill="none" stroke="#d4af37" stroke-opacity="0.35" stroke-width="1.5" />
  </svg>
</template>

<style scoped>
.cg-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
