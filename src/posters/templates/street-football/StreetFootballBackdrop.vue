<script setup lang="ts">
/** Fondo de la familia Street Football (tabla y partido): muro de concreto con juntas y la cinta de precaución. */
defineProps<{ width: number; height: number; tape: { y: number; h: number } }>()
</script>

<template>
  <svg class="sf-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id="sf-concrete"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="4" seed="3" /><feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.6  0 0 0 0 0.6  0 0 0 0.22 0" /></filter>
      <filter id="sf-stain"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="11" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" /></filter>
      <pattern id="sf-hazard" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="30" height="60" fill="#ffd400" /><rect x="30" width="30" height="60" fill="#111" /></pattern>
    </defs>
    <rect width="100%" height="100%" fill="#2b2b2b" />
    <rect width="100%" height="100%" filter="url(#sf-stain)" />
    <rect width="100%" height="100%" filter="url(#sf-concrete)" />
    <!-- Juntas del muro -->
    <g stroke="#000" stroke-opacity="0.35" stroke-width="3">
      <line v-for="k in 6" :key="k" x1="0" :y1="(height / 6) * k" :x2="width" :y2="(height / 6) * k" />
    </g>
    <g :transform="`rotate(-3 ${width / 2} ${tape.y})`">
      <rect x="-40" :y="tape.y - tape.h / 2" :width="width + 80" :height="tape.h" fill="url(#sf-hazard)" />
    </g>
  </svg>
</template>

<style scoped>
.sf-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
