<script setup lang="ts">
import { computed } from 'vue'
import { CalendarX, Shirt, UserX } from 'lucide-vue-next'
import { usePlayerProfile } from '@/composables/usePlayerProfile'
import { usePageTitle } from '@/composables/usePageTitle'
import { trackViewOnce } from '@/services/analytics'
import { fullName } from '@/utils/players'
import PlayerHero from '@/components/players/profile/PlayerHero.vue'
import PlayerCareerStats from '@/components/players/profile/PlayerCareerStats.vue'
import PlayerCurrentTeams from '@/components/players/profile/PlayerCurrentTeams.vue'
import PlayerTrophyCabinet from '@/components/players/profile/PlayerTrophyCabinet.vue'
import PlayerBestPerformances from '@/components/players/profile/PlayerBestPerformances.vue'
import PlayerYearChart from '@/components/players/profile/PlayerYearChart.vue'
import PlayerRecords from '@/components/players/profile/PlayerRecords.vue'
import PlayerTeamSplit from '@/components/players/profile/PlayerTeamSplit.vue'
import PlayerMilestones from '@/components/players/profile/PlayerMilestones.vue'
import PlayerCompetitionCard from '@/components/players/profile/PlayerCompetitionCard.vue'
import PlayerRecentMatches from '@/components/players/profile/PlayerRecentMatches.vue'
import PlayerCareerTimeline from '@/components/players/profile/PlayerCareerTimeline.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

/**
 * Perfil público del jugador: su identidad y su carrera deportiva en Kisokar. No requiere sesión
 * ni depende del panel: el mismo Player se ve igual sin importar qué organizador lo registró.
 * Todo lo deportivo lo calcula el servidor en UNA petición (GET /players/:id/profile) a partir de
 * partidos oficiales; la vista solo lo representa y nada aquí es editable. "Ver más partidos"
 * pagina aparte (GET /players/:id/matches).
 *
 * Orden (móvil primero): identidad → carrera → dónde juega → palmarés → rendimiento → trayectoria
 * → competiciones → partidos. Capas futuras (social, datos personales del jugador) entran en los
 * slots del hero y como secciones nuevas, sin rehacer esta estructura.
 */
const props = defineProps<{ id: string }>()

const { profile, loading, error, notFound, reload, matches, totalMatches, hasMoreMatches, loadingMore, loadMoreMatches } =
  usePlayerProfile(() => props.id)
usePageTitle(() => (profile.value ? fullName(profile.value.player) : undefined))

// Analítica: solo con el perfil cargado (404/errores → null). Sin nombre ni edad del jugador.
trackViewOnce('player_profile_viewed', () => (!loading.value && !error.value && !notFound.value ? profile.value?.player.id : null), () => ({
  player_id: profile.value!.player.id,
  competition_count: profile.value!.career.competitions,
  appearances: profile.value!.career.appearances,
  team_count: profile.value!.career.teams,
  current_participation_count: profile.value!.currentParticipations.length,
}))

const lastTeam = computed(() => profile.value?.competitions[0]?.teams[0]?.team)
const played = computed(() => (profile.value?.career.appearances ?? 0) > 0)
/** Hitos: los generales y, si es portero, los del puesto (más reciente primero). */
const milestones = computed(() =>
  [...(profile.value?.milestones ?? []), ...(profile.value?.goalkeeping?.milestones ?? [])].sort((a, b) => `${b.match.date}${b.match.time}`.localeCompare(`${a.match.date}${a.match.time}`)),
)
</script>

