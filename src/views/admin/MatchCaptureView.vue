<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { Archive, ArrowLeft, Ban, CalendarClock, CalendarX, CheckCircle2, ExternalLink, Lock, Save } from 'lucide-vue-next'
import type { ID, MatchEligibility, MatchStatus, PlayerMatchStatsInput } from '@/types'
import { useMatchesStore, usePlayersStore, useRoundsStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useAdminData } from '@/composables/useLeagueData'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { useTournamentStructure } from '@/composables/useTournamentStructure'
import { disciplineService, getErrorMessage, USE_MOCKS } from '@/services'
import { formatDate } from '@/utils/format'
import { MATCH_STATUS } from '@/utils/labels'
import { isPendingCapture } from '@/utils/matches'
import AppButton from '@/components/common/AppButton.vue'
import NumberStepper from '@/components/common/NumberStepper.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import CaptureTeamPanel from '@/components/matches/CaptureTeamPanel.vue'
import type { CaptureRow } from '@/components/matches/captureTypes'
import { plural } from '@/utils/format'

const props = defineProps<{ id: string }>()

const { loading, error, reload } = useAdminData()
const matches = useMatchesStore()
const players = usePlayersStore()
const teams = useTeamsStore()
const tournaments = useTournamentsStore()
const rounds = useRoundsStore()
const { confirm } = useConfirm()
const toast = useToast()

const match = computed(() => matches.get(props.id))
const home = computed(() => teams.get(match.value?.homeTeamId))
const away = computed(() => teams.get(match.value?.awayTeamId))
const tournament = computed(() => (match.value ? tournaments.get(match.value.tournamentId) : undefined))
/** Torneo finalizado: el resultado se consulta pero ya no se modifica. */
const finished = computed(() => tournament.value?.status === 'finished')
/** RBAC: sin permiso de resultados se consulta, no se captura (el servidor lo vuelve a validar). */
const canCapture = computed(() => !!match.value && tournaments.can(match.value.tournamentId, 'RESULTS'))
const readOnly = computed(() => finished.value || !canCapture.value)
const backTo = computed(() =>
  match.value
    ? { name: 'admin-tournament-schedule', params: { id: match.value.tournamentId }, query: { round: String(match.value.round) } }
    : { name: 'admin-tournaments' },
)
/** Tras guardar un resultado final: atajos al siguiente paso del flujo. */
const justSaved = ref(false)
const nextPending = computed(() =>
  match.value
    ? matches.ofTournament(match.value.tournamentId).find((m) => m.id !== props.id && (isPendingCapture(m) || m.status === 'scheduled'))
    : undefined,
)

// ─── Estado del formulario ──────────────────────────────────────────────────
type CaptureStatus = Extract<MatchStatus, 'live' | 'finished'>
const homeScore = ref(0)
const awayScore = ref(0)
const status = ref<CaptureStatus>('finished')
const homeRows = ref<CaptureRow[]>([])
const awayRows = ref<CaptureRow[]>([])
const activeSide = ref<'home' | 'away'>('home')
const saving = ref(false)
const snapshot = ref('')
const penHome = ref(0)
const penAway = ref(0)
const extraTime = ref(false)

