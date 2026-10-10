<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, Ban, CalendarClock, History, Pencil, Plus, RotateCcw, Save, Server, ShieldCheck, XCircle } from 'lucide-vue-next'
import type { DisciplineLogEntry, DisciplineOverview, Sanction, SanctionStatus } from '@/types'
import { DISCIPLINE_REQUIRES_SERVER, disciplineService, getErrorMessage, USE_MOCKS } from '@/services'
import { useRoundsStore } from '@/stores'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useToast } from '@/composables/useToast'
import { DISCIPLINE_ACTION, SANCTION_CAUSE, SANCTION_STATUS } from '@/utils/labels'
import { formatDate, plural, toISODate } from '@/utils/format'
import { fullName } from '@/utils/players'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import CardIcon from '@/components/players/CardIcon.vue'
import SanctionDialog, { type SanctionDialogMode } from '@/components/admin/discipline/SanctionDialog.vue'

/**
 * Disciplina del torneo (organizador): reglamento, sanciones automáticas y manuales, tarjetas
 * acumuladas, incidencias e historial. El servidor calcula las sanciones con las tarjetas y el
 * calendario actuales; aquí solo se representan y se registran decisiones con justificación.
 */
const props = defineProps<{ id: string }>()
const { readOnly: finished, can } = useTournamentWorkspace(() => props.id)
const rounds = useRoundsStore()
const toast = useToast()

const data = ref<DisciplineOverview | null>(null)
const log = ref<DisciplineLogEntry[]>([])
const historyRef = ref<string | null>(null)
const loading = ref(true)
const error = ref('')
const savingRules = ref(false)
const filter = ref<SanctionStatus | 'all'>('active')
const dialog = reactive<{ open: boolean; mode: SanctionDialogMode; sanction: Sanction | null }>({ open: false, mode: 'create', sanction: null })
// Finalizado o sin permiso de gestión (RBAC): se consulta, no se modifica.
const readOnly = computed(() => finished.value || !!data.value?.readOnly || !can('DISCIPLINE_MANAGE'))

const rules = reactive({ enabled: false, yellowsForSuspension: '' as string | number, accumulationMatches: 1, directRedMatches: 1, secondYellowMatches: 1, resetAccumulationOnPhaseChange: false, eligibility: 'warn' as 'warn' | 'block' })
function fillRules(o: DisciplineOverview) {
  Object.assign(rules, { ...o.rules, yellowsForSuspension: o.rules.yellowsForSuspension ?? '' })
}

async function loadHistory() {
  log.value = await disciplineService.history(props.id, historyRef.value ? { ref: historyRef.value } : {})
}
async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = ''
  try {
    data.value = await disciplineService.overview(props.id)
    fillRules(data.value)
    await loadHistory()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })
watch(historyRef, () => loadHistory().catch((e) => toast.error(getErrorMessage(e))))

async function applied(o: DisciplineOverview) {
  data.value = o
  fillRules(o)
  await loadHistory()
}

