<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { TEMPLATES, templateOf } from '../templates/registry'
import { fixturePages } from './fixtures'
import { loadFonts } from '../fonts'
import { renderPng, blobToDataUrl } from '../export'
import { FORMATS, type PosterFormat } from '../data'

/**
 * Banco visual (solo desarrollo): ?template=urban-black&format=portrait&teams=16&page=0&empty=0
 * Pinta la publicación a tamaño real con datos de prueba y expone `window.__exportPoster()`, que
 * genera el PNG con el MISMO exportador de la app.
 */
const q = new URLSearchParams(location.search)
const format = (q.get('format') ?? 'portrait') as PosterFormat
const template = templateOf(q.get('template') ?? TEMPLATES[0]!.id)
const pages = fixturePages(format, Number(q.get('teams') ?? 16), { empty: q.get('empty') === '1', noLogo: q.get('nologo') === '1' })
const page = Math.min(Number(q.get('page') ?? 0), pages.length - 1)
const data = computed(() => pages[page]!)
const node = ref<HTMLElement | null>(null)
const ready = ref(false)

onMounted(async () => {
  await loadFonts(template.fonts)
  await nextTick()
  ready.value = true
  ;(window as unknown as { __pages: number }).__pages = pages.length
  ;(window as unknown as { __exportPoster: () => Promise<string> }).__exportPoster = async () => blobToDataUrl(await renderPng(node.value!.firstElementChild as HTMLElement, format, template.fonts))
})
</script>

<template>
  <div :data-ready="ready" :style="{ width: `${FORMATS[format].width}px`, height: `${FORMATS[format].height}px` }">
    <div ref="node">
      <component :is="template.component" :data="data" :format="format" />
    </div>
  </div>
</template>
