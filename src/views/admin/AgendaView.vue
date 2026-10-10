<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, ChevronLeft, ChevronRight, Server } from 'lucide-vue-next'
import type { AgendaItem, AgendaOptions, AgendaPage, Match, MatchStatus, TournamentPermission } from '@/types'
import { agendaService, AGENDA_REQUIRES_SERVER, getErrorMessage, USE_MOCKS } from '@/services'
import { roundLabel, useMatchesStore } from '@/stores'
import { useAdminData } from '@/composables/useLeagueData'
import { MATCH_STATUS } from '@/utils/labels'
import { formatDate, toISODate } from '@/utils/format'
import PageHeader from '@/components/common/PageHeader.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import AdminMatchRow from '@/components/admin/AdminMatchRow.vue'
import MatchEditorDialog from '@/components/admin/workspace/MatchEditorDialog.vue'
import IncidentsDialog from '@/components/admin/incidents/IncidentsDialog.vue'
import RefereeAssignmentDialog from '@/components/admin/referees/RefereeAssignmentDialog.vue'
import MatchHistoryDialog from '@/components/admin/history/MatchHistoryDialog.vue'

/**
 * Agenda global (2C-3): partidos de todos mis torneos y colaboraciones activas. El servidor filtra,
 * ordena y pagina; cada fila usa los permisos de SU torneo (puedo ser propietario en uno y
 * anotador en otro). Las acciones abren los mismos diálogos que el Calendario del torneo.
 */
const route = useRoute()
const router = useRouter()
const matches = useMatchesStore()
const { loading: dataLoading } = useAdminData()

const STATUSES: MatchStatus[] = ['scheduled', 'live', 'suspended', 'postponed', 'finished', 'cancelled']
const q = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '')
const filters = reactive({
  from: route.query.from === undefined ? toISODate(new Date()) : q('from'),
  to: q('to'),
  tournamentId: q('tournament'),
  status: q('status') as MatchStatus | '',
  /** `v:<id>` = toda la sede; `f:<id>` = una cancha. */
  place: q('place'),
  refereeId: q('referee'),
  includeFinished: q('finished') === '1',
})
const page = ref(Number(route.query.page) || 1)

const options = ref<AgendaOptions | null>(null)
const result = ref<AgendaPage | null>(null)
const loading = ref(false)
const error = ref('')

async function loadOptions() {
  try {
    options.value = await agendaService.options(filters.includeFinished)
  } catch {
    options.value = { tournaments: [], venues: [], referees: [] }
  }
}
let seq = 0
async function load() {
  if (USE_MOCKS) return
  const mine = ++seq
  loading.value = true
  error.value = ''
  try {
    const r = await agendaService.list({
      from: filters.from || undefined,
      to: filters.to || undefined,
      tournamentId: filters.tournamentId || undefined,
      status: filters.status ? [filters.status] : undefined,
      venueId: filters.place.startsWith('v:') ? filters.place.slice(2) : undefined,
      fieldId: filters.place.startsWith('f:') ? filters.place.slice(2) : undefined,
      refereeId: filters.refereeId || undefined,
      includeFinished: filters.includeFinished || undefined,
      page: page.value,
      limit: 30,
    })
    if (mine === seq) result.value = r
  } catch (e) {
    if (mine === seq) error.value = getErrorMessage(e)
  } finally {
    if (mine === seq) loading.value = false
  }
}
onMounted(() => {
  if (USE_MOCKS) return
  void loadOptions()
  void load()
})
watch(
  () => ({ ...filters }),
  (next, prev) => {
    if (next.includeFinished !== prev.includeFinished) void loadOptions()
    page.value = 1
    void load()
  },
)
watch(page, () => load())
// Los filtros viajan en la URL (se pueden compartir o volver con "atrás").
watch([() => ({ ...filters }), page], ([f, p]) => {
  router.replace({
    query: {
      from: f.from,
      to: f.to || undefined,
      tournament: f.tournamentId || undefined,
      status: f.status || undefined,
      place: f.place || undefined,
      referee: f.refereeId || undefined,
      finished: f.includeFinished ? '1' : undefined,
      page: p > 1 ? String(p) : undefined,
    },
  })
})
function clear() {
  Object.assign(filters, { from: toISODate(new Date()), to: '', tournamentId: '', status: '', place: '', refereeId: '', includeFinished: false })
}

