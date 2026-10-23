<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { TEMPLATES, componentOf, templateOf, type PosterKind } from '../templates/registry'
import { fixtureMatch, fixturePages } from './fixtures'
import { loadFonts } from '../fonts'
import { renderPng, blobToDataUrl } from '../export'
import { FORMATS, type PosterFormat } from '../data'

/**
 * Banco visual (solo desarrollo): ?template=urban-black&format=portrait&teams=16&page=0&empty=0
 * Partido (7B-B1): ?kind=match&template=urban-black&format=story&teams=0,4&pending=0&novenue=0
 * Pinta la publicación a tamaño real con datos de prueba y expone `window.__exportPoster()`, que
 * genera el PNG con el MISMO exportador de la app.
 */
const q = new URLSearchParams(location.search)
const kind = (q.get('kind') ?? 'standings') as PosterKind
const format = (q.get('format') ?? 'portrait') as PosterFormat
const template = templateOf(q.get('template') ?? TEMPLATES[0]!.id, kind)
const component = componentOf(template, kind)
const [home, away] = (q.get('teams') ?? '0,4').split(',').map(Number)
const pages =
  kind === 'match'
    ? [fixtureMatch({ home, away, pending: q.get('pending') === '1', noVenue: q.get('novenue') === '1', noLogo: q.get('nologo') === '1' })]
    : fixturePages(format, Number(q.get('teams') ?? 16), { empty: q.get('empty') === '1', noLogo: q.get('nologo') === '1' })
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
      <component :is="component" :data="data" :format="format" />
    </div>
  </div>
</template>