// ─── Penales (eliminatorias) ────────────────────────────────────────────────
// Solo el partido que cierra la llave (único o vuelta) puede llevar tanda, y solo si la llave
// queda igualada en el global. El servidor valida lo mismo; aquí solo se decide si mostrarla.
const closingLeg = computed(() => {
  const tie = match.value?.stage?.tie
  if (!tie) return false
  const legs = tournament.value?.settings.knockoutLegs ?? 1
  return tie.leg === legs - 1
})
/** Global de la llave desde el punto de vista de este partido (local/visitante de este partido). */
const aggregate = computed(() => {
  const m = match.value
  const tie = m?.stage?.tie
  if (!m || !tie) return null
  let home = homeScore.value
  let away = awayScore.value
  if (tie.leg > 0) {
    const first = matches
      .ofTournament(m.tournamentId)
      .find((x) => x.stage?.phase === m.stage!.phase && x.stage?.tie?.round === tie.round && x.stage?.tie?.slot === tie.slot && x.stage?.tie?.leg === 0)
    if (!first || first.status !== 'finished' || first.homeScore == null || first.awayScore == null) return null
    // En la ida los papeles están invertidos.
    home += first.awayScore
    away += first.homeScore
  }
  return { home, away }
})
// Regla de la ronda (la final puede tener la suya): la sabe la estructura que calcula el servidor.
const { structure } = useTournamentStructure(
  () => match.value?.tournamentId ?? '',
  () => !!match.value?.stage?.tie,
)
const tieView = computed(() => {
  const st = match.value?.stage
  if (!st?.tie) return null
  const phase = structure.value?.phases.find((p) => p.index === st.phase)
  return phase?.type === 'knockout' ? (phase.rounds[st.tie.round]?.ties.find((t) => t.slot === st.tie!.slot) ?? null) : null
})
const tiebreak = computed(() => tieView.value?.tiebreak ?? 'penalties')
const tiedAggregate = computed(() => closingLeg.value && status.value === 'finished' && !!aggregate.value && aggregate.value.home === aggregate.value.away)
/** "Pasa el mejor de la tabla": sin penales, salvo que las posiciones tampoco lo decidan (el servidor lo dice). */
const decidedByPosition = computed(
  () => tiebreak.value === 'better_position' && tieView.value?.status !== 'needs_penalties' && tiedAggregate.value,
)
/** Tiempos extra: solo en la llave cuya regla los usa, en el partido que la cierra. */
const offersExtraTime = computed(() => closingLeg.value && status.value === 'finished' && tiebreak.value === 'extra_time')
/** Liga o grupos: penales por el punto extra de un empate, si el torneo lo usa. */
const leagueShootout = computed(
  () => !match.value?.stage?.tie && !!tournament.value?.settings.points.shootoutWin && status.value === 'finished' && homeScore.value === awayScore.value,
)
const needsPenalties = computed(() => leagueShootout.value || (tiedAggregate.value && !decidedByPosition.value))

const serialize = () =>
  JSON.stringify([homeScore.value, awayScore.value, status.value, homeRows.value, awayRows.value, penHome.value, penAway.value, extraTime.value])
const dirty = computed(() => snapshot.value !== '' && serialize() !== snapshot.value)

function buildRows(teamId: ID): CaptureRow[] {
  const existing = matches.statsOf(props.id)
  const isNew = existing.length === 0
  const statsOf = new Map(existing.filter((s) => s.teamId === teamId).map((s) => [s.playerId, s]))
  // Plantilla del equipo EN ESTE TORNEO + quien ya tenga estadísticas en este partido
  // (aunque después haya cambiado de equipo). Un equipo puede jugar varios torneos a la vez.
  const roster = players.rosterOf(teamId, match.value?.tournamentId).map((e) => ({ player: e.player, shirtNumber: e.membership.shirtNumber }))
  for (const playerId of statsOf.keys()) {
    const player = players.get(playerId)
    if (player && !roster.some((r) => r.player.id === playerId)) roster.push({ player, shirtNumber: null })
  }
  return roster.map(({ player, shirtNumber }) => {
    const s = statsOf.get(player.id)
    const suspended = suspendedIds.value.has(player.id)
    // Captura anterior sin tipo de expulsión: solo queda sin clasificar si hay roja o dos amarillas.
    const legacy = s && s.sendOff === undefined && (s.redCards > 0 || s.yellowCards > 1)
    return {
      player,
      shirtNumber,
      // En un partido sin captura previa se asume que jugó toda la plantilla (menos los suspendidos):
      // es más rápido desmarcar ausentes.
      played: Boolean(s) || (isNew && !suspended),
      goals: s?.goals ?? 0,
      assists: s?.assists ?? 0,
      ownGoals: s?.ownGoals ?? 0,
      yellowCards: s?.yellowCards ?? 0,
      redCards: s?.redCards ?? 0,
      sendOff: legacy ? undefined : (s?.sendOff ?? null),
      suspension: suspended ? { remaining: eligibility.value!.suspended.find((x) => x.playerId === player.id)!.remaining } : null,
    }
  })
}