async function saveRules() {
  savingRules.value = true
  try {
    const yellows = String(rules.yellowsForSuspension).trim()
    await applied(
      await disciplineService.updateRules(props.id, {
        enabled: rules.enabled,
        yellowsForSuspension: yellows === '' ? null : Number(yellows),
        accumulationMatches: Number(rules.accumulationMatches),
        directRedMatches: Number(rules.directRedMatches),
        secondYellowMatches: Number(rules.secondYellowMatches),
        resetAccumulationOnPhaseChange: rules.resetAccumulationOnPhaseChange,
        eligibility: rules.eligibility,
      }),
    )
    toast.success('Reglamento guardado. Las sanciones se recalcularon.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    savingRules.value = false
  }
}

function open(mode: SanctionDialogMode, sanction: Sanction | null = null) {
  Object.assign(dialog, { open: true, mode, sanction })
}
function showHistory(ref: string | null) {
  historyRef.value = ref
  document.getElementById('discipline-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ─── Presentación ───────────────────────────────────────────────────────────
const FILTERS: { value: SanctionStatus | 'all'; label: string }[] = [
  { value: 'active', label: 'Activas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'served', label: 'Cumplidas' },
  { value: 'annulled', label: 'Anuladas' },
  { value: 'all', label: 'Todas' },
]
const counts = computed(() => {
  const c: Record<string, number> = { all: data.value?.sanctions.length ?? 0 }
  for (const s of data.value?.sanctions ?? []) c[s.status] = (c[s.status] ?? 0) + 1
  return c
})
const shown = computed(() => (data.value?.sanctions ?? []).filter((s) => filter.value === 'all' || s.status === filter.value))
const cardRows = computed(() =>
  [...(data.value?.players ?? [])]
    .filter((p) => p.yellows || p.directReds || p.secondYellows || p.unclassified || p.remaining)
    .sort((a, b) => Number(b.suspended) - Number(a.suspended) || b.remaining - a.remaining || b.towardNext - a.towardNext || b.yellows - a.yellows),
)

const playerName = (id: string | null) => {
  const p = id ? data.value?.refs.players[id] : undefined
  return p ? fullName(p) : 'Jugador'
}
const team = (id: string) => data.value?.refs.teams[id]
/** Jornada · fecha · rival (desde `teamId`) o los dos equipos si no lo juega (cambio de equipo). */
const matchLabel = (id: string | null, teamId?: string) => {
  const m = id ? data.value?.refs.matches[id] : undefined
  if (!m) return 'Partido eliminado'
  const plays = teamId === m.homeTeamId || teamId === m.awayTeamId
  const vs = plays ? `vs ${team(m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId)?.name ?? 'rival'}` : `${team(m.homeTeamId)?.name ?? 'Local'} vs ${team(m.awayTeamId)?.name ?? 'Visitante'}`
  return [rounds.labelOf(props.id, m.round), formatDate(m.date), vs].join(' · ')
}
const when = (iso: string) => formatDate(toISODate(new Date(iso)))
const ruleSummary = computed(() => {
  const r = data.value?.rules
  if (!r) return ''
  if (!r.enabled) return 'Sin sanciones automáticas. Las sanciones manuales y los avisos de alineación funcionan igual.'
  return [
    r.yellowsForSuspension ? `${r.yellowsForSuspension} amarillas: ${plural(r.accumulationMatches, 'partido', 'partidos')}` : 'Sin acumulación de amarillas',
    `roja directa: ${plural(r.directRedMatches, 'partido', 'partidos')}`,
    `doble amarilla: ${plural(r.secondYellowMatches, 'partido', 'partidos')}`,
    r.eligibility === 'block' ? 'no se permite alinear suspendidos' : 'se avisa al alinear suspendidos',
  ].join(' · ')
})
</script>

<template>
  <div>
    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${DISCIPLINE_REQUIRES_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <div v-else-if="data" class="space-y-8">
      <!-- Avisos -->
      <div v-if="data.unclassified.length" class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
        <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p>
            <strong>{{ plural(data.unclassified.length, 'expulsión sin clasificar', 'expulsiones sin clasificar') }}.</strong>
            Son capturas anteriores con roja o dos amarillas: no generan sanción hasta que indiques si fue roja directa o doble amarilla.
          </p>
          <ul class="mt-1 space-y-0.5">
            <li v-for="u in data.unclassified" :key="`${u.matchId}-${u.playerId}`">
              {{ playerName(u.playerId) }} · {{ matchLabel(u.matchId, u.teamId) }} ·
              <RouterLink :to="{ name: 'admin-match-capture', params: { id: u.matchId } }" class="link">Clasificar</RouterLink>
            </li>
          </ul>
        </div>
      </div>
      <div v-if="data.incidents.length" class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="status">
        <Ban class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p><strong>{{ plural(data.incidents.length, 'incidencia', 'incidencias') }}: jugaron estando suspendidos.</strong> Esos partidos no cuentan para cumplir la suspensión.</p>
          <ul class="mt-1 space-y-0.5">
            <li v-for="i in data.incidents" :key="`${i.ref}-${i.matchId}`">{{ playerName(i.playerId) }} · {{ matchLabel(i.matchId, i.teamId) }}</li>
          </ul>
        </div>
      </div>

      <div v-if="data.staleMatchIds.length" class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
        <CalendarClock class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p>
            <strong>{{ plural(data.staleMatchIds.length, 'partido pospuesto conserva', 'partidos pospuestos conservan') }} su fecha original.</strong>
            {{ data.staleMatchIds.length === 1 ? 'No cuenta para cumplir suspensiones hasta que le pongas la fecha en que se jugó (o se jugará).' : 'No cuentan para cumplir suspensiones hasta que les pongas la fecha en que se jugaron (o se jugarán).' }}
          </p>
          <ul class="mt-1 space-y-0.5">
            <li v-for="m in data.staleMatchIds" :key="m">
              {{ matchLabel(m) }} ·
              <RouterLink :to="{ name: 'admin-tournament-schedule', params: { id } }" class="link">Ir al calendario</RouterLink>
            </li>
          </ul>
        </div>
      </div>

      <!-- Sanciones -->
      <section aria-labelledby="sanctions-title">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="sanctions-title" class="text-lg font-bold">Sanciones</h2>
          <AppButton v-if="!readOnly" size="sm" @click="open('create')"><Plus class="size-4" aria-hidden="true" /> Nueva sanción</AppButton>
        </div>
        <div role="radiogroup" aria-label="Filtrar sanciones" class="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <button
            v-for="f in FILTERS"
            :key="f.value"
            type="button"
            role="radio"
            :aria-checked="filter === f.value"
            class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors"
            :class="filter === f.value ? 'border-pitch-900 bg-pitch-900 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'"
            @click="filter = f.value"
          >
            {{ f.label }}
            <span class="tabular rounded-full px-1.5 text-xs" :class="filter === f.value ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500'">{{ counts[f.value] ?? 0 }}</span>
          </button>
        </div>
        <ul v-if="shown.length" class="space-y-2">
          <li v-for="s in shown" :key="s.ref" class="card p-3">
            <div class="flex items-start gap-3">
              <TeamLogo :team="team(s.teamId)" size="md" class="shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-zinc-900">{{ playerName(s.playerId) }}</p>
                  <StatusBadge v-bind="SANCTION_STATUS[s.status]" />
                </div>
                <p class="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                  <CardIcon v-if="s.cause !== 'manual'" :color="s.cause === 'accumulation' ? 'yellow' : 'red'" />
                  {{ SANCTION_CAUSE[s.cause] }} · {{ s.kind === 'manual' ? 'desde' : 'en' }} {{ matchLabel(s.matchId, s.teamId) }}
                </p>
                <p class="mt-1 text-sm text-zinc-700">
                  <template v-if="s.status === 'annulled'">{{ plural(s.matches, 'partido', 'partidos') }} (anulada)</template>
                  <template v-else>
                    <strong class="tabular">{{ s.served }}/{{ s.matches }}</strong> cumplidos
                    <template v-if="s.remaining"> · faltan {{ s.remaining }}</template>
                    <span v-if="s.adjusted" class="text-xs text-zinc-500"> · ajustada (reglamento: {{ s.ruleMatches }})</span>
                  </template>
                </p>
                <p v-if="s.status === 'pending'" class="text-xs text-amber-800">Sin partidos programados para cumplirla{{ finished ? ': queda pendiente y no pasa a otro torneo' : '' }}.</p>
                <p v-if="s.upcomingMatchIds.length" class="text-xs text-zinc-500">No puede jugar: {{ s.upcomingMatchIds.map((m) => matchLabel(m, s.teamId)).join(' / ') }}</p>
                <p v-if="s.staleMatchIds.length" class="text-xs text-amber-800">Sin contar (fecha sin actualizar): {{ s.staleMatchIds.map((m) => matchLabel(m, s.teamId)).join(' / ') }}</p>
                <p v-if="s.incidentMatchIds.length" class="text-xs text-red-700">Jugó suspendido: {{ s.incidentMatchIds.map((m) => matchLabel(m, s.teamId)).join(' / ') }}</p>
                <p v-if="s.reason" class="mt-1 text-xs text-zinc-600">Motivo: {{ s.reason }}</p>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap justify-end gap-1">
              <AppButton variant="ghost" size="sm" @click="showHistory(s.ref)"><History class="size-4" aria-hidden="true" /> Historial</AppButton>
              <template v-if="!readOnly">
                <AppButton v-if="s.status !== 'annulled'" variant="ghost" size="sm" @click="open('edit', s)"><Pencil class="size-4" aria-hidden="true" /> Corregir</AppButton>
                <AppButton v-if="s.status !== 'annulled'" variant="ghost" size="sm" class="text-red-700" @click="open('annul', s)"><XCircle class="size-4" aria-hidden="true" /> Anular</AppButton>
                <AppButton v-else variant="ghost" size="sm" @click="open('restore', s)"><RotateCcw class="size-4" aria-hidden="true" /> Reactivar</AppButton>
              </template>
            </div>
          </li>
        </ul>
        <EmptyState
          v-else
          :icon="ShieldCheck"
          :title="filter === 'active' ? 'Nadie está suspendido' : 'Nada por aquí'"
          :description="filter === 'active' ? 'Las suspensiones aparecen aquí al capturar tarjetas (con el reglamento activo) o al registrar una sanción manual.' : undefined"
          class="card"
          compact
        />
      </section>

      <!-- Tarjetas acumuladas -->
      <section aria-labelledby="cards-title">
        <h2 id="cards-title" class="mb-1 text-lg font-bold">Tarjetas acumuladas</h2>
        <p class="mb-3 text-sm text-zinc-500">
          Las amarillas de una doble amarilla no cuentan para la acumulación.
          <template v-if="data.rules.yellowsForSuspension && data.rules.enabled"> Suspensión cada {{ data.rules.yellowsForSuspension }} amarillas{{ data.rules.resetAccumulationOnPhaseChange ? ', desde cero en cada fase' : '' }}.</template>
        </p>
        <div v-if="cardRows.length" class="card overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-zinc-50 text-left text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
              <tr>
                <th scope="col" class="px-3 py-2">Jugador</th>
                <th scope="col" class="px-2 py-2 text-center">Amarillas</th>
                <th scope="col" class="px-2 py-2 text-center" :title="data.rules.yellowsForSuspension ? `Hacia la próxima suspensión (de ${data.rules.yellowsForSuspension})` : undefined">Acum.</th>
                <th scope="col" class="px-2 py-2 text-center">Roja</th>
                <th scope="col" class="px-2 py-2 text-center">2A</th>
                <th scope="col" class="px-3 py-2 text-right">Por cumplir</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              <tr v-for="p in cardRows" :key="p.playerId">
                <td class="px-3 py-2">
                  <span class="flex items-center gap-2">
                    <TeamLogo :team="team(p.teamId)" size="xs" class="shrink-0" />
                    <span class="truncate font-semibold text-zinc-900">{{ playerName(p.playerId) }}</span>
                    <Ban v-if="p.suspended" class="size-4 shrink-0 text-red-600" aria-label="Suspendido" />
                    <AlertTriangle v-if="p.unclassified" class="size-4 shrink-0 text-amber-600" aria-label="Expulsión sin clasificar" />
                  </span>
                </td>
                <td class="tabular px-2 py-2 text-center">{{ p.yellows }}</td>
                <td class="tabular px-2 py-2 text-center" :class="{ 'font-bold text-amber-700': !!data.rules.yellowsForSuspension && p.towardNext === data.rules.yellowsForSuspension - 1 }">
                  {{ data.rules.yellowsForSuspension ? `${p.towardNext}/${data.rules.yellowsForSuspension}` : '–' }}
                </td>
                <td class="tabular px-2 py-2 text-center">{{ p.directReds }}</td>
                <td class="tabular px-2 py-2 text-center">{{ p.secondYellows }}</td>
                <td class="tabular px-3 py-2 text-right" :class="{ 'font-bold text-red-700': p.remaining > 0 }">{{ p.remaining ? plural(p.remaining, 'partido', 'partidos') : '–' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else :icon="ShieldCheck" title="Sin tarjetas en este torneo" class="card" compact />
      </section>

      <!-- Reglamento -->
      <section aria-labelledby="rules-title" class="card p-4">
        <h2 id="rules-title" class="text-lg font-bold">Reglamento disciplinario</h2>
        <p class="mb-4 text-sm text-zinc-500">{{ ruleSummary }}</p>
        <form class="space-y-4" novalidate @submit.prevent="saveRules">
          <fieldset :disabled="readOnly" class="space-y-4">
            <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3">
              <span>
                <span class="block font-semibold text-zinc-900">Sanciones automáticas</span>
                <span class="block text-xs text-zinc-500">Se calculan con las tarjetas capturadas. Cambiar el reglamento recalcula todas; tus ajustes y el historial se conservan.</span>
              </span>
              <input v-model="rules.enabled" type="checkbox" class="size-6 shrink-0 accent-pitch-700" />
            </label>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FormField id="rules-yellows" label="Amarillas para suspender" hint="Vacío: sin acumulación">
                <input id="rules-yellows" v-model="rules.yellowsForSuspension" type="number" inputmode="numeric" min="2" max="20" class="input" placeholder="Sin acumulación" />
              </FormField>
              <FormField id="rules-acc" label="Partidos por acumulación">
                <input id="rules-acc" v-model.number="rules.accumulationMatches" type="number" inputmode="numeric" min="0" max="20" class="input" />
              </FormField>
              <FormField id="rules-red" label="Partidos por roja directa">
                <input id="rules-red" v-model.number="rules.directRedMatches" type="number" inputmode="numeric" min="0" max="20" class="input" />
              </FormField>
              <FormField id="rules-2y" label="Partidos por doble amarilla">
                <input id="rules-2y" v-model.number="rules.secondYellowMatches" type="number" inputmode="numeric" min="0" max="20" class="input" />
              </FormField>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="rules.resetAccumulationOnPhaseChange" type="checkbox" class="size-4 accent-pitch-700" />
              Reiniciar las amarillas acumuladas al empezar una nueva fase (las suspensiones pendientes se mantienen)
            </label>
            <fieldset class="space-y-2">
              <legend class="text-sm font-semibold text-zinc-900">Si se alinea a un suspendido</legend>
              <label class="flex items-start gap-2 text-sm">
                <input v-model="rules.eligibility" type="radio" value="warn" class="mt-1 accent-pitch-700" />
                <span>Avisar y registrar la incidencia <span class="text-xs text-zinc-500">(el partido no cuenta para su suspensión)</span></span>
              </label>
              <label class="flex items-start gap-2 text-sm">
                <input v-model="rules.eligibility" type="radio" value="block" class="mt-1 accent-pitch-700" />
                <span>No permitir guardar el resultado con él</span>
              </label>
            </fieldset>
          </fieldset>
          <div v-if="!readOnly" class="flex justify-end">
            <AppButton type="submit" :loading="savingRules"><Save class="size-4" aria-hidden="true" /> Guardar reglamento</AppButton>
          </div>
        </form>
      </section>

      <!-- Ajustes sin sanción vigente -->
      <section v-if="data.orphans.length" aria-labelledby="orphans-title">
        <h2 id="orphans-title" class="mb-1 text-lg font-bold">Ajustes sin sanción vigente</h2>
        <p class="mb-3 text-sm text-zinc-500">Decisiones sobre sanciones automáticas que ya no existen (se corrigieron las tarjetas o el reglamento). Se conservan con su historial y vuelven a aplicar si la sanción reaparece.</p>
        <ul class="space-y-2">
          <li v-for="o in data.orphans" :key="o.ref" class="card flex items-center gap-3 p-3 text-sm">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-zinc-900">{{ playerName(o.playerId) }}</p>
              <p class="text-xs text-zinc-500">{{ SANCTION_CAUSE[o.cause] }} · {{ matchLabel(o.matchId, o.teamId) }} · {{ o.annulled ? 'anulada' : `ajustada a ${o.matches}` }}</p>
            </div>
            <AppButton variant="ghost" size="sm" @click="showHistory(o.ref)"><History class="size-4" aria-hidden="true" /> Historial</AppButton>
          </li>
        </ul>
      </section>

      <!-- Historial -->
      <section id="discipline-history" aria-labelledby="history-title" class="scroll-mt-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="history-title" class="text-lg font-bold">Historial disciplinario</h2>
          <AppButton v-if="historyRef" variant="ghost" size="sm" @click="historyRef = null">Ver todo el historial</AppButton>
        </div>
        <ol v-if="log.length" class="card divide-y divide-zinc-100">
          <li v-for="e in log" :key="e.id" class="px-4 py-2.5 text-sm">
            <p class="flex flex-wrap items-baseline gap-x-2">
              <span class="font-semibold" :class="e.action === 'played_while_suspended' ? 'text-red-700' : 'text-zinc-900'">{{ DISCIPLINE_ACTION[e.action] }}</span>
              <span v-if="e.playerId" class="text-zinc-700">{{ playerName(e.playerId) }}</span>
              <span v-if="e.matchId && e.action === 'played_while_suspended'" class="text-zinc-500">{{ matchLabel(e.matchId) }}</span>
              <span class="ml-auto text-xs text-zinc-500">{{ when(e.createdAt) }}<template v-if="e.by.name"> · {{ e.by.name }}</template></span>
            </p>
            <p v-if="e.justification" class="text-xs text-zinc-600">“{{ e.justification }}”</p>
            <p v-if="e.before && e.after && 'matches' in e.after && e.before.matches !== e.after.matches" class="text-xs text-zinc-500">
              Duración: {{ e.before.matches ?? 'reglamento' }} → {{ e.after.matches ?? 'reglamento' }}
            </p>
          </li>
        </ol>
        <EmptyState v-else :icon="History" title="Sin movimientos todavía" class="card" compact />
      </section>
    </div>

    <SanctionDialog
      :open="dialog.open"
      :tournament-id="id"
      :mode="dialog.mode"
      :sanction="dialog.sanction"
      :refs="data?.refs ?? null"
      @close="dialog.open = false"
      @saved="applied"
    />
  </div>
</template>