// ─── Permisos por torneo (los manda el servidor con la página) ───────────────
const access = computed(() => new Map((result.value?.tournaments ?? options.value?.tournaments ?? []).map((t) => [t.id, t])))
const can = (tournamentId: string, p: TournamentPermission) => !!access.value.get(tournamentId)?.permissions.includes(p)
const finished = (item: AgendaItem) => item.tournament.status === 'finished'

/** Días con sus partidos, en el orden del servidor. */
const days = computed(() => {
  const out: { date: string; items: AgendaItem[] }[] = []
  for (const item of result.value?.items ?? []) {
    const last = out.at(-1)
    if (last?.date === item.match.date) last.items.push(item)
    else out.push({ date: item.match.date, items: [item] })
  }
  return out
})
function context(item: AgendaItem) {
  const stage = item.match.stage
  const where = stage?.group ? ` · Grupo ${stage.group}` : stage?.tie ? ' · Eliminatoria' : ''
  return `${item.tournament.name} · ${roundLabel(item.match.round, item.roundName)}${where}`
}
/** El partido vivo del store (los diálogos lo actualizan ahí); si no está, el de la agenda. */
const live = (item: AgendaItem): Match => matches.get(item.match.id) ?? item.match
const title = (item: AgendaItem) => `${item.homeTeam ?? 'Local'} vs ${item.awayTeam ?? 'Visitante'}`

// ─── Acciones: los mismos diálogos del Calendario ────────────────────────────
const editing = ref<{ item: AgendaItem; status?: MatchStatus } | null>(null)
const refereesOf = ref<AgendaItem | null>(null)
const incidentsOf = ref<AgendaItem | null>(null)
const historyOf = ref<AgendaItem | null>(null)
function decide(status: MatchStatus) {
  const item = incidentsOf.value
  incidentsOf.value = null
  if (item) editing.value = { item, status }
}
/** Tras cerrar un diálogo que pudo cambiar el partido, la página se vuelve a pedir. */
function closeAndReload(clearFn: () => void) {
  clearFn()
  void load()
}
</script>

