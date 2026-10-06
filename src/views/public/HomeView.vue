<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CalendarClock, Goal, Radio } from 'lucide-vue-next'
import { useMatchesStore, usePlayersStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useLeagueData } from '@/composables/useLeagueData'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { isPubliclyTracked } from '@/utils/coverage'
import type { Match } from '@/types'
import TournamentCard from '@/components/tournaments/TournamentCard.vue'
import StandingsTable from '@/components/tournaments/StandingsTable.vue'
import MatchCard from '@/components/matches/MatchCard.vue'
import PlayerHighlightCard from '@/components/players/PlayerHighlightCard.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const { loading, error, reload } = useLeagueData()
const tournaments = useTournamentsStore()
const matches = useMatchesStore()
const players = usePlayersStore()
const teams = useTeamsStore()

// Destacado: preferentemente uno con cobertura completa (los parciales no tienen tabla general).
const featured = computed(() => tournaments.active.find((t) => t.dataCoverage !== 'partial') ?? tournaments.active[0])
const featuredStats = useTournamentStats(() => featured.value?.id ?? '', { publicView: true })
// Seguimiento parcial (6G): fuera los partidos entre equipos no seguidos.
const visible = (m: Match) => isPubliclyTracked(m, tournaments.get(m.tournamentId))
const recent = computed(() => matches.recent.filter(visible).slice(0, 4))
const upcoming = computed(() => matches.upcoming.filter(visible).slice(0, 4))
const topPlayers = computed(() => featuredStats.topScorers.value.slice(0, 4))
</script>

<template>
  <div>
    <!-- Hero compacto: presenta y lleva directo al torneo en curso -->
    <section class="relative overflow-hidden bg-pitch-950 text-white">
      <svg class="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 300">
        <g fill="none" stroke="#fff" stroke-width="2">
          <rect x="20" y="20" width="760" height="260" />
          <line x1="400" y1="20" x2="400" y2="280" />
          <circle cx="400" cy="150" r="55" />
          <rect x="20" y="85" width="90" height="130" />
          <rect x="690" y="85" width="90" height="130" />
        </g>
      </svg>
      <div class="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr] md:items-center md:py-14">
        <div>
          <p class="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-lime-300">
            Fútbol amateur · Mazatlán
          </p>
          <h1 class="display text-4xl leading-[0.95] sm:text-6xl">
            Cada partido<br />cuenta tu <span class="text-lime-400">historia</span>.
          </h1>
          <p class="mt-4 max-w-md text-pitch-200">
            Resultados, tablas y estadísticas de tus torneos. Y un perfil deportivo que crece con cada gol.
          </p>
          <div class="mt-6 flex flex-wrap gap-2">
            <RouterLink :to="{ name: 'tournaments' }" class="btn btn-accent">
              Ver torneos <ArrowRight class="size-4" aria-hidden="true" />
            </RouterLink>
            <RouterLink :to="{ name: 'players' }" class="btn border border-white/20 text-white hover:bg-white/10">
              Buscar jugador
            </RouterLink>
          </div>
        </div>

        <RouterLink
          v-if="featured"
          :to="{ name: 'tournament', params: { id: featured.id } }"
          class="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10"
        >
          <p class="flex items-center gap-2 text-xs font-semibold tracking-wider text-lime-400 uppercase">
            <span class="size-1.5 animate-pulse rounded-full bg-lime-400" aria-hidden="true" /> En curso
          </p>
          <p class="mt-2 text-xl font-bold group-hover:text-lime-300">{{ featured.name }}</p>
          <dl class="tabular mt-4 grid grid-cols-3 gap-3">
            <div>
              <dt class="text-xs text-pitch-300">Jornada</dt>
              <dd class="font-display text-3xl font-bold">{{ featuredStats.currentRound.value }}</dd>
            </div>
            <div>
              <dt class="text-xs text-pitch-300">Partidos</dt>
              <dd class="font-display text-3xl font-bold">{{ featuredStats.playedCount.value }}</dd>
            </div>
            <div>
              <dt class="text-xs text-pitch-300">Goles</dt>
              <dd class="font-display text-3xl font-bold">{{ featuredStats.totalGoals.value }}</dd>
            </div>
          </dl>
        </RouterLink>
      </div>
    </section>

    <div class="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="reload" />

      <template v-else>
        <section v-if="matches.live.length" aria-labelledby="live-title">
          <h2 id="live-title" class="mb-3 flex items-center gap-2 display text-xl text-red-600 sm:text-2xl">
            <Radio class="size-5" aria-hidden="true" /> En juego
          </h2>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MatchCard v-for="m in matches.live" :key="m.id" :match="m" show-tournament />
          </div>
        </section>

        <section v-if="topPlayers.length" aria-label="Jugadores destacados">
          <SectionHeader title="Jugadores destacados" link-label="Estadísticas" :to="featured ? { name: 'tournament-standings', params: { id: featured.id }, hash: '#estadisticas' } : undefined" />
          <!-- Carrusel horizontal en móvil, rejilla en escritorio -->
          <div class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            <PlayerHighlightCard
              v-for="(s, i) in topPlayers"
              :key="s.playerId"
              class="w-[78%] shrink-0 snap-start sm:w-auto"
              :player="players.get(s.playerId)!"
              :team="teams.get(s.teamId)"
              :goals="s.goals"
              :assists="s.assists"
              :matches="s.matches"
              :rank="i + 1"
            />
          </div>
        </section>

        <div class="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <section aria-label="Resultados recientes">
            <SectionHeader title="Resultados recientes" />
            <div v-if="recent.length" class="space-y-3">
              <MatchCard v-for="m in recent" :key="m.id" :match="m" />
            </div>
            <EmptyState v-else :icon="Goal" title="Aún no hay resultados" compact class="card" />
          </section>
          <section aria-label="Próximos partidos">
            <SectionHeader title="Próximos partidos" />
            <div v-if="upcoming.length" class="space-y-3">
              <MatchCard v-for="m in upcoming" :key="m.id" :match="m" />
            </div>
            <EmptyState v-else :icon="CalendarClock" title="No hay partidos programados" compact class="card" />
          </section>
        </div>

        <div class="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr]">
          <section aria-label="Torneos activos">
            <SectionHeader title="Torneos activos" :to="{ name: 'tournaments' }" />
            <div v-if="tournaments.active.length" class="grid gap-3">
              <TournamentCard v-for="t in tournaments.active" :key="t.id" :tournament="t" :teams-count="tournaments.teamIdsOf(t.id).length" />
            </div>
            <EmptyState v-else title="No hay torneos activos" compact class="card" />
          </section>
          <section v-if="featured && !featuredStats.partial.value" aria-label="Tabla de posiciones">
            <SectionHeader title="Tabla" link-label="Tabla completa" :to="{ name: 'tournament-standings', params: { id: featured.id } }" />
            <div class="card overflow-hidden">
              <StandingsTable :standings="featuredStats.standings.value" compact />
            </div>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>
