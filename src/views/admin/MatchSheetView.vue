<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, ArrowLeft, ArrowLeftRight, ClipboardEdit, FileText, Lock, LockOpen, Pencil, Server, ShieldCheck } from 'lucide-vue-next'
import type { MatchSheet, MatchStatus, SheetTeamSide } from '@/types'
import { getErrorMessage, sheetService, SHEET_REQUIRES_SERVER, USE_MOCKS } from '@/services'
import { roundLabel, useMatchesStore } from '@/stores'
import { useAdminData } from '@/composables/useLeagueData'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { describeEntry } from '@/utils/matchLog'
import { INCIDENT_TYPE, MATCH_STATUS, REFEREE_ROLE, ROLE_LABEL } from '@/utils/labels'
import { formatDate, toISODate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import IncidentsDialog from '@/components/admin/incidents/IncidentsDialog.vue'
import SheetLineupEditor from '@/components/admin/sheet/SheetLineupEditor.vue'
import EvidenceGallery from '@/components/admin/sheet/EvidenceGallery.vue'

/**
 * Ficha técnica digital del partido (2D): un solo documento con lo que ya existe (partido,
 * resultado, estadísticas, árbitros, incidencias, historial) más alineaciones, sustituciones,
 * observaciones y fotografías. Cerrarla congela la información deportiva; reabrirla pide motivo.
 * Las acciones dependen del rol en el torneo; el servidor valida todo.
 */
const props = defineProps<{ id: string }>()
const toast = useToast()
const { confirm } = useConfirm()
const matches = useMatchesStore()
const { loading: dataLoading } = useAdminData()

const sheet = ref<MatchSheet | null>(null)
const loading = ref(true)
const error = ref('')
async function load() {
  if (USE_MOCKS) return
  error.value = ''
  try {
    sheet.value = await sheetService.get(props.id)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, () => ((loading.value = true), load()), { immediate: true })
/** Tras una acción: la ficha nueva y el partido del store (Calendario y Agenda lo usan). */
async function apply(next: MatchSheet) {
  sheet.value = next
  await matches.refresh(props.id).catch(() => {})
}

const can = (p: string) => !!sheet.value?.permissions.includes(p as never)
const finishedTournament = computed(() => sheet.value?.tournament.status === 'FINISHED')
const closed = computed(() => !!sheet.value?.closure.closed)
/** Información deportiva editable: torneo no finalizado y ficha abierta. */
const editable = computed(() => !finishedTournament.value && !closed.value)
const status = computed(() => (sheet.value ? (sheet.value.match.status.toLowerCase() as MatchStatus) : 'scheduled'))
const title = computed(() => (sheet.value ? `${sheet.value.teams[0].team.name} vs ${sheet.value.teams[1].team.name}` : 'Ficha técnica'))
const context = computed(() => {
  const m = sheet.value?.match
  if (!m) return ''
  const where = m.stage?.group ? ` · Grupo ${m.stage.group}` : m.stage?.tie ? ' · Eliminatoria' : ''
  return `${sheet.value!.tournament.name} · ${roundLabel(m.round, m.roundName)}${where}`
})
const when = (iso: string) => {
  const d = new Date(iso)
  return `${formatDate(toISODate(d))} ${d.toTimeString().slice(0, 5)}`
}
const roleLabel = (r: string | null) => (r ? (ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r) : '')

// ─── Alineaciones ───────────────────────────────────────────────────────────
const activeSide = ref<'home' | 'away'>('home')
const editing = ref<'home' | 'away' | null>(null)
function groups(t: SheetTeamSide) {
  const players = t.lineup?.players ?? []
  return [
    { key: 'starters', label: 'Titulares', list: players.filter((p) => p.starter) },
    { key: 'entered', label: 'Suplentes que ingresaron', list: players.filter((p) => !p.starter && p.participated) },
    { key: 'unused', label: 'Suplentes sin participar', list: players.filter((p) => !p.starter && !p.participated) },
  ]
}
const events = (t: SheetTeamSide) => t.stats.filter((s) => s.goals || s.assists || s.ownGoals || s.yellowCards || s.redCards)

// ─── Observaciones ──────────────────────────────────────────────────────────
const observations = ref('')
watch(sheet, (s) => (observations.value = s?.observations ?? ''), { immediate: true })
const savingObs = ref(false)
async function saveObservations() {
  savingObs.value = true
  try {
    await apply(await sheetService.saveObservations(props.id, observations.value.trim() || null))
    toast.success('Observaciones guardadas.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    savingObs.value = false
  }
}

// ─── Cierre y reapertura ────────────────────────────────────────────────────
const busy = ref(false)
const reopening = ref(false)
const reopenReason = ref('')
async function close() {
  const ok = await confirm({
    title: 'Cerrar la ficha técnica',
    message: 'Se congelan el resultado, las estadísticas, las alineaciones, los árbitros, las incidencias y las observaciones. Para corregir algo después habrá que reabrirla con un motivo.',
    confirmLabel: 'Cerrar ficha',
  })
  if (!ok) return
  busy.value = true
  try {
    await apply(await sheetService.close(props.id))
    toast.success('Ficha cerrada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}
async function reopen() {
  if (reopenReason.value.trim().length < 3) return toast.error('Indica el motivo para reabrirla.')
  busy.value = true
  try {
    await apply(await sheetService.reopen(props.id, reopenReason.value.trim()))
    reopening.value = false
    reopenReason.value = ''
    toast.success('Ficha reabierta. Queda registrado en el historial.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}

// ─── Incidencias (mismo diálogo del Calendario) e historial ─────────────────
const incidentsOpen = ref(false)
const storeMatch = computed(() => matches.get(props.id) ?? null)
const RELEVANT = new Set(['CREATED'])
const history = computed(() => (sheet.value ? sheet.value.history.entries.filter((e) => !RELEVANT.has(e.action)).map((e) => ({ e, ...describeEntry(e, sheet.value!.history.refs) })).reverse() : []))
</script>

<template>
  <div class="pb-16">
    <RouterLink v-if="sheet" :to="{ name: 'admin-tournament-schedule', params: { id: sheet.tournament.id } }" class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
      <ArrowLeft class="size-4" aria-hidden="true" /> Calendario · {{ sheet.tournament.name }}
    </RouterLink>

    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${SHEET_REQUIRES_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading || dataLoading" />
    <ErrorState v-else-if="error || !sheet" :message="error || 'No se pudo cargar la ficha'" @retry="load" />
    <div v-else class="space-y-5">
      <!-- Encabezado -->
      <header class="card space-y-3 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="flex items-center gap-1.5 text-xs font-semibold text-pitch-800"><FileText class="size-3.5" aria-hidden="true" /> Ficha técnica · {{ context }}</p>
            <h1 class="mt-1 font-display text-2xl font-bold uppercase">{{ title }}</h1>
            <p class="text-sm text-zinc-500">{{ formatDate(sheet.match.date, 'long') }} · {{ sheet.match.time }} h<template v-if="sheet.match.venue"> · {{ sheet.match.venue }}</template></p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <p class="tabular font-display text-4xl font-extrabold">{{ sheet.match.homeScore ?? '–' }} – {{ sheet.match.awayScore ?? '–' }}</p>
            <div class="flex flex-wrap justify-end gap-1.5">
              <StatusBadge v-bind="MATCH_STATUS[status]" :pulse="status === 'live'" />
              <StatusBadge :label="closed ? 'Ficha cerrada' : 'Ficha abierta'" :tone="closed ? 'green' : 'neutral'" />
            </div>
          </div>
        </div>
        <p v-if="sheet.match.penalties" class="text-xs text-zinc-500">Penales {{ sheet.match.penalties.home }}–{{ sheet.match.penalties.away }}<template v-if="sheet.match.extraTime"> · tras tiempos extra</template></p>
        <p v-if="sheet.closure.closed" class="flex items-center gap-1.5 rounded-xl bg-pitch-50 px-3 py-2 text-sm text-pitch-900" role="status">
          <Lock class="size-4 shrink-0" aria-hidden="true" /> Cerrada por {{ sheet.closure.by ?? 'alguien' }}<template v-if="sheet.closure.role"> ({{ roleLabel(sheet.closure.role) }})</template> el {{ when(sheet.closure.at) }} con {{ sheet.closure.homeScore }}–{{ sheet.closure.awayScore }}. La información deportiva está congelada.
        </p>
        <p v-else-if="finishedTournament" class="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900" role="status">Torneo finalizado: la ficha es de solo lectura.</p>
        <!-- Acciones -->
        <div v-if="!finishedTournament" class="flex flex-wrap gap-2">
          <AppButton v-if="can('RESULTS') && editable && status !== 'cancelled'" variant="secondary" size="sm" :to="{ name: 'admin-match-capture', params: { id } }">
            <ClipboardEdit class="size-4" aria-hidden="true" /> Estadísticas y resultado
          </AppButton>
          <AppButton v-if="can('SHEET_CLOSE') && !closed && status === 'finished'" size="sm" :loading="busy" @click="close"><ShieldCheck class="size-4" aria-hidden="true" /> Cerrar ficha</AppButton>
          <AppButton v-if="can('SHEET_REOPEN') && closed && !reopening" variant="secondary" size="sm" @click="reopening = true"><LockOpen class="size-4" aria-hidden="true" /> Reabrir</AppButton>
        </div>
        <form v-if="reopening" class="flex flex-wrap items-end gap-2 rounded-xl bg-amber-50 p-3" @submit.prevent="reopen">
          <FormField id="reopen-reason" label="Motivo para reabrir" class="min-w-56 flex-1">
            <input id="reopen-reason" v-model="reopenReason" class="input" maxlength="300" placeholder="Ej. el marcador de la cédula no coincide" />
          </FormField>
          <AppButton variant="secondary" size="sm" @click="reopening = false">Cancelar</AppButton>
          <AppButton type="submit" size="sm" :loading="busy">Reabrir ficha</AppButton>
        </form>
      </header>

      <!-- Equipos: pestañas en móvil, dos columnas en pantallas grandes -->
      <div class="flex rounded-xl bg-zinc-100 p-1 xl:hidden" role="tablist" aria-label="Equipo">
        <button v-for="t in sheet.teams" :key="t.side" type="button" role="tab" :aria-selected="activeSide === t.side" class="flex-1 truncate rounded-lg px-3 py-1.5 text-sm font-semibold" :class="activeSide === t.side ? 'bg-white shadow-sm' : 'text-zinc-600'" @click="activeSide = t.side">
          {{ t.team.name }}
        </button>
      </div>
      <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section v-for="t in sheet.teams" :key="t.side" class="card space-y-4 p-4" :class="activeSide !== t.side && 'hidden xl:block'" :aria-label="`Alineación de ${t.team.name}`">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-lg font-bold">{{ t.team.name }} <span class="text-xs font-normal text-zinc-500">{{ t.side === 'home' ? 'Local' : 'Visitante' }}</span></h2>
            <AppButton v-if="can('RESULTS') && editable && status !== 'cancelled' && editing !== t.side" variant="ghost" size="sm" @click="editing = t.side">
              <Pencil class="size-4" aria-hidden="true" /> {{ t.lineup ? 'Editar' : 'Capturar alineación' }}
            </AppButton>
          </div>
          <SheetLineupEditor v-if="editing === t.side" :match-id="id" :tournament-id="sheet.tournament.id" :match-date="sheet.match.date" :side="t" :finished="status === 'finished'" @saved="(s) => ((editing = null), apply(s))" @cancel="editing = null" />
          <template v-else>
            <p v-if="t.consistency && !t.consistency.consistent && t.stats.length" class="flex gap-1.5 rounded-xl bg-amber-50 p-2 text-xs text-amber-900" role="alert">
              <AlertTriangle class="size-4 shrink-0" aria-hidden="true" /> La alineación y las estadísticas no coinciden<template v-if="t.consistency.missing.length">: participan sin figurar como jugados {{ t.consistency.missing.join(', ') }}</template><template v-if="t.consistency.extra.length">; jugados sin participar {{ t.consistency.extra.join(', ') }}</template>.
            </p>
            <p v-if="!t.lineup" class="text-sm text-zinc-500">Sin alineación capturada (opcional).</p>
            <div v-for="g in groups(t)" v-else :key="g.key">
              <template v-if="g.list.length">
                <h3 class="mb-1 text-xs font-semibold text-zinc-500 uppercase">{{ g.label }}</h3>
                <ul class="mb-3 divide-y divide-zinc-100 text-sm">
                  <li v-for="p in g.list" :key="p.playerId" class="flex items-center gap-2 py-1.5" :class="g.key === 'unused' && 'text-zinc-500'">
                    <span class="tabular w-7 text-right font-display font-bold">{{ p.jerseyNumber ?? '–' }}</span>
                    <span class="min-w-0 flex-1 truncate">{{ p.name }}</span>
                    <span v-if="p.captain" class="rounded bg-pitch-900 px-1.5 text-[10px] font-bold text-white" title="Capitán">C</span>
                    <span v-if="p.enteredAt !== null" class="text-xs text-pitch-700">↑ {{ p.enteredAt }}'</span>
                    <span v-if="p.leftAt !== null" class="text-xs text-red-700">↓ {{ p.leftAt }}'</span>
                  </li>
                </ul>
              </template>
            </div>
            <div v-if="t.lineup?.substitutions.length">
              <h3 class="mb-1 flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase"><ArrowLeftRight class="size-3.5" aria-hidden="true" /> Sustituciones</h3>
              <ul class="space-y-0.5 text-sm">
                <li v-for="(s, i) in t.lineup.substitutions" :key="i"><span class="tabular font-semibold">{{ s.minute }}'</span> sale {{ s.outName }} · entra {{ s.inName }}</li>
              </ul>
            </div>
            <div>
              <h3 class="mb-1 text-xs font-semibold text-zinc-500 uppercase">Goles, asistencias y tarjetas</h3>
              <ul v-if="events(t).length" class="space-y-0.5 text-sm">
                <li v-for="s in events(t)" :key="s.playerId" class="flex flex-wrap gap-x-2">
                  <span class="font-semibold">{{ s.jerseyNumber ?? '–' }} · {{ s.name }}</span>
                  <span v-if="s.goals">⚽ {{ s.goals }}</span>
                  <span v-if="s.ownGoals" class="text-zinc-500">a.g. {{ s.ownGoals }}</span>
                  <span v-if="s.assists" class="text-zinc-600">asist. {{ s.assists }}</span>
                  <span v-if="s.yellowCards" class="text-amber-700">🟨 {{ s.yellowCards }}</span>
                  <span v-if="s.redCards" class="text-red-700">🟥</span>
                </li>
              </ul>
              <p v-else class="text-sm text-zinc-500">{{ t.stats.length ? 'Sin goles ni tarjetas.' : 'Estadísticas sin capturar.' }}</p>
            </div>
          </template>
        </section>
      </div>

      <!-- Árbitros e incidencias -->
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section class="card p-4" aria-labelledby="sheet-refs">
          <h2 id="sheet-refs" class="mb-2 text-lg font-bold">Árbitros</h2>
          <ul v-if="sheet.referees.length" class="space-y-1 text-sm">
            <li v-for="r in sheet.referees" :key="r.id" :class="r.status !== 'ASSIGNED' && 'text-zinc-500'">
              <span class="inline-block w-28 text-xs font-semibold text-zinc-500 uppercase">{{ REFEREE_ROLE[r.role.toLowerCase() as keyof typeof REFEREE_ROLE] ?? r.role }}</span>
              {{ r.name }}
              <template v-if="r.status === 'ABSENT'"> · no se presentó<template v-if="r.absenceNote"> ({{ r.absenceNote }})</template></template>
              <template v-else-if="r.status === 'VOID'"> · anulado</template>
              <template v-else-if="r.status === 'RELEASED'"> · liberado al reprogramar</template>
              <template v-else-if="r.substituteFor"> · sustituto</template>
            </li>
          </ul>
          <p v-else class="text-sm text-zinc-500">Sin árbitros asignados.</p>
        </section>
        <section class="card p-4" aria-labelledby="sheet-inc">
          <div class="mb-2 flex items-center justify-between">
            <h2 id="sheet-inc" class="text-lg font-bold">Incidencias</h2>
            <AppButton v-if="storeMatch" variant="ghost" size="sm" @click="incidentsOpen = true">{{ can('INCIDENTS') && editable ? 'Gestionar' : 'Ver detalle' }}</AppButton>
          </div>
          <ul v-if="sheet.incidents.incidents.length" class="space-y-1 text-sm">
            <li v-for="i in sheet.incidents.incidents" :key="i.id" :class="i.status === 'VOID' && 'text-zinc-400 line-through'">
              <strong>{{ INCIDENT_TYPE[i.type] }}</strong> · {{ i.description }}
              <span v-if="i.resolution?.decision" class="text-xs text-zinc-500"> ({{ i.resolution.decision.toLowerCase() }})</span>
            </li>
          </ul>
          <p v-else class="text-sm text-zinc-500">Sin incidencias.</p>
        </section>
      </div>

      <!-- Observaciones -->
      <section class="card p-4" aria-labelledby="sheet-obs">
        <h2 id="sheet-obs" class="mb-2 text-lg font-bold">Observaciones</h2>
        <form v-if="can('RESULTS') && editable" class="space-y-2" @submit.prevent="saveObservations">
          <label for="obs" class="sr-only">Observaciones del partido</label>
          <textarea id="obs" v-model="observations" class="input min-h-24" maxlength="4000" placeholder="Lo que conste en la cédula: comportamiento, estado de la cancha, protestas…" />
          <div class="flex justify-end">
            <AppButton type="submit" size="sm" :loading="savingObs" :disabled="(observations.trim() || null) === sheet.observations">Guardar observaciones</AppButton>
          </div>
        </form>
        <p v-else class="text-sm whitespace-pre-line" :class="!sheet.observations && 'text-zinc-500'">{{ sheet.observations || 'Sin observaciones.' }}</p>
      </section>

      <!-- Fotografías -->
      <section class="card p-4" aria-labelledby="sheet-ev">
        <h2 id="sheet-ev" class="mb-2 text-lg font-bold">Fotografías de evidencia</h2>
        <EvidenceGallery
          :match-id="id"
          :evidence="sheet.evidence"
          :users="sheet.history.refs.users"
          :can-upload="can('EVIDENCE_UPLOAD') && !finishedTournament"
          :can-remove="can('EVIDENCE_REMOVE') && !finishedTournament"
          @changed="load"
        />
      </section>

      <!-- Historial -->
      <section class="card p-4" aria-labelledby="sheet-hist">
        <h2 id="sheet-hist" class="mb-2 text-lg font-bold">Historial de cambios y correcciones</h2>
        <ol v-if="history.length" class="space-y-2 text-sm">
          <li v-for="h in history" :key="h.e.id" class="border-l-2 border-zinc-200 pl-3">
            <p class="font-semibold text-zinc-900">{{ h.title }}</p>
            <p v-for="d in h.details" :key="d" class="text-xs text-zinc-600">{{ d }}</p>
            <p v-if="h.e.reason" class="text-xs text-zinc-700">Motivo: {{ h.e.reason }}</p>
            <p class="text-[11px] text-zinc-500">{{ h.by ?? 'Sistema' }}<template v-if="h.e.actorRole"> ({{ roleLabel(h.e.actorRole) }})</template> · {{ when(h.e.createdAt) }}</p>
          </li>
        </ol>
        <p v-else class="text-sm text-zinc-500">Sin cambios registrados.</p>
      </section>
    </div>

    <IncidentsDialog
      :open="incidentsOpen"
      :match="storeMatch"
      :can-manage="can('INCIDENTS')"
      :can-schedule="false"
      :can-capture="false"
      :read-only="!editable"
      @close="((incidentsOpen = false), load())"
    />
  </div>
</template>
