<script setup lang="ts">
import { computed } from 'vue'
import { CalendarX, Shield, Target, Trophy } from 'lucide-vue-next'
import { useTeamProfile } from '@/composables/useTeamProfile'
import { usePageTitle } from '@/composables/usePageTitle'
import { trackViewOnce } from '@/services/analytics'
import TeamHero from '@/components/teams/profile/TeamHero.vue'
import TeamRecordCard from '@/components/teams/profile/TeamRecordCard.vue'
import TeamCompetitionCard from '@/components/teams/profile/TeamCompetitionCard.vue'
import TeamMatchList from '@/components/teams/profile/TeamMatchList.vue'
import TeamPlayerBoards from '@/components/teams/profile/TeamPlayerBoards.vue'
import TeamRecords from '@/components/teams/profile/TeamRecords.vue'
import TeamHistory from '@/components/teams/profile/TeamHistory.vue'
import TeamHonours from '@/components/teams/profile/TeamHonours.vue'
import TeamCurrentRoster from '@/components/teams/profile/TeamCurrentRoster.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

/**
 * Perfil público del equipo: su identidad histórica a través de todas las competiciones en las
 * que participó. El mismo Team en varios torneos es UN perfil. Dos plantillas distintas:
 * - "Plantilla actual": la GLOBAL (quién pertenece hoy al equipo), si el equipo la mantiene;
 * - la de cada torneo (con dorsal y partidos), dentro de su competición.
 */
const props = defineProps<{ id: string }>()

const { profile, loading, error, notFound, reload, matches, totalMatches, hasMoreMatches, loadingMore, loadMoreMatches } =
  useTeamProfile(() => props.id)
usePageTitle(() => profile.value?.team.name)

// Analítica: solo con el perfil cargado (404/errores → null). Sin nombre del equipo.
trackViewOnce('team_profile_viewed', () => (!loading.value && !error.value && !notFound.value ? profile.value?.team.id : null), () => ({
  team_id: profile.value!.team.id,
  competition_count: profile.value!.competitions.length,
  current_competition_count: profile.value!.competitions.filter((c) => c.current).length,
  matches_played: profile.value!.record.played,
  has_global_roster: profile.value!.currentRoster.length > 0,
}))

const current = computed(() => profile.value?.competitions.filter((c) => c.current) ?? [])
const color = computed(() => profile.value?.team.colors.primary ?? '#143d2a')
</script>

<template>
  <div>
    <div v-if="loading || notFound || !profile" class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="reload" />
      <EmptyState v-else :icon="Shield" title="Equipo no encontrado" description="El perfil no existe o fue eliminado." class="card">
        <RouterLink :to="{ name: 'tournaments' }" class="btn btn-secondary">Ver torneos</RouterLink>
      </EmptyState>
    </div>

    <template v-else>
      <TeamHero :team="profile.team" :current="current" />

      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <TeamRecordCard :record="profile.record" :form="profile.form" class="relative -mt-12 sm:-mt-14" />

        <TeamHonours :honors="profile.honors" :runner-ups="profile.runnerUps" :color="color" class="mt-8" />

        <section v-if="profile.record.played" aria-labelledby="records-title" class="mt-8">
          <h2 id="records-title" class="display mb-3 text-2xl">Récords</h2>
          <TeamRecords :records="profile.records" :team-id="profile.team.id" :color="color" />
        </section>

        <div class="grid grid-cols-1 gap-10 py-8 lg:grid-cols-[1.5fr_1fr]">
          <div class="min-w-0 space-y-10">
            <section v-if="profile.currentRoster.length" aria-labelledby="current-roster-title">
              <h2 id="current-roster-title" class="display text-2xl">Plantilla actual</h2>
              <p class="mb-3 text-sm text-zinc-500">
                {{ profile.currentRoster.length }} {{ profile.currentRoster.length === 1 ? 'jugador pertenece' : 'jugadores pertenecen' }} hoy al equipo. La plantilla de cada torneo está en su competición.
              </p>
              <TeamCurrentRoster :roster="profile.currentRoster" />
            </section>

            <section aria-labelledby="competitions-title">
              <h2 id="competitions-title" class="display mb-3 text-2xl">Competiciones</h2>
              <div v-if="profile.competitions.length" class="space-y-4">
                <TeamCompetitionCard v-for="c in profile.competitions" :key="c.tournament.id" :competition="c" :color="color" />
              </div>
              <EmptyState
                v-else
                :icon="Trophy"
                title="Todavía sin competiciones"
                description="Aparecerán aquí cuando un organizador lo inscriba en su torneo."
                class="card"
              />
            </section>

            <section v-if="profile.upcomingMatches.length" aria-labelledby="upcoming-title">
              <h2 id="upcoming-title" class="display mb-3 text-2xl">Próximos partidos</h2>
              <TeamMatchList :matches="profile.upcomingMatches" :team-id="profile.team.id" />
            </section>

            <section aria-labelledby="recent-title">
              <h2 id="recent-title" class="display mb-3 text-2xl">Partidos recientes</h2>
              <TeamMatchList
                v-if="matches.length"
                :matches="matches"
                :team-id="profile.team.id"
                :total="totalMatches"
                :has-more="hasMoreMatches"
                :loading="loadingMore"
                @more="loadMoreMatches"
              />
              <EmptyState v-else :icon="CalendarX" title="Aún sin partidos" description="Aparecerán en cuanto dispute su primer partido oficial." class="card" />
            </section>
          </div>

          <aside class="min-w-0 space-y-10">
            <section aria-labelledby="players-stats-title">
              <h2 id="players-stats-title" class="display mb-1 text-2xl">Jugadores del equipo</h2>
              <p class="mb-3 text-xs text-zinc-500">Lo hecho con esta camiseta, en todas sus competiciones. "Ver todos" muestra la lista completa.</p>
              <TeamPlayerBoards v-if="profile.playerStats.length" :stats="profile.playerStats" />
              <EmptyState v-else :icon="Target" title="Aún sin estadísticas de jugadores" compact class="card" />
            </section>
            <section v-if="profile.history.length" aria-labelledby="history-title">
              <h2 id="history-title" class="display mb-3 text-2xl">Historial</h2>
              <TeamHistory :history="profile.history" />
            </section>
          </aside>
        </div>
      </div>
    </template>
  </div>
</template>
