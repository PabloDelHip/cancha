<script setup lang="ts">
import { computed } from 'vue'

/** Fondo de la familia Ultimate League (tabla y partido): morado eléctrico con dos halos y el panal de hexágonos arriba. */
const props = defineProps<{ width: number; height: number; head: number }>()
/** Panal fijo: hexágonos en la parte alta, cada vez más tenues. */
const hexes = computed(() => {
  const r = 46
  const w = Math.sqrt(3) * r
  const out: { d: string; o: number }[] = []
  for (let row = 0; row < Math.ceil(props.head / (r * 1.5)) + 1; row++) {
    for (let col = -1; col < props.width / w + 1; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0)
      const cy = row * r * 1.5
      const pts = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 3) * k + Math.PI / 6
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
      })
      out.push({ d: `M${pts.join(' L')} Z`, o: Math.max(0, 0.32 - (cy / props.head) * 0.3) })
    }
  }
  return out
})
</script>

<template>
  <svg class="ul-bg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <radialGradient id="ul-glow-a" cx="10%" cy="5%" r="70%">
        <stop offset="0" stop-color="#ff3df5" stop-opacity="0.45" />
        <stop offset="1" stop-color="#ff3df5" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="ul-glow-b" cx="95%" cy="40%" r="60%">
        <stop offset="0" stop-color="#3dd6ff" stop-opacity="0.3" />
        <stop offset="1" stop-color="#3dd6ff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="#1a0b3b" />
    <rect width="100%" height="100%" fill="url(#ul-glow-a)" />
    <rect width="100%" height="100%" fill="url(#ul-glow-b)" />
    <path v-for="(h, i) in hexes" :key="i" :d="h.d" fill="none" stroke="#c9a6ff" stroke-width="2" :stroke-opacity="h.o" />
  </svg>
</template>

<style scoped>
.ul-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
