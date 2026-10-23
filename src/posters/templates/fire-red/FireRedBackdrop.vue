<script setup lang="ts">
/** Fondo de la familia Fire Red (tabla y partido): brasa arriba a la derecha, cortes diagonales, grano y la línea roja bajo la cabecera. */
defineProps<{ width: number; height: number; head: number }>()
</script>

<template>
  <svg class="fr-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <radialGradient id="fr-ember" cx="78%" cy="0%" r="85%">
        <stop offset="0" stop-color="#ff3b1f" stop-opacity="0.75" />
        <stop offset="0.45" stop-color="#7a0b05" stop-opacity="0.6" />
        <stop offset="1" stop-color="#120202" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="fr-slash" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ff3b1f" stop-opacity="0" />
        <stop offset="0.5" stop-color="#ff3b1f" stop-opacity="0.5" />
        <stop offset="1" stop-color="#ff3b1f" stop-opacity="0" />
      </linearGradient>
      <filter id="fr-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.6  0 0 0 0 0.5  0 0 0 0.06 0" /></filter>
    </defs>
    <rect width="100%" height="100%" fill="#120202" />
    <rect width="100%" height="100%" fill="url(#fr-ember)" />
    <path :d="`M${width * 0.35} -20 L${width * 0.5} -20 L${width * 0.05} ${height * 0.55} L${-width * 0.1} ${height * 0.55} Z`" fill="url(#fr-slash)" opacity="0.35" />
    <path :d="`M${width * 1.05} ${height * 0.3} L${width * 1.12} ${height * 0.3} L${width * 0.55} ${height * 1.02} L${width * 0.48} ${height * 1.02} Z`" fill="url(#fr-slash)" opacity="0.25" />
    <rect x="0" :y="head - 8" :width="width" height="6" fill="#ff3b1f" />
    <rect width="100%" height="100%" filter="url(#fr-grain)" />
  </svg>
</template>

<style scoped>
.fr-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