<template>
  <div>
    <PageHeader eyebrow="Panel" title="Agenda" subtitle="Los partidos de todos tus torneos y de los torneos donde colaboras, en orden cronológico." />

    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${AGENDA_REQUIRES_SERVER}.`" class="card" />
    <template v-else>
      <!-- Filtros (combinables; los aplica el servidor) -->
      <section aria-label="Filtros" class="card mb-5 grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-7">
        <FormField id="ag-from" label="Desde">
          <input id="ag-from" v-model="filters.from" type="date" class="input" />
        </FormField>
        <FormField id="ag-to" label="Hasta">
          <input id="ag-to" v-model="filters.to" type="date" class="input" :min="filters.from || undefined" />
        </FormField>
        <FormField id="ag-tournament" label="Torneo" class="col-span-2 md:col-span-1">
          <select id="ag-tournament" v-model="filters.tournamentId" class="input">
            <option value="">Todos</option>
            <option v-for="t in options?.tournaments ?? []" :key="t.id" :value="t.id">{{ t.name }}{{ t.status === 'finished' ? ' (finalizado)' : '' }}</option>
          </select>
        </FormField>
        <FormField id="ag-status" label="Estado">
          <select id="ag-status" v-model="filters.status" class="input">
            <option value="">Todos</option>
            <option v-for="s in STATUSES" :key="s" :value="s">{{ MATCH_STATUS[s].label }}</option>
          </select>
        </FormField>
        <FormField v-if="options?.venues.length" id="ag-place" label="Sede o cancha">
          <select id="ag-place" v-model="filters.place" class="input">
            <option value="">Todas</option>
            <optgroup v-for="v in options.venues" :key="v.id" :label="v.name">
              <option :value="`v:${v.id}`">Toda la sede</option>
              <option v-for="f in v.fields" :key="f.id" :value="`f:${f.id}`">{{ f.name }}</option>
            </optgroup>
          </select>
        </FormField>
        <FormField v-if="options?.referees.length" id="ag-referee" label="Árbitro">
          <select id="ag-referee" v-model="filters.refereeId" class="input">
            <option value="">Todos</option>
            <option v-for="r in options.referees" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </FormField>
        <div class="col-span-2 flex flex-wrap items-end justify-between gap-2 md:col-span-4 xl:col-span-1 xl:flex-col xl:items-start">
          <label class="flex items-center gap-2 text-sm">
            <input v-model="filters.includeFinished" type="checkbox" class="size-4 accent-pitch-700" /> Incluir finalizados
          </label>
          <AppButton variant="ghost" size="sm" @click="clear">Limpiar filtros</AppButton>
        </div>
      </section>

      <LoadingState v-if="(loading && !result) || dataLoading" />
      <ErrorState v-else-if="error" :message="error" @retry="load" />
      <EmptyState
        v-else-if="!result?.items.length"
        :icon="CalendarDays"
        title="Sin partidos"
        :description="result?.tournaments.length ? 'No hay partidos con estos filtros.' : 'Todavía no organizas ni colaboras en torneos en curso.'"
        class="card"
      />
      <div v-else class="space-y-5" :class="loading && 'opacity-60'" :aria-busy="loading">
        <p class="text-sm text-zinc-500">{{ result.meta.total }} partido{{ result.meta.total === 1 ? '' : 's' }}</p>
        <section v-for="d in days" :key="d.date" :aria-labelledby="`day-${d.date}`">
          <h2 :id="`day-${d.date}`" class="mb-2 font-display text-lg font-bold uppercase">{{ formatDate(d.date, 'long') }}</h2>
          <ul class="card divide-y divide-zinc-100">
            <AdminMatchRow
              v-for="item in d.items"
              :key="item.match.id"
              :match="live(item)"
              :context="context(item)"
              :read-only="finished(item)"
              :can-schedule="can(item.tournament.id, 'SCHEDULE')"
              :can-assign="can(item.tournament.id, 'ASSIGNMENTS')"
              :can-capture="can(item.tournament.id, 'RESULTS')"
              :allow-postpone="true"
              @edit="editing = { item }"
              @postpone="editing = { item, status: 'postponed' }"
              @reschedule="editing = { item, status: 'scheduled' }"
              @referees="refereesOf = item"
              @incidents="incidentsOf = item"
              @history="historyOf = item"
            />
          </ul>
        </section>
        <nav v-if="result.meta.totalPages > 1" aria-label="Páginas" class="flex items-center justify-center gap-3">
          <AppButton variant="secondary" size="sm" :disabled="page <= 1 || loading" @click="page--"><ChevronLeft class="size-4" aria-hidden="true" /> Anteriores</AppButton>
          <span class="text-sm text-zinc-600">Página {{ result.meta.page }} de {{ result.meta.totalPages }}</span>
          <AppButton variant="secondary" size="sm" :disabled="page >= result.meta.totalPages || loading" @click="page++">Siguientes <ChevronRight class="size-4" aria-hidden="true" /></AppButton>
        </nav>
      </div>
    </template>

    <MatchEditorDialog
      :open="!!editing"
      :tournament-id="editing?.item.tournament.id ?? ''"
      :match="editing ? live(editing.item) : null"
      :default-round="editing?.item.match.round ?? 1"
      :default-status="editing?.status"
      @close="closeAndReload(() => (editing = null))"
    />
    <IncidentsDialog
      :open="!!incidentsOf"
      :match="incidentsOf ? live(incidentsOf) : null"
      :can-manage="!!incidentsOf && can(incidentsOf.tournament.id, 'INCIDENTS')"
      :can-schedule="!!incidentsOf && can(incidentsOf.tournament.id, 'SCHEDULE')"
      :can-capture="!!incidentsOf && can(incidentsOf.tournament.id, 'RESULTS')"
      :read-only="!!incidentsOf && finished(incidentsOf)"
      @close="closeAndReload(() => (incidentsOf = null))"
      @decide="decide"
    />
    <RefereeAssignmentDialog
      :open="!!refereesOf"
      :match="refereesOf ? live(refereesOf) : null"
      :read-only="!refereesOf || finished(refereesOf) || !can(refereesOf.tournament.id, 'ASSIGNMENTS')"
      :can-correct="!!refereesOf && can(refereesOf.tournament.id, 'REFEREE_CORRECTIONS')"
      @close="closeAndReload(() => (refereesOf = null))"
      @changed="(r) => refereesOf && matches.patch(refereesOf.match.id, { referees: r.referees, centralReferee: r.centralReferee })"
    />
    <MatchHistoryDialog :open="!!historyOf" :match-id="historyOf?.match.id ?? null" :title="historyOf ? title(historyOf) : 'Historial'" @close="historyOf = null" />
  </div>
</template>
