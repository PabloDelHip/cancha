<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-vue-next'
import type { ID, Match, TournamentStructure } from '@/types'
import { leagueService } from '@/services'
import { useMatchesStore, useRoundsStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { formatDate, plural } from '@/utils/format'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import { componentOf, templateOf, templatesFor } from '@/posters/templates/registry'
import { buildMatchPoster, buildPosterPages, fileNameOf, FORMATS, lastPlayed, matchFileNameOf, tableOptions, type MatchPosterData, type PosterData, type PosterFormat } from '@/posters/data'
import { loadFonts } from '@/posters/fonts'
import { canShareFiles, downloadFile, renderPng, sharePngs, toDataUrl } from '@/posters/export'

/**
 * 7B-A — «Crear imagen» de la tabla de posiciones: plantilla, formato, vista previa real (el mismo
 * componente que se exporta, escalado) y PNG para descargar o compartir. Los datos son los de la
 * estructura del torneo (los mismos de la tabla del panel); solo los textos del título se pueden
 * ajustar, como texto plano.
 * 7B-B1 — con `match`, el cartel de ese partido (solo las familias que ya tienen ese tipo).
 */
const props = defineProps<{ open: boolean; tournamentId: ID; structure?: TournamentStructure | null; match?: Match | null }>()
const emit = defineEmits<{ close: [] }>()

const tournaments = useTournamentsStore()
const matches = useMatchesStore()
const rounds = useRoundsStore()
const teams = useTeamsStore()
const toast = useToast()

const kind = computed(() => (props.match ? 'match' : 'standings') as 'match' | 'standings')
const templates = computed(() => templatesFor(kind.value))
const templateId = ref(templatesFor(props.match ? 'match' : 'standings')[0]!.id)
const format = ref<PosterFormat>('portrait')
const optionKey = ref('')
const pageIndex = ref(0)
const texts = ref({ title: '', season: '', roundLabel: '' })
const crests = ref<Record<ID, string | null>>({})
const logo = ref<string | null>(null)
const leagueName = ref<string | null>(null)
const fontsReady = ref(false)
const busy = ref<'' | 'download' | 'share'>('')
const posterEl = ref<HTMLElement | null>(null)
const frame = ref<HTMLElement | null>(null)
const frameWidth = ref(320)

const tournament = computed(() => tournaments.get(props.tournamentId))
const template = computed(() => templateOf(templateId.value, kind.value))
const component = computed(() => componentOf(template.value, kind.value))
const options = computed(() => (props.structure ? tableOptions(props.structure.phases) : []))
const option = computed(() => options.value.find((o) => o.key === optionKey.value) ?? options.value[0] ?? null)
const cut = computed(() => (option.value ? lastPlayed(matches.ofTournament(props.tournamentId), option.value) : null))
const matchPoster = computed<MatchPosterData | null>(() => {
  const t = tournament.value
  const m = props.match
  if (!t || !m) return null
  return buildMatchPoster({
    match: m,
    home: teams.get(m.homeTeamId),
    away: teams.get(m.awayTeamId),
    crests: { home: crests.value[m.homeTeamId] ?? null, away: crests.value[m.awayTeamId] ?? null },
    tournament: { name: t.name, startDate: t.startDate, endDate: t.endDate },
    leagueName: leagueName.value,
    logo: logo.value,
    roundLabel: rounds.labelOf(props.tournamentId, m.round),
    overrides: texts.value,
  })
})
const pages = computed<(PosterData | MatchPosterData)[]>(() => {
  if (matchPoster.value) return [matchPoster.value]
  const t = tournament.value
  const o = option.value
  if (!t || !o || !props.structure) return []
  return buildPosterPages({
    table: o.table,
    teams: props.structure.teams,
    crests: crests.value,
    qualifyCount: o.qualifyCount,
    withdrawn: props.structure.withdrawnTeamIds,
    tournament: { name: t.name, startDate: t.startDate, endDate: t.endDate },
    leagueName: leagueName.value,
    logo: logo.value,
    lastRound: cut.value ? { number: cut.value.round, label: rounds.labelOf(props.tournamentId, cut.value.round) } : null,
    lastPlayedDate: cut.value?.date ?? null,
    groupLabel: o.groupLabel,
    format: format.value,
    formatDate: (iso) => formatDate(iso),
    overrides: texts.value,
  })
})
const page = computed(() => pages.value[Math.min(pageIndex.value, pages.value.length - 1)] ?? null)
const dims = computed(() => FORMATS[format.value])
const scale = computed(() => frameWidth.value / dims.value.width)

let observer: ResizeObserver | null = null
watch(frame, (el) => {
  observer?.disconnect()
  if (!el) return
  observer = new ResizeObserver(([e]) => (frameWidth.value = e!.contentRect.width))
  observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    pageIndex.value = 0
    optionKey.value = options.value[0]?.key ?? ''
    texts.value = { title: '', season: '', roundLabel: '' }
    // Escudos y logo como data URL (si alguno no se puede leer, se usa el de iniciales).
    const logos: Record<ID, string | null | undefined> = props.match
      ? { [props.match.homeTeamId]: teams.get(props.match.homeTeamId)?.logoUrl, [props.match.awayTeamId]: teams.get(props.match.awayTeamId)?.logoUrl }
      : Object.fromEntries(Object.entries(props.structure?.teams ?? {}).map(([id, t]) => [id, t?.logoUrl]))
    const entries = await Promise.all(Object.entries(logos).map(async ([id, url]) => [id, await toDataUrl(url)] as const))
    crests.value = Object.fromEntries(entries)
    logo.value = await toDataUrl(tournament.value?.logoUrl)
    const leagueId = tournament.value?.leagueId
    leagueName.value = null
    if (leagueId) {
      const league = (await leagueService.mine().catch(() => [])).find((l) => l.id === leagueId)
      // La liga por defecto la crea el sistema: su nombre no es de la liga real.
      leagueName.value = league && !league.isDefault ? league.name : null
    }
  },
  { immediate: true },
)
watch(
  template,
  async (t) => {
    fontsReady.value = false
    await loadFonts(t.fonts).catch(() => undefined)
    fontsReady.value = true
  },
  { immediate: true },
)
watch([format, optionKey], () => (pageIndex.value = 0))

/** Genera los PNG de todas las imágenes (una por página) con el mismo componente de la vista previa. */
async function renderAll(): Promise<File[]> {
  const files: File[] = []
  const current = pageIndex.value
  for (let i = 0; i < pages.value.length; i++) {
    pageIndex.value = i
    await nextTick()
    const node = posterEl.value?.firstElementChild as HTMLElement | null
    if (!node) throw new Error('La vista previa no está lista')
    const blob = await renderPng(node, format.value, template.value.fonts)
    const data = pages.value[i]!
    const name = 'home' in data ? matchFileNameOf(data, template.value.id) : fileNameOf(data, template.value.id)
    files.push(new File([blob], name, { type: 'image/png' }))
  }
  pageIndex.value = current
  return files
}

async function download() {
  busy.value = 'download'
  try {
    for (const f of await renderAll()) downloadFile(f, f.name)
    toast.success(pages.value.length > 1 ? `${plural(pages.value.length, 'imagen descargada', 'imágenes descargadas')}` : 'Imagen descargada')
  } catch (e) {
    toast.error((e as Error).message || 'No se pudo generar la imagen')
  } finally {
    busy.value = ''
  }
}

async function share() {
  busy.value = 'share'
  try {
    const files = await renderAll()
    const p = page.value
    const title = p && 'home' in p ? `${p.home.name} vs ${p.away.name} · ${p.roundLabel}` : `${p?.tournamentName ?? ''} · ${p?.roundLabel ?? ''}`
    const result = await sharePngs(files, title.trim())
    if (result === 'unsupported') {
      for (const f of files) downloadFile(f, f.name)
      toast.info('Tu navegador no permite compartir imágenes: se descargaron para que las envíes.')
    }
  } catch (e) {
    toast.error((e as Error).message || 'No se pudo generar la imagen')
  } finally {
    busy.value = ''
  }
}
/** Compartir solo se ofrece donde el navegador admite archivos (si no, queda Descargar). */
const shareSupported = computed(() => canShareFiles([new File([new Uint8Array(1)], 'x.png', { type: 'image/png' })]))
</script>

<template>
  <BaseModal :open="open" title="Crear imagen" :description="match ? 'El próximo partido listo para compartir en redes y WhatsApp.' : 'La tabla de posiciones lista para compartir en redes y WhatsApp.'" size="xl" @close="busy || emit('close')">
    <div v-if="!pages.length && !match" class="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">Este torneo todavía no tiene una tabla de posiciones que publicar.</div>
    <div v-else class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <!-- Vista previa real -->
      <div class="min-w-0">
        <div ref="frame" class="relative w-full overflow-hidden rounded-xl bg-zinc-900 shadow-inner" :style="{ height: `${dims.height * scale}px` }" aria-label="Vista previa de la imagen">
          <div v-if="page" ref="posterEl" class="absolute top-0 left-0 origin-top-left" :style="{ width: `${dims.width}px`, height: `${dims.height}px`, transform: `scale(${scale})` }" :class="!fontsReady && 'opacity-0'">
            <component :is="component" :data="page" :format="format" />
          </div>
        </div>
        <div v-if="pages.length > 1" class="mt-3 flex items-center justify-center gap-3 text-sm">
          <AppButton variant="secondary" size="sm" icon :disabled="pageIndex === 0" aria-label="Imagen anterior" @click="pageIndex--"><ChevronLeft class="size-4" aria-hidden="true" /></AppButton>
          <span class="tabular text-zinc-600">Imagen {{ pageIndex + 1 }} de {{ pages.length }}</span>
          <AppButton variant="secondary" size="sm" icon :disabled="pageIndex >= pages.length - 1" aria-label="Imagen siguiente" @click="pageIndex++"><ChevronRight class="size-4" aria-hidden="true" /></AppButton>
        </div>
        <p v-if="pages.length > 1 && option" class="mt-1 text-center text-xs text-zinc-500">Con {{ option?.table.length }} equipos la tabla se reparte en {{ pages.length }} imágenes para que se lea bien.</p>
      </div>

      <!-- Opciones -->
      <div class="space-y-5">
        <fieldset>
          <legend class="mb-2 text-sm font-medium text-zinc-700">1. Plantilla</legend>
          <div class="grid grid-cols-1 gap-2">
            <label v-for="t in templates" :key="t.id" class="flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-sm transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500">
              <input v-model="templateId" type="radio" name="poster-template" :value="t.id" class="sr-only" />
              <span class="size-10 shrink-0 rounded-lg ring-1 ring-zinc-200" :style="{ background: `linear-gradient(135deg, ${t.swatch[0]} 55%, ${t.swatch[1]} 56%)` }" aria-hidden="true" />
              <span class="min-w-0"><span class="block font-semibold text-zinc-900">{{ t.name }}</span><span class="block truncate text-xs text-zinc-500">{{ t.description }}</span></span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend class="mb-2 text-sm font-medium text-zinc-700">2. Formato</legend>
          <div class="grid grid-cols-3 gap-2">
            <label v-for="(f, key) in FORMATS" :key="key" class="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center text-xs transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500">
              <input v-model="format" type="radio" name="poster-format" :value="key" class="sr-only" />
              <span class="rounded-sm border-2 border-zinc-400" :style="{ width: `${f.width / 60}px`, height: `${f.height / 60}px` }" aria-hidden="true" />
              <span class="font-semibold text-zinc-900">{{ f.label }}</span>
              <span class="text-zinc-500">{{ f.width }} × {{ f.height }}</span>
            </label>
          </div>
        </fieldset>

        <FormField v-if="!match && options.length > 1" id="poster-table" label="Tabla">
          <select id="poster-table" v-model="optionKey" class="input">
            <option v-for="o in options" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </FormField>

        <details class="rounded-xl border border-zinc-200 text-sm">
          <summary class="cursor-pointer px-3 py-2 font-medium text-zinc-700">Textos (opcional)</summary>
          <div class="space-y-3 border-t border-zinc-100 p-3">
            <FormField id="poster-title" label="Nombre del torneo"><input id="poster-title" v-model="texts.title" class="input" maxlength="60" :placeholder="tournament?.name" /></FormField>
            <FormField id="poster-season" label="Temporada"><input id="poster-season" v-model="texts.season" class="input" maxlength="24" :placeholder="pages[0]?.season" /></FormField>
            <FormField id="poster-round" :label="match ? 'Jornada' : 'Jornada o corte'" :hint="match ? 'Los equipos, la fecha, la hora y la sede no se pueden editar' : 'Las posiciones y números no se pueden editar'"><input id="poster-round" v-model="texts.roundLabel" class="input" maxlength="40" :placeholder="pages[0]?.roundLabel" /></FormField>
          </div>
        </details>
      </div>
    </div>

    <template #footer>
      <AppButton variant="secondary" :disabled="!!busy" @click="emit('close')">Cerrar</AppButton>
      <AppButton v-if="pages.length && shareSupported" variant="secondary" :loading="busy === 'share'" :disabled="!!busy || !fontsReady" @click="share"><Share2 class="size-4" aria-hidden="true" /> Compartir</AppButton>
      <AppButton v-if="pages.length" :loading="busy === 'download'" :disabled="!!busy || !fontsReady" @click="download">
        <Download class="size-4" aria-hidden="true" /> {{ pages.length > 1 ? `Descargar ${pages.length} PNG` : 'Descargar PNG' }}
      </AppButton>
    </template>
  </BaseModal>
</template>