<template>
  <div>
    <div v-if="loading || notFound || !profile" class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="reload" />
      <EmptyState v-else :icon="UserX" title="Jugador no encontrado" description="El perfil no existe o fue eliminado." class="card">
        <RouterLink :to="{ name: 'players' }" class="btn btn-secondary">Buscar jugadores</RouterLink>
      </EmptyState>
    </div>

    <template v-else>
      <PlayerHero :player="profile.player" :current="profile.currentParticipations" :last-team="lastTeam" />

      <div class="mx-auto max-w-6xl space-y-10 px-4 pb-12 sm:px-6">
        <PlayerCareerStats :career="profile.career" :form="profile.form" :keeper="profile.goalkeeping?.career" class="relative -mt-12 sm:-mt-14" />

        <PlayerCurrentTeams :current="profile.currentParticipations" :last-match="profile.recentMatches[0]" />

        <PlayerTrophyCabinet :honors="profile.honors" />

        <!-- Rendimiento: todo derivado de sus partidos oficiales -->
        <section aria-labelledby="performance-title">
          <h2 id="performance-title" class="display mb-3 text-2xl">Rendimiento</h2>
          <template v-if="played">
            <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div class="min-w-0 space-y-3">
                <template v-if="profile.goalkeeping">
                  <h3 class="eyebrow">Mejores partidos · porterías en cero</h3>
                  <PlayerBestPerformances v-if="profile.goalkeeping.bestMatches.length" :matches="profile.goalkeeping.bestMatches" keeper />
                  <p v-else class="card px-4 py-3 text-sm text-zinc-500">Aún sin porterías en cero en partidos oficiales.</p>
                </template>
                <template v-else>
                  <h3 class="eyebrow">Mejores actuaciones</h3>
                  <PlayerBestPerformances v-if="profile.bestPerformances.length" :matches="profile.bestPerformances" />
                  <p v-else class="card px-4 py-3 text-sm text-zinc-500">Aún sin goles ni asistencias en partidos oficiales.</p>
                </template>
              </div>
              <div class="min-w-0 space-y-6">
                <div class="space-y-3">
                  <h3 class="eyebrow">Evolución por año</h3>
                  <PlayerYearChart :years="profile.byYear" :keeper="profile.goalkeeping?.byYear" />
                </div>
                <div class="space-y-3">
                  <h3 class="eyebrow">Récords personales</h3>
                  <PlayerRecords :records="profile.records" :keeper="profile.goalkeeping" />
                </div>
              </div>
            </div>
            <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div class="min-w-0 space-y-3">
                <h3 class="eyebrow">Rendimiento por equipo</h3>
                <PlayerTeamSplit :teams="profile.byTeam" :keeper="profile.goalkeeping?.byTeam" />
              </div>
              <div class="min-w-0 space-y-3">
                <h3 class="eyebrow">Hitos en Kisokar</h3>
                <PlayerMilestones :milestones="milestones" />
              </div>
            </div>
          </template>
          <EmptyState
            v-else
            :icon="CalendarX"
            title="Su carrera empieza con el primer partido"
            description="Mejores actuaciones, evolución por año, récords e hitos aparecerán en cuanto dispute su primer partido oficial."
            class="card"
            compact
          />
        </section>

        <div class="grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr]">
          <!-- En móvil la trayectoria va antes que el detalle por competición y los partidos. -->
          <aside class="order-first min-w-0 space-y-10 lg:order-none lg:col-start-2 lg:row-start-1">
            <section aria-labelledby="career-history-title">
              <h2 id="career-history-title" class="display mb-3 text-2xl">Trayectoria</h2>
              <PlayerCareerTimeline v-if="profile.history.length" :history="profile.history" />
              <p v-else class="card px-4 py-3 text-sm text-zinc-500">Sin equipos todavía: aparecerán cuando un organizador lo inscriba.</p>
            </section>
          </aside>

          <div class="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
            <section aria-labelledby="competitions-title">
              <h2 id="competitions-title" class="display mb-3 text-2xl">Competiciones</h2>
              <div v-if="profile.competitions.length" class="space-y-4">
                <PlayerCompetitionCard
                  v-for="c in profile.competitions"
                  :key="c.tournament.id"
                  :competition="c"
                  :keeper="profile.goalkeeping?.byTournament.find((k) => k.tournamentId === c.tournament.id)"
                />
              </div>
              <EmptyState
                v-else
                :icon="Shirt"
                title="Todavía sin competiciones"
                description="Sus torneos y estadísticas aparecerán aquí cuando un organizador lo registre en su plantilla."
                class="card"
              />
            </section>

            <section aria-labelledby="recent-title">
              <h2 id="recent-title" class="display mb-3 text-2xl">Partidos recientes</h2>
              <PlayerRecentMatches
                v-if="matches.length"
                :matches="matches"
                :total="totalMatches"
                :has-more="hasMoreMatches"
                :loading="loadingMore"
                @more="loadMoreMatches"
              />
              <EmptyState
                v-else
                :icon="CalendarX"
                title="Aún sin partidos"
                description="Aparecerán en cuanto dispute su primer partido oficial."
                class="card"
              />
            </section>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
