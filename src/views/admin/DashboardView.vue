<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { CalendarClock, CheckCircle2, ClipboardEdit, NotebookPen, Plus, RotateCcw, Trophy, Users } from 'lucide-vue-next'
import type { ID } from '@/types'
import { ensureAdminData, useAuthStore, useHomeStore, useMatchesStore, usePlayersStore, useRoundsStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useAdminData } from '@/composables/useLeagueData'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { sessionService, USE_MOCKS } from '@/services'
import { formatDate, formatMatchDay, toISODate } from '@/utils/format'
import { MATCH_STATUS } from '@/utils/labels'
import { isPendingCapture, isUpcoming } from '@/utils/matches'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import AppButton from '@/components/common/AppButton.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import OnboardingChecklist from '@/components/admin/OnboardingChecklist.vue'
import TournamentSpotlight from '@/components/admin/TournamentSpotlight.vue'
import ClubHome from '@/components/admin/home/ClubHome.vue'
import MyRegistrations from '@/components/admin/home/MyRegistrations.vue'

const { loading, error, reload } = useAdminData()
const auth = useAuthStore()
/** El panel se adapta a lo que la cuenta puede hacer: organizar torneos y/o administrar equipos. */
const home = useHomeStore()
const tournaments = useTournamentsStore()
const teams = useTeamsStore()
const players = usePlayersStore()
const matches = useMatchesStore()
const rounds = useRoundsStore()
const { confirm } = useConfirm()
const toast = useToast()

const today = formatDate(toISODate(new Date()), 'long')
const firstName = computed(() => auth.user?.firstName ?? '')

/** Solo partidos de mis torneos. */
const myMatches = computed(() => matches.chronological.filter((m) => tournaments.isMine(m.tournamentId)))
const pending = computed(() => myMatches.value.filter((m) => isPendingCapture(m)))
const upcoming = computed(() => myMatches.value.filter((m) => isUpcoming(m)).slice(0, 5))

/** Torneo destacado: el activo más reciente (tournaments.mine ya viene ordenado: activos primero). */
const selectedId = ref<ID | null>(null)
watchEffect(() => {
  if (!selectedId.value || !tournaments.isMine(selectedId.value)) selectedId.value = tournaments.mine[0]?.id ?? null
})
const selectable = computed(() => tournaments.mine.filter((t) => t.status !== 'finished').slice(0, 4))

/** Jugadores distintos que participan en mis torneos en curso o en preparación. */
const playersInPlay = computed(
  () =>
    new Set(
      tournaments.mine
        .filter((t) => t.status !== 'finished')
        .flatMap((t) => players.participantsOf(t.id).map((e) => e.player.id)),
    ).size,
)
const summary = computed(() => [
  { label: 'En curso', value: tournaments.mine.filter((t) => t.status === 'active').length, icon: Trophy, to: { name: 'admin-tournaments' } },
  { label: 'En preparación', value: tournaments.mine.filter((t) => t.status === 'draft').length, icon: NotebookPen, to: { name: 'admin-tournaments' } },
  { label: 'Jugadores en juego', value: playersInPlay.value, icon: Users, to: { name: 'admin-tournaments' } },
  {
    label: 'Por capturar',
    value: pending.value.length,
    icon: ClipboardEdit,
    to: pending.value[0]
      ? { name: 'admin-tournament-schedule', params: { id: pending.value[0].tournamentId }, query: { view: 'pending' } }
      : { name: 'admin-tournaments' },
  },
])

