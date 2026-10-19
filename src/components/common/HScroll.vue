<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Contenido que se desplaza en horizontal (tablas anchas en móvil) con una barra visible ARRIBA y
 * ABAJO. Los navegadores móviles ocultan la barra nativa y el usuario no se entera de que hay más
 * columnas: estas barras muestran cuánto falta y también se arrastran con el dedo. Solo aparecen
 * si el contenido no cabe.
 */
const scroller = ref<HTMLElement | null>(null)
const overflowing = ref(false)
const thumb = ref({ width: 100, left: 0 })
const thumbStyle = computed(() => ({ width: `${thumb.value.width}%`, left: `${thumb.value.left}%` }))

function update() {
  const el = scroller.value
  if (!el) return
  const { scrollWidth, clientWidth, scrollLeft } = el
  overflowing.value = scrollWidth > clientWidth + 1
  const width = (clientWidth / scrollWidth) * 100
  thumb.value = { width, left: scrollWidth > clientWidth ? (scrollLeft / (scrollWidth - clientWidth)) * (100 - width) : 0 }
}

// Arrastrar la barra: el desplazamiento del dedo se escala a lo que mide el contenido.
let drag: { x: number; scroll: number; ratio: number } | null = null
function start(e: PointerEvent) {
  const el = scroller.value
  if (!el) return
  const track = (e.currentTarget as HTMLElement).parentElement!.clientWidth
  drag = { x: e.clientX, scroll: el.scrollLeft, ratio: el.scrollWidth / track }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (drag && scroller.value) scroller.value.scrollLeft = drag.scroll + (e.clientX - drag.x) * drag.ratio
}
const stop = () => (drag = null)
/** Tocar la pista lleva hasta ese punto. */
function jump(e: PointerEvent) {
  const el = scroller.value
  if (!el || e.target !== e.currentTarget) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  el.scrollTo({ left: ((e.clientX - rect.left) / rect.width) * el.scrollWidth - el.clientWidth / 2, behavior: 'smooth' })
}

let observer: ResizeObserver | null = null
onMounted(() => {
  update()
  observer = new ResizeObserver(update)
  if (scroller.value) {
    observer.observe(scroller.value)
    if (scroller.value.firstElementChild) observer.observe(scroller.value.firstElementChild)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div>
    <div v-if="overflowing" class="relative mx-4 mb-1.5 h-2 touch-none rounded-full bg-zinc-100" aria-hidden="true" data-rail="top" @pointerdown="jump">
      <div class="absolute inset-y-0 cursor-grab rounded-full bg-zinc-400 active:cursor-grabbing" :style="thumbStyle" @pointerdown="start" @pointermove="move" @pointerup="stop" @pointercancel="stop" />
    </div>
    <div ref="scroller" class="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" @scroll.passive="update">
      <slot />
    </div>
    <div v-if="overflowing" class="relative mx-4 mt-1.5 h-2 touch-none rounded-full bg-zinc-100" aria-hidden="true" data-rail="bottom" @pointerdown="jump">
      <div class="absolute inset-y-0 cursor-grab rounded-full bg-zinc-400 active:cursor-grabbing" :style="thumbStyle" @pointerdown="start" @pointermove="move" @pointerup="stop" @pointercancel="stop" />
    </div>
  </div>
</template>
