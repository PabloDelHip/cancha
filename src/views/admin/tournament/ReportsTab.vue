<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AxiosError } from 'axios'
import { Award, CalendarDays, Download, FileSpreadsheet, FileText, Gavel, Info, ListOrdered, Lock, RotateCcw, Server, ShieldAlert, Users, Wallet } from 'lucide-vue-next'
import type { ReportCatalog, ReportFormat, ReportId } from '@/types'
import { ReportDownloadError, reportService, REPORTS_REQUIRE_SERVER, USE_MOCKS } from '@/services'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentStructure } from '@/composables/useTournamentStructure'
import { useToast } from '@/composables/useToast'
import { ROLE_LABEL } from '@/utils/labels'
import {
  activeFilters,
  CATEGORY_LABEL,
  emptyFilters,
  explainError,
  FILTER_LABEL,
  filterErrors,
  FORMAT_LABEL,
  REPORT_CATEGORY,
  REPORT_CONTENTS,
  reportQuery,
  STATUS_OPTIONS,
  type ReportCategory,
  type ReportErrorKind,
} from '@/reports/reports'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import FormField from '@/components/common/FormField.vue'
import LoadingState from '@/components/common/LoadingState.vue'

/**
 * 8B — Reportes y exportaciones del torneo. El catálogo del servidor (8A) es la fuente de verdad:
 * qué reportes hay, si el rol puede exportarlos y qué filtros admite cada uno. Aquí solo se elige,
 * se filtra y se descarga; el archivo se genera al momento y no se guarda en ningún lado. El
 * servidor vuelve a validar permisos y filtros en cada descarga.
 */
const props = defineProps<{ id: string }>()
const { role } = useTournamentWorkspace(() => props.id)
const stats = useTournamentStats(() => props.id)
const { structure } = useTournamentStructure(() => props.id, !USE_MOCKS)
const toast = useToast()
const route = useRoute()
const router = useRouter()

const catalog = ref<ReportCatalog | null>(null)
const loading = ref(false)
const loadError = ref('')
const format = ref<ReportFormat>('pdf')
const filters = reactive(emptyFilters())
const busy = ref<ReportFormat | null>(null)
const failure = ref<{ kind: ReportErrorKind; message: string } | null>(null)
const done = ref('')
let controller: AbortController | null = null

async function load() {
  if (USE_MOCKS) return
  loading.value = true
  loadError.value = ''
  try {
    catalog.value = await reportService.catalog(props.id)
  } catch (e) {
    const status = e instanceof AxiosError ? (e.response?.status ?? null) : null
    loadError.value = status === 403 ? 'Tu rol en este torneo no permite consultar sus reportes.' : explainError(status, null).message
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })
onBeforeUnmount(() => controller?.abort())