const resetting = ref(false)
async function resetDemo() {
  const ok = await confirm({
    title: '¿Restablecer los datos de demostración?',
    message: 'Se perderán los torneos, equipos, jugadores y resultados que hayas creado o modificado.',
    confirmLabel: 'Restablecer',
    tone: 'danger',
  })
  if (!ok) return
  resetting.value = true
  try {
    await sessionService.resetDemoData()
    await ensureAdminData(true)
    toast.success('Datos de demostración restablecidos.')
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="eyebrow mb-1 first-letter:uppercase">{{ today }}</p>
        <h1 class="display text-3xl sm:text-4xl">Hola, {{ firstName }}</h1>
        <p v-if="!loading && !error && home.canOrganize" class="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
          <template v-if="pending.length">
            <span class="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            Tienes {{ pending.length }} {{ pending.length === 1 ? 'partido' : 'partidos' }} esperando resultado.
          </template>
          <template v-else-if="tournaments.mine.length">
            <CheckCircle2 class="size-4 text-pitch-600" aria-hidden="true" /> Todo al día.
          </template>
        </p>
      </div>
      <div v-if="home.canOrganize" class="flex flex-wrap gap-2">
        <AppButton :to="{ name: 'admin-tournaments', query: { new: '1' } }" variant="secondary" size="sm">
          <Plus class="size-3.5" aria-hidden="true" /> Nuevo torneo
        </AppButton>
      </div>
    </header>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />

    <div v-else class="space-y-8">
      <MyRegistrations />

      <ClubHome v-if="!home.canOrganize" />

      <template v-else>
      <OnboardingChecklist />

      <!-- Torneo protagonista -->
      <div v-if="selectedId" class="space-y-3">
        <div v-if="selectable.length > 1" role="tablist" aria-label="Torneo destacado" class="flex flex-wrap gap-2">
          <button
            v-for="t in selectable"
            :key="t.id"
            type="button"
            role="tab"
            :aria-selected="selectedId === t.id"
            class="h-8 max-w-64 truncate rounded-full border px-3 text-xs font-semibold transition-colors"
            :class="selectedId === t.id ? 'border-pitch-900 bg-pitch-900 text-white' : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400'"
            @click="selectedId = t.id"
          >
            {{ t.name }}
          </button>
        </div>
        <TournamentSpotlight :tournament-id="selectedId" />
      </div>

      <!-- Resumen de la cuenta -->
      <nav v-if="tournaments.mine.length" aria-label="Resumen" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RouterLink
          v-for="s in summary"
          :key="s.label"
          :to="s.to"
          class="card group flex items-center gap-3 p-4 transition hover:border-zinc-300 hover:shadow-sm"
          :class="s.label === 'Por capturar' && s.value > 0 && '!border-amber-300 bg-amber-50/60'"
        >
          <span
            class="grid size-10 shrink-0 place-items-center rounded-xl"
            :class="s.label === 'Por capturar' && s.value > 0 ? 'bg-amber-100 text-amber-700' : 'bg-pitch-50 text-pitch-700'"
          >
            <component :is="s.icon" class="size-5" aria-hidden="true" />
          </span>
          <span>
            <span class="tabular block font-display text-2xl leading-none font-bold text-zinc-950">{{ s.value }}</span>
            <span class="text-xs font-medium text-zinc-500 group-hover:text-zinc-800">{{ s.label }}</span>
          </span>
        </RouterLink>
      </nav>

      <div v-if="tournaments.mine.length" class="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section aria-labelledby="pending-title">
          <div class="mb-3 flex items-center gap-2">
            <h2 id="pending-title" class="text-lg font-bold">Pendientes de capturar</h2>
            <span v-if="pending.length" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{{ pending.length }}</span>
          </div>
          <ul v-if="pending.length" class="card divide-y divide-zinc-100 overflow-hidden">
            <li v-for="m in pending" :key="m.id" class="flex items-center gap-3 border-l-4 border-amber-400 px-4 py-3">
              <div class="flex -space-x-1.5">
                <TeamLogo :team="teams.get(m.homeTeamId)" size="sm" />
                <TeamLogo :team="teams.get(m.awayTeamId)" size="sm" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">{{ teams.nameOf(m.homeTeamId) }} vs {{ teams.nameOf(m.awayTeamId) }}</p>
                <p class="truncate text-xs text-zinc-500">{{ tournaments.get(m.tournamentId)?.name }} · {{ rounds.labelOf(m.tournamentId, m.round) }} · {{ formatMatchDay(m.date) }} {{ m.time }}</p>
              </div>
              <span v-if="m.status === 'live'" class="hidden sm:block"><StatusBadge v-bind="MATCH_STATUS.live" pulse /></span>
              <AppButton :to="{ name: 'admin-match-capture', params: { id: m.id } }" variant="accent" size="sm">Capturar</AppButton>
            </li>
          </ul>
          <div v-else class="card flex items-center gap-3 px-4 py-5 text-sm text-zinc-600">
            <CheckCircle2 class="size-5 text-pitch-600" aria-hidden="true" /> Ningún partido espera resultado.
          </div>
        </section>

        <section aria-labelledby="upcoming-title">
          <div class="mb-3 flex items-center justify-between">
            <h2 id="upcoming-title" class="text-lg font-bold">Próximos partidos</h2>
            <RouterLink v-if="selectedId" :to="{ name: 'admin-tournament-schedule', params: { id: selectedId } }" class="link text-sm">Ver calendario</RouterLink>
          </div>
          <ul v-if="upcoming.length" class="card divide-y divide-zinc-100">
            <li v-for="m in upcoming" :key="m.id" class="flex items-center gap-3 px-4 py-3">
              <div class="w-[5.5rem] shrink-0 rounded-lg bg-zinc-50 py-1 text-center">
                <p class="text-[11px] whitespace-nowrap text-zinc-500">{{ formatMatchDay(m.date) }}</p>
                <p class="tabular text-sm font-bold">{{ m.time }}</p>
              </div>
              <div class="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <TeamLogo :team="teams.get(m.homeTeamId)" size="xs" />
                <span class="truncate font-semibold">
                  <span class="sm:hidden">{{ teams.get(m.homeTeamId)?.shortName }}</span><span class="hidden sm:inline">{{ teams.nameOf(m.homeTeamId) }}</span>
                </span>
                <span class="shrink-0 text-zinc-400">vs</span>
                <span class="truncate font-semibold">
                  <span class="sm:hidden">{{ teams.get(m.awayTeamId)?.shortName }}</span><span class="hidden sm:inline">{{ teams.nameOf(m.awayTeamId) }}</span>
                </span>
                <TeamLogo :team="teams.get(m.awayTeamId)" size="xs" />
              </div>
              <span class="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-600">J{{ m.round }}</span>
            </li>
          </ul>
          <EmptyState v-else :icon="CalendarClock" title="Sin partidos programados" compact class="card">
            <AppButton v-if="selectedId" :to="{ name: 'admin-tournament-schedule', params: { id: selectedId } }" variant="secondary" size="sm">
              <Plus class="size-3.5" aria-hidden="true" /> Organizar calendario
            </AppButton>
          </EmptyState>
        </section>
      </div>

      </template>

      <section v-if="USE_MOCKS" class="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-semibold">Modo demostración</p>
          <p class="text-sm text-zinc-500">Los cambios se guardan en este navegador (localStorage). Puedes volver al estado inicial cuando quieras.</p>
        </div>
        <AppButton variant="secondary" :loading="resetting" @click="resetDemo">
          <RotateCcw v-if="!resetting" class="size-4" aria-hidden="true" /> Restablecer demo
        </AppButton>
      </section>
    </div>
  </div>
</template>