// ─── Elegibilidad (control disciplinario) ───────────────────────────────────
// Suspendidos para este partido según las sanciones del torneo. Se cargan antes de armar las filas.
const eligibility = ref<MatchEligibility | null>(null)
const suspendedIds = computed(() => new Set(eligibility.value?.suspended.map((s) => s.playerId) ?? []))
const blockSuspended = computed(() => eligibility.value?.mode === 'block')
const suspendedPlaying = computed(() => [...homeRows.value, ...awayRows.value].filter((r) => r.suspension && r.played))
async function loadEligibility() {
  eligibility.value = null
  if (USE_MOCKS || readOnly.value || !match.value) return
  try {
    eligibility.value = await disciplineService.eligibility(props.id)
  } catch {
    // Sin avisos si falla: el servidor vuelve a validar al guardar.
  }
}

async function init() {
  const id = props.id
  if (!match.value) return
  await loadEligibility()
  // Otro partido mientras se cargaba ("Siguiente partido"): ese init arma sus filas.
  const m = match.value
  if (id !== props.id || !m) return
  homeScore.value = m.homeScore ?? 0
  awayScore.value = m.awayScore ?? 0
  status.value = m.status === 'live' ? 'live' : 'finished'
  penHome.value = m.penalties?.home ?? 0
  penAway.value = m.penalties?.away ?? 0
  extraTime.value = m.extraTime ?? false
  homeRows.value = buildRows(m.homeTeamId)
  awayRows.value = buildRows(m.awayTeamId)
  snapshot.value = serialize()
}

watch([() => loading.value, match], ([isLoading]) => {
  if (!isLoading && match.value && !snapshot.value) init()
}, { immediate: true })
// "Siguiente partido" reutiliza esta vista con otro id: se reinicia el formulario.
watch(() => props.id, () => {
  snapshot.value = ''
  justSaved.value = false
  activeSide.value = 'home'
  init()
})

// El marcador nunca puede ser menor que los goles asignados a jugadores:
// capturar goles individuales actualiza el marcador automáticamente.
// Goles de cada lado: los de sus jugadores + los autogoles del rival.
const ownGoalsOf = (rows: CaptureRow[]) => rows.reduce((s, r) => s + r.ownGoals, 0)
const homeAssigned = computed(() => homeRows.value.reduce((s, r) => s + r.goals, 0) + ownGoalsOf(awayRows.value))
const awayAssigned = computed(() => awayRows.value.reduce((s, r) => s + r.goals, 0) + ownGoalsOf(homeRows.value))
watch(homeAssigned, (n) => { if (n > homeScore.value) homeScore.value = n })
watch(awayAssigned, (n) => { if (n > awayScore.value) awayScore.value = n })

// ─── Guardado ───────────────────────────────────────────────────────────────
function toStats(rows: CaptureRow[], teamId: ID): PlayerMatchStatsInput[] {
  return rows
    .filter((r) => r.played)
    .map((r) => ({
      playerId: r.player.id,
      teamId,
      goals: r.goals,
      assists: r.assists,
      ownGoals: r.ownGoals,
      yellowCards: r.yellowCards,
      redCards: r.redCards,
      // undefined (expulsión anterior sin clasificar) no se envía: sigue sin clasificar.
      ...(r.sendOff !== undefined ? { sendOff: r.sendOff } : {}),
    }))
}

