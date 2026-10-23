<script setup lang="ts">
/**
 * Fondo de la familia Urban Black: negro, grano y tres brochazos (filtros SVG propios). `head` y
 * `foot` son las alturas de cabecera y pie de la publicación: los brochazos se acomodan a ellas.
 */
defineProps<{ width: number; height: number; head: number; foot: number }>()
</script>

<template>
  <svg class="ubk-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id="ub-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0" /></filter>
      <filter id="ub-rough"><feTurbulence type="fractalNoise" baseFrequency="0.04 0.6" numOctaves="3" seed="7" /><feDisplacementMap in="SourceGraphic" scale="38" /></filter>
    </defs>
    <rect width="100%" height="100%" fill="#090909" />
    <g filter="url(#ub-rough)" opacity="0.9">
      <path :d="`M${width * 0.58} -40 L${width + 60} -40 L${width + 60} ${head * 0.62} L${width * 0.74} ${head * 0.2} Z`" fill="#f4f4f4" opacity="0.9" />
      <path :d="`M-60 ${head * 0.98} L${width * 0.42} ${head * 0.86} L${width * 0.45} ${head * 0.93} L-60 ${head * 1.08} Z`" fill="#e5e5e5" opacity="0.5" />
      <path :d="`M-60 ${height - foot * 0.2} L${width * 0.7} ${height - foot * 1.4} L${width * 0.74} ${height - foot * 1.2} L-60 ${height + 40} Z`" fill="#ffffff" opacity="0.16" />
    </g>
    <rect width="100%" height="100%" filter="url(#ub-grain)" />
  </svg>
</template>

<style scoped>
.ubk-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
