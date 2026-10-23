<script setup lang="ts">
import { computed } from 'vue'

/**
 * Escudo de un equipo en una publicación. Con escudo: la imagen se encaja sin deformarse
 * (object-fit: contain). Sin escudo (o si no se pudo leer): uno de reserva con las iniciales y los
 * colores del equipo, en la forma que pida la plantilla.
 */
const props = withDefaults(
  defineProps<{
    src: string | null
    initials: string
    colors?: { primary: string; secondary: string }
    size: number
    shape?: 'circle' | 'shield' | 'square' | 'hex'
    /** Fondo detrás del escudo real (p. ej. un disco claro en plantillas oscuras). */
    plate?: string | null
    font?: string
  }>(),
  { colors: () => ({ primary: '#3f3f46', secondary: '#ffffff' }), shape: 'circle', plate: null, font: 'inherit' },
)

const text = computed(() => props.initials.slice(0, 3))
const fontSize = computed(() => Math.round(props.size * (text.value.length >= 3 ? 0.27 : 0.36)))
/** Contraste mínimo: si el secundario se parece al primario, iniciales en blanco o negro. */
const ink = computed(() => (luminance(props.colors.primary) > 0.6 ? '#111111' : '#ffffff'))
/** El aro usa el color secundario salvo que se confunda con el fondo. */
const ring = computed(() => (sameish(props.colors.primary, props.colors.secondary) ? ink.value : props.colors.secondary))

function hex(c: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return [63, 63, 70]
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function luminance(c: string) {
  const [r, g, b] = hex(c)
  return (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255
}
function sameish(a: string, b: string) {
  return Math.abs(luminance(a) - luminance(b)) < 0.25
}
const clip = computed(() =>
  props.shape === 'shield'
    ? 'polygon(50% 0, 100% 12%, 100% 55%, 50% 100%, 0 55%, 0 12%)'
    : props.shape === 'hex'
      ? 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%)'
      : 'none',
)
const radius = computed(() => (props.shape === 'circle' ? '50%' : props.shape === 'square' ? `${Math.round(props.size * 0.18)}px` : '0'))
</script>

<template>
  <span class="crest" :style="{ width: `${size}px`, height: `${size}px` }">
    <span v-if="src" class="crest-plate" :style="{ background: plate ?? 'transparent', borderRadius: radius, clipPath: clip, padding: plate ? `${Math.round(size * 0.1)}px` : '0' }">
      <img :src="src" alt="" class="crest-img" />
    </span>
    <span
      v-else
      class="crest-fallback"
      :style="{ background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${colors.primary} 70%, white), ${colors.primary} 60%)`, color: ink, borderRadius: radius, clipPath: clip, fontSize: `${fontSize}px`, fontFamily: font, boxShadow: `inset 0 0 0 ${Math.max(2, Math.round(size * 0.07))}px ${ring}`, paddingBottom: shape === 'shield' ? `${Math.round(size * 0.08)}px` : '0' }"
    >
      {{ text }}
    </span>
  </span>
</template>

<style scoped>
.crest {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
}
.crest-plate {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.crest-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.crest-fallback {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
}
</style>