/** Reporte elegido: vive en la URL (?reporte=…) para volver a él. */
const selectedId = computed<ReportId>(() => {
  const q = String(route.query.reporte ?? '')
  return (catalog.value?.reports.some((r) => r.id === q) ? q : (catalog.value?.reports.find((r) => r.allowed)?.id ?? 'standings')) as ReportId
})
const selected = computed(() => catalog.value?.reports.find((r) => r.id === selectedId.value) ?? null)
function select(id: ReportId) {
  router.replace({ query: { ...route.query, reporte: id } })
}
/** En pantallas angostas el panel queda abajo: al tocar un reporte (no con flechas del teclado) se baja a él. */
const panel = ref<HTMLElement | null>(null)
async function revealPanel(e: MouseEvent) {
  if (e.detail === 0 || !window.matchMedia('(max-width: 1023px)').matches) return
  await nextTick()
  panel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
watch(selectedId, () => {
  failure.value = null
  done.value = ''
})

const ICON: Record<ReportId, typeof FileText> = { standings: ListOrdered, matches: CalendarDays, players: Award, rosters: Users, discipline: Gavel, finance: Wallet, summary: FileText }
const CATEGORY_STYLE: Record<ReportCategory, string> = {
  sports: 'bg-pitch-50 text-pitch-800 ring-pitch-200',
  admin: 'bg-sky-50 text-sky-800 ring-sky-200',
  finance: 'bg-amber-50 text-amber-800 ring-amber-200',
}

// ─── Opciones de los filtros (datos que el panel ya tiene) ────────────────────
const phases = computed(() => {
  const list = structure.value?.phases ?? []
  const label = (type: string) => (type === 'groups' ? 'Fase de grupos' : type === 'knockout' ? 'Eliminatoria' : list.length > 1 ? 'Fase regular' : 'Liga')
  return list.map((p) => ({ value: String(p.index), label: label(p.type) }))
})
const groups = computed(() => [...new Set((structure.value?.phases ?? []).flatMap((p) => (p.type === 'groups' ? p.groups.map((g) => g.key) : [])))])
const rounds = computed(() => stats.roundViews.value.map((r) => ({ value: String(r.number), label: r.label })))
const teams = computed(() => [...stats.teams.value].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((t) => ({ value: t.id, label: t.name })))

/** Un filtro se muestra si el reporte lo admite y hay algo que elegir (una sola fase no es elección). */
function shows(key: (typeof FILTER_KEYS)[number]) {
  if (!selected.value?.filters.includes(key)) return false
  if (key === 'phase') return phases.value.length > 1
  if (key === 'group') return groups.value.length > 0
  return true
}
const FILTER_KEYS = ['phase', 'group', 'round', 'teamId', 'from', 'to', 'status', 'includeInactive'] as const
const visibleFilters = computed(() => FILTER_KEYS.filter(shows))
const errors = computed(() => (selected.value ? filterErrors(selected.value, filters) : {}))
const hasErrors = computed(() => Object.keys(errors.value).length > 0)
const applied = computed(() => (selected.value ? activeFilters(selected.value, filters) : 0))
function reset() {
  Object.assign(filters, emptyFilters())
  failure.value = null
}

/** Aviso cuando el torneo aún no tiene lo que el reporte resume (el archivo saldrá vacío). */
const emptyHint = computed(() => {
  const id = selectedId.value
  const matches = stats.matches.value
  if ((id === 'standings' || id === 'rosters') && !stats.teams.value.length) return 'Aún no hay equipos inscritos: el archivo saldrá sin datos.'
  if (id === 'matches' && !matches.length) return 'Aún no hay partidos en el calendario: el archivo saldrá sin partidos.'
  if (id === 'players' && !matches.some((m) => m.status === 'finished')) return 'Aún no hay partidos finalizados: el archivo saldrá sin estadísticas.'
  return ''
})

/** Resumen en palabras de lo que se va a descargar. */
const summaryText = computed(() => {
  const r = selected.value
  if (!r) return ''
  const parts: string[] = []
  const pick = <T extends { value: string; label: string }>(list: T[], v: string) => list.find((x) => x.value === v)?.label
  for (const key of visibleFilters.value) {
    if (key === 'phase' && filters.phase) parts.push(pick(phases.value, filters.phase) ?? '')
    if (key === 'group' && filters.group) parts.push(`Grupo ${filters.group}`)
    if (key === 'round' && filters.round) parts.push(pick(rounds.value, filters.round) ?? '')
    if (key === 'teamId' && filters.teamId) parts.push(pick(teams.value, filters.teamId) ?? '')
    if (key === 'from' && filters.from) parts.push(`desde ${filters.from}`)
    if (key === 'to' && filters.to) parts.push(`hasta ${filters.to}`)
    if (key === 'status' && filters.status.length) parts.push(STATUS_OPTIONS.filter((s) => filters.status.includes(s.value)).map((s) => s.label).join(', '))
    if (key === 'includeInactive' && filters.includeInactive) parts.push('con bajas')
  }
  return `${r.title} en ${FORMAT_LABEL[format.value].label}${parts.length ? ` · ${parts.filter(Boolean).join(' · ')}` : ' · todo el torneo'}`
})

async function download(fmt: ReportFormat = format.value) {
  const r = selected.value
  if (!r || !r.allowed || busy.value || hasErrors.value) return
  format.value = fmt
  busy.value = fmt
  failure.value = null
  done.value = ''
  controller = new AbortController()
  try {
    const name = await reportService.download(props.id, r.id, reportQuery(r, fmt, filters), controller.signal)
    done.value = name
    toast.success('Reporte descargado')
  } catch (e) {
    if (e instanceof AxiosError && e.code === AxiosError.ERR_CANCELED) return
    failure.value = e instanceof ReportDownloadError ? { kind: e.kind, message: e.message } : explainError(500, null)
  } finally {
    busy.value = null
    controller = null
  }
}
</script>

<template>
  <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${REPORTS_REQUIRE_SERVER}.`" class="card" />
  <LoadingState v-else-if="loading && !catalog" />
  <ErrorState v-else-if="loadError && !catalog" :message="loadError" @retry="load" />
  <section v-else-if="catalog" aria-labelledby="reports-title" class="space-y-5">
    <div>
      <h2 id="reports-title" class="text-xl font-bold">Reportes y exportaciones</h2>
      <p class="mt-1 max-w-2xl text-sm text-zinc-600">Descarga documentos del torneo en PDF, Excel o CSV. Se generan al momento con la información actual y no se guarda ninguna copia.</p>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <!-- Catálogo -->
      <fieldset class="min-w-0">
        <legend class="mb-2 text-sm font-medium text-zinc-700">1. Elige un reporte</legend>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            v-for="r in catalog.reports"
            :key="r.id"
            class="relative flex min-w-0 cursor-pointer gap-3 rounded-2xl border bg-white p-3 transition has-[:checked]:border-pitch-900 has-[:checked]:ring-1 has-[:checked]:ring-pitch-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
            :class="!r.allowed && 'bg-zinc-50'"
            :data-report="r.id"
            @click="revealPanel"
          >
            <input type="radio" name="report" class="sr-only" :value="r.id" :checked="r.id === selectedId" :aria-describedby="`report-${r.id}-desc`" @change="select(r.id)" />
            <span class="grid size-10 shrink-0 place-items-center rounded-xl ring-1" :class="CATEGORY_STYLE[REPORT_CATEGORY[r.id]]" aria-hidden="true">
              <component :is="ICON[r.id]" class="size-5" />
            </span>
            <span class="min-w-0">
              <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-semibold text-zinc-900" :class="!r.allowed && 'text-zinc-500'">{{ r.title }}</span>
                <Lock v-if="!r.allowed" class="size-3.5 text-zinc-400" aria-label="Sin permiso" />
              </span>
              <span :id="`report-${r.id}-desc`" class="mt-0.5 block text-xs text-zinc-500">{{ r.description }}</span>
              <span class="mt-1.5 flex flex-wrap gap-1.5">
                <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1" :class="CATEGORY_STYLE[REPORT_CATEGORY[r.id]]">{{ CATEGORY_LABEL[REPORT_CATEGORY[r.id]] }}</span>
                <span v-if="r.sensitive" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                  <ShieldAlert class="size-3" aria-hidden="true" /> Información sensible
                </span>
                <span v-if="!r.allowed" class="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200">Sin permiso</span>
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <!-- Configuración y descarga -->
      <div v-if="selected" ref="panel" class="min-w-0 scroll-mt-20 lg:sticky lg:top-4 lg:self-start">
        <div class="card space-y-4 p-4" aria-live="polite">
          <div>
            <h3 class="font-bold text-zinc-900">{{ selected.title }}</h3>
            <p class="mt-1 text-sm text-zinc-600">{{ REPORT_CONTENTS[selected.id] }}</p>
          </div>

          <p v-if="!selected.allowed" class="flex gap-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700" role="note">
            <Lock class="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <span>
              Tu rol<template v-if="role"> ({{ ROLE_LABEL[role] }})</template> no permite descargar este reporte porque contiene información
              {{ REPORT_CATEGORY[selected.id] === 'finance' ? 'financiera' : 'administrativa' }} del torneo. Si lo necesitas, pídeselo al propietario del torneo.
            </span>
          </p>

          <template v-else>
            <p v-if="selected.sensitive" class="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="note">
              <ShieldAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>Contiene información administrativa sensible. Compártelo solo con quien corresponda; la descarga queda registrada.</span>
            </p>

            <!-- Filtros -->
            <fieldset v-if="visibleFilters.length" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <legend class="text-sm font-medium text-zinc-700">2. Filtros <span class="font-normal text-zinc-500">(opcionales)</span></legend>
                <button v-if="applied || filters.status.length" type="button" class="inline-flex items-center gap-1 text-xs font-semibold text-pitch-700 hover:text-pitch-900" @click="reset">
                  <RotateCcw class="size-3.5" aria-hidden="true" /> Restablecer
                </button>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <FormField v-if="visibleFilters.includes('phase')" id="report-phase" :label="FILTER_LABEL.phase">
                  <select id="report-phase" v-model="filters.phase" class="input">
                    <option value="">Todas</option>
                    <option v-for="p in phases" :key="p.value" :value="p.value">{{ p.label }}</option>
                  </select>
                </FormField>
                <FormField v-if="visibleFilters.includes('group')" id="report-group" :label="FILTER_LABEL.group">
                  <select id="report-group" v-model="filters.group" class="input">
                    <option value="">Todos</option>
                    <option v-for="g in groups" :key="g" :value="g">Grupo {{ g }}</option>
                  </select>
                </FormField>
                <FormField v-if="visibleFilters.includes('round')" id="report-round" :label="FILTER_LABEL.round">
                  <select id="report-round" v-model="filters.round" class="input">
                    <option value="">Todas</option>
                    <option v-for="r in rounds" :key="r.value" :value="r.value">{{ r.label }}</option>
                  </select>
                </FormField>
                <FormField v-if="visibleFilters.includes('teamId')" id="report-team" :label="FILTER_LABEL.teamId">
                  <select id="report-team" v-model="filters.teamId" class="input">
                    <option value="">Todos los equipos</option>
                    <option v-for="t in teams" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </FormField>
                <FormField v-if="visibleFilters.includes('from')" id="report-from" :label="FILTER_LABEL.from">
                  <input id="report-from" v-model="filters.from" type="date" class="input" />
                </FormField>
                <FormField v-if="visibleFilters.includes('to')" id="report-to" :label="FILTER_LABEL.to" :error="errors.to">
                  <input id="report-to" v-model="filters.to" type="date" class="input" :aria-invalid="!!errors.to" :aria-describedby="errors.to ? 'report-to-error' : undefined" />
                </FormField>
              </div>
              <p v-if="selected.id === 'matches' && (filters.from || filters.to)" class="text-xs text-zinc-500">El periodo no incluye pospuestos ni partidos por programar: su fecha es solo de referencia.</p>
              <p v-if="selected.id === 'finance' && (filters.from || filters.to)" class="text-xs text-zinc-500">El periodo aplica a los movimientos; los saldos son siempre los actuales.</p>
              <fieldset v-if="visibleFilters.includes('status')">
                <legend class="mb-1.5 text-sm font-medium text-zinc-700">{{ FILTER_LABEL.status }} <span class="font-normal text-zinc-500">(todos si no eliges)</span></legend>
                <div class="flex flex-wrap gap-1.5">
                  <label
                    v-for="s in STATUS_OPTIONS"
                    :key="s.value"
                    class="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold text-zinc-700 transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-900 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
                  >
                    <input v-model="filters.status" type="checkbox" class="sr-only" :value="s.value" />
                    {{ s.label }}
                  </label>
                </div>
              </fieldset>
              <label v-if="visibleFilters.includes('includeInactive')" class="flex items-center gap-2 text-sm text-zinc-700">
                <input v-model="filters.includeInactive" type="checkbox" class="size-4 rounded border-zinc-300 text-pitch-700" />
                Incluir jugadores dados de baja
              </label>
            </fieldset>

            <!-- Formato -->
            <fieldset>
              <legend class="mb-2 text-sm font-medium text-zinc-700">{{ visibleFilters.length ? '3' : '2' }}. Formato</legend>
              <div class="grid grid-cols-3 gap-2">
                <label
                  v-for="(f, key) in FORMAT_LABEL"
                  :key="key"
                  class="flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border p-2.5 text-center transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
                >
                  <input v-model="format" type="radio" name="report-format" class="sr-only" :value="key" />
                  <component :is="key === 'pdf' ? FileText : FileSpreadsheet" class="size-5 text-zinc-600" aria-hidden="true" />
                  <span class="text-sm font-semibold text-zinc-900">{{ f.label }}</span>
                  <span class="text-[11px] leading-tight text-zinc-500">{{ f.hint }}</span>
                </label>
              </div>
            </fieldset>

            <p v-if="emptyHint" class="flex gap-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600" role="note">
              <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {{ emptyHint }}
            </p>

            <div class="space-y-2 border-t border-zinc-100 pt-4">
              <p class="text-xs text-zinc-500" data-testid="report-summary">{{ summaryText }}</p>
              <AppButton class="w-full" :loading="busy !== null" :disabled="busy !== null || hasErrors" @click="download()">
                <Download class="size-4" aria-hidden="true" /> {{ busy ? 'Generando…' : `Descargar ${FORMAT_LABEL[format].label}` }}
              </AppButton>
              <p v-if="busy" class="text-center text-xs text-zinc-500" role="status">Generando el archivo; puede tardar unos segundos.</p>
              <p v-else-if="done" class="text-center text-xs text-pitch-700" role="status">Listo: {{ done }}</p>
            </div>

            <div v-if="failure" class="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
              <p>{{ failure.message }}</p>
              <div v-if="failure.kind === 'pdf_limit'" class="flex flex-wrap gap-2">
                <AppButton size="sm" variant="secondary" @click="download('xlsx')"><FileSpreadsheet class="size-4" aria-hidden="true" /> Descargar en Excel</AppButton>
                <AppButton size="sm" variant="secondary" @click="download('csv')"><FileSpreadsheet class="size-4" aria-hidden="true" /> Descargar en CSV</AppButton>
              </div>
              <AppButton v-else-if="failure.kind === 'busy' || failure.kind === 'network' || failure.kind === 'server'" size="sm" variant="secondary" @click="download()">Reintentar</AppButton>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