async function save() {
  const m = match.value
  if (!m) return
  if (status.value === 'finished' && m.status !== 'finished') {
    const ok = await confirm({
      title: 'Finalizar partido',
      message: `${home.value?.name} ${homeScore.value} – ${awayScore.value} ${away.value?.name}. El resultado se reflejará en la tabla y en los perfiles de los jugadores.`,
      confirmLabel: 'Guardar y finalizar',
    })
    if (!ok) return
  }
  if (needsPenalties.value && penHome.value === penAway.value) {
    toast.error(leagueShootout.value ? 'Empate: captura la tanda de penales con un ganador (punto extra).' : 'La llave está igualada: captura la tanda de penales con un ganador.')
    return
  }
  saving.value = true
  try {
    await matches.saveResult(m.id, {
      homeScore: homeScore.value,
      awayScore: awayScore.value,
      status: status.value,
      penalties: needsPenalties.value ? { home: penHome.value, away: penAway.value } : null,
      extraTime: offersExtraTime.value && extraTime.value,
      stats: [...toStats(homeRows.value, m.homeTeamId), ...toStats(awayRows.value, m.awayTeamId)],
    })
    snapshot.value = serialize()
    justSaved.value = status.value === 'finished'
    toast.success(status.value === 'finished' ? 'Resultado guardado. Tabla y perfiles actualizados.' : 'Marcador en vivo actualizado.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function confirmLeave() {
  if (!dirty.value) return true
  return confirm({
    title: '¿Salir sin guardar?',
    message: 'Perderás los cambios capturados en este partido.',
    confirmLabel: 'Salir sin guardar',
    tone: 'danger',
  })
}
onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)

const statusOptions: { value: CaptureStatus; label: string }[] = [
  { value: 'live', label: 'En juego' },
  { value: 'finished', label: 'Finalizado' },
]
</script>

<template>
  <div class="pb-24">
    <RouterLink :to="backTo" class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
      <ArrowLeft class="size-4" aria-hidden="true" /> {{ tournament ? `Calendario · ${tournament.name}` : 'Mis torneos' }}
    </RouterLink>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />
    <EmptyState v-else-if="!match" :icon="CalendarX" title="Partido no encontrado" class="card">
      <AppButton :to="{ name: 'admin-tournaments' }" variant="secondary">Mis torneos</AppButton>
    </EmptyState>
    <EmptyState
      v-else-if="!tournaments.isMine(match.tournamentId)"
      :icon="Lock"
      title="Este partido no es de tus torneos"
      description="Solo el organizador del torneo puede capturar su resultado."
      class="card"
    >
      <AppButton :to="{ name: 'match', params: { id: match.id } }" variant="secondary">Ver partido</AppButton>
    </EmptyState>
    <EmptyState
      v-else-if="match.status === 'cancelled'"
      :icon="CalendarX"
      title="Partido cancelado"
      description="Cambia su estado desde el calendario del torneo si necesitas capturar un resultado."
      class="card"
    >
      <AppButton :to="backTo" variant="secondary">Volver al calendario</AppButton>
    </EmptyState>
    <EmptyState
      v-else-if="tournament?.status === 'draft'"
      :icon="CalendarClock"
      title="El torneo aún no ha iniciado"
      description="Los resultados se capturan con el torneo en curso. Cuando el calendario y las plantillas estén listos, inícialo desde Configuración."
      class="card"
    >
      <AppButton :to="{ name: 'admin-tournament-settings', params: { id: match.tournamentId } }">Ir a Configuración</AppButton>
      <AppButton :to="backTo" variant="secondary">Volver al calendario</AppButton>
    </EmptyState>

    <template v-else>
      <header class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 class="display text-3xl">{{ readOnly ? 'Resultado' : 'Capturar resultado' }}</h1>
          <p class="text-sm text-zinc-500">{{ tournament?.name }} · {{ rounds.labelOf(match.tournamentId, match.round) }} · {{ formatDate(match.date) }} {{ match.time }}</p>
        </div>
        <div class="flex items-center gap-2">
          <StatusBadge v-bind="MATCH_STATUS[match.status]" :pulse="match.status === 'live'" />
          <RouterLink :to="{ name: 'match', params: { id: match.id } }" class="link inline-flex items-center gap-1 text-sm">
            Ver público <ExternalLink class="size-3.5" aria-hidden="true" />
          </RouterLink>
        </div>
      </header>

      <div v-if="readOnly" class="mb-4 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" role="status">
        <Archive class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p v-if="finished"><strong>Torneo finalizado.</strong> Este resultado es parte del historial y ya no se puede modificar.</p>
        <p v-else><strong>Solo lectura.</strong> Tu rol en este torneo no permite capturar resultados.</p>
      </div>
      <div v-else-if="justSaved && !dirty" class="mb-4 flex flex-col gap-3 rounded-2xl border border-pitch-200 bg-pitch-50 px-4 py-3 text-sm sm:flex-row sm:items-center" role="status">
        <p class="flex flex-1 items-center gap-2 font-semibold text-pitch-900">
          <CheckCircle2 class="size-5 shrink-0 text-pitch-600" aria-hidden="true" />
          Resultado guardado. La tabla y los goleadores ya están actualizados.
        </p>
        <div class="flex flex-wrap gap-2">
          <AppButton variant="secondary" size="sm" :to="{ name: 'admin-tournament-standings', params: { id: match.tournamentId } }">Ver tabla</AppButton>
          <AppButton v-if="nextPending" size="sm" :to="{ name: 'admin-match-capture', params: { id: nextPending.id } }">Siguiente partido</AppButton>
          <AppButton v-else variant="ghost" size="sm" :to="backTo">Calendario</AppButton>
        </div>
      </div>

      <fieldset :disabled="readOnly" class="min-w-0">
      <!-- Marcador -->
      <section aria-label="Marcador" class="mb-6 rounded-3xl bg-pitch-950 px-3 py-6 text-white sm:px-8">
        <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <div class="flex flex-col items-center gap-2 text-center">
            <TeamLogo :team="home" size="md" />
            <p class="line-clamp-2 text-sm font-bold sm:text-base">{{ home?.name }}</p>
            <p class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">Local</p>
            <NumberStepper v-model="homeScore" :label="`goles de ${home?.name}`" :min="homeAssigned" size="lg" class="[&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20" />
          </div>
          <span class="mb-2 font-display text-3xl text-pitch-400" aria-hidden="true">–</span>
          <div class="flex flex-col items-center gap-2 text-center">
            <TeamLogo :team="away" size="md" />
            <p class="line-clamp-2 text-sm font-bold sm:text-base">{{ away?.name }}</p>
            <p class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">Visitante</p>
            <NumberStepper v-model="awayScore" :label="`goles de ${away?.name}`" :min="awayAssigned" size="lg" class="[&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20" />
          </div>
        </div>
        <p class="mt-4 text-center text-xs text-pitch-300">Al sumar goles a un jugador, el marcador se actualiza solo.</p>
        <label v-if="offersExtraTime" class="mt-4 flex items-center justify-center gap-2 text-sm text-pitch-100">
          <input v-model="extraTime" type="checkbox" class="size-4 accent-lime-400" />
          Se jugaron tiempos extra <span class="text-xs text-pitch-300">(el marcador los incluye)</span>
        </label>
        <p v-if="decidedByPosition" class="mt-4 rounded-lg bg-white/10 p-3 text-center text-xs text-pitch-100">
          {{ aggregate && match?.stage?.tie?.leg ? `Global ${aggregate.home}–${aggregate.away}` : 'Empate' }}: sin penales, pasa el mejor posicionado de la fase regular.
        </p>
        <div v-if="needsPenalties" class="mt-5 border-t border-white/10 pt-5" role="group" aria-labelledby="pen-title">
          <p id="pen-title" class="text-center text-xs font-semibold tracking-wider text-amber-300 uppercase">Tanda de penales</p>
          <p class="mt-1 text-center text-xs text-pitch-300">
            <template v-if="leagueShootout">Empate: quien gane los penales suma {{ tournament?.settings.points.shootoutWin }} punto{{ tournament?.settings.points.shootoutWin === 1 ? '' : 's' }} extra.</template>
            <template v-else>
              {{ aggregate && match?.stage?.tie?.leg ? `Global ${aggregate.home}–${aggregate.away}: ` : 'Empate: ' }}la llave se decide en penales{{ tiebreak === 'extra_time' ? ' (tras los tiempos extra)' : '' }}.
            </template>
          </p>
          <div class="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <NumberStepper v-model="penHome" :label="`penales de ${home?.name}`" :min="0" class="justify-self-center [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20" />
            <span class="text-pitch-400" aria-hidden="true">–</span>
            <NumberStepper v-model="penAway" :label="`penales de ${away?.name}`" :min="0" class="justify-self-center [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20" />
          </div>
        </div>
      </section>

      <!-- Selector de equipo en móvil -->
      <div role="tablist" aria-label="Equipo a capturar" class="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-zinc-200/70 p-1 2xl:hidden">
        <button
          v-for="side in (['home', 'away'] as const)"
          :key="side"
          type="button"
          role="tab"
          :aria-selected="activeSide === side"
          class="flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition"
          :class="activeSide === side ? 'bg-white shadow-sm' : 'text-zinc-600'"
          @click="activeSide = side"
        >
          <TeamLogo :team="side === 'home' ? home : away" size="xs" />
          <span class="truncate">{{ (side === 'home' ? home : away)?.name }}</span>
        </button>
      </div>

      <div
        v-if="!readOnly && (match.status === 'postponed' || eligibility?.staleDate)"
        class="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        role="status"
      >
        <CalendarClock class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>{{ match.status === 'postponed' ? 'Partido pospuesto.' : 'Conserva la fecha con la que se pospuso.' }}</strong>
          Antes de capturarlo, ponle en el calendario la fecha en que se jugó: mientras conserve la original no cuenta para cumplir suspensiones.
          <RouterLink :to="backTo" class="link ml-1">Ir al calendario</RouterLink>
        </p>
      </div>

      <div
        v-if="eligibility?.suspended.length"
        class="mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm"
        :class="suspendedPlaying.length ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'"
        role="status"
      >
        <Ban class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>{{ plural(eligibility.suspended.length, 'jugador suspendido', 'jugadores suspendidos') }} para este partido.</strong>
          <template v-if="blockSuspended"> El reglamento no permite alinearlos.</template>
          <template v-else-if="suspendedPlaying.length"> Si los marcas como jugados se guardará, pero quedará registrada la incidencia y este partido no contará para su suspensión.</template>
          <template v-else> Están desmarcados: este partido cuenta para cumplir su suspensión.</template>
          <RouterLink :to="{ name: 'admin-tournament-discipline', params: { id: match.tournamentId } }" class="link ml-1">Ver disciplina</RouterLink>
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <CaptureTeamPanel :class="activeSide !== 'home' && 'hidden 2xl:block'" :team="home" :tournament-id="match?.tournamentId" :rows="homeRows" :score="homeScore" :rival-own-goals="ownGoalsOf(awayRows)" :block-suspended="blockSuspended" />
        <CaptureTeamPanel :class="activeSide !== 'away' && 'hidden 2xl:block'" :team="away" :tournament-id="match?.tournamentId" :rows="awayRows" :score="awayScore" :rival-own-goals="ownGoalsOf(homeRows)" :block-suspended="blockSuspended" />
      </div>

      </fieldset>

      <!-- Barra de guardado fija -->
      <div v-if="!readOnly" class="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:left-60">
        <div class="mx-auto flex max-w-6xl items-center gap-3">
          <fieldset class="flex rounded-lg bg-zinc-100 p-1">
            <legend class="sr-only">Estado del partido</legend>
            <label
              v-for="opt in statusOptions"
              :key="opt.value"
              class="flex h-8 cursor-pointer items-center rounded-md px-3 text-xs font-semibold text-zinc-600 transition has-[:checked]:bg-white has-[:checked]:text-zinc-950 has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500 sm:text-sm"
            >
              <input v-model="status" type="radio" name="capture-status" :value="opt.value" class="sr-only" />
              {{ opt.label }}
            </label>
          </fieldset>
          <p v-if="dirty" class="hidden text-xs text-amber-700 sm:block">Cambios sin guardar</p>
          <AppButton class="ml-auto" :loading="saving" :disabled="!dirty && match.status === status" @click="save">
            <Save v-if="!saving" class="size-4" aria-hidden="true" /> Guardar
          </AppButton>
        </div>
      </div>
    </template>
  </div>
</template>
