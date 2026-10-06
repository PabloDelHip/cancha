<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Eye, Trophy } from 'lucide-vue-next'
import { useLeagueData } from '@/composables/useLeagueData'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { usePageTitle } from '@/composables/usePageTitle'
import { trackViewOnce } from '@/services/analytics'
import { PARTIAL_COVERAGE_NOTICE } from '@/utils/labels'
import TournamentHero from '@/components/tournaments/TournamentHero.vue'
import { leagueService } from '@/services'
import TabNav from '@/components/common/TabNav.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{ id: string }>()

const { loading, error, reload } = useLeagueData()
// Vista pública: en seguimiento parcial las cifras solo cuentan partidos de equipos seguidos.
const { tournament, partial, teams, matches, playedCount, totalGoals, standings } = useTournamentStats(() => props.id, { publicView: true })
/** Liga del torneo (enlace en la portada). */
const league = ref<{ id: string; name: string } | null>(null)
watch(
  () => tournament.value?.leagueId,
  async (id) => {
    league.value = null
    if (!id) return
    try {
      const l = await leagueService.get(id)
      if (id === tournament.value?.leagueId) league.value = { id: l.id, name: l.name }
    } catch {
      // Sin liga visible: la portada se ve igual.
    }
  },
  { immediate: true },
)
/** Líder (o campeón) de la tabla: solo en liga, con cobertura completa y partidos jugados. */
const leader = computed(() => {
  if (partial.value || tournament.value?.settings.system !== 'league' || !playedCount.value) return null
  const standing = standings.value[0]
  const team = standing && teams.value.find((t) => t.id === standing.teamId)
  return standing && team ? { standing, team } : null
})
usePageTitle(() => tournament.value?.name)

// Analítica: una vez por torneo cargado (no por pestaña ni re-render; nunca si no existe o falla).
trackViewOnce('tournament_viewed', () => (!loading.value && !error.value && tournament.value ? tournament.value.id : null), () => ({
  tournament_id: tournament.value!.id,
  tournament_status: tournament.value!.status,
  competition_system: tournament.value!.settings.system,
  data_coverage: tournament.value!.dataCoverage,
  tracked_team_count: tournament.value!.trackedTeamIds.length,
}))

// Seguimiento parcial: sin Tabla/Competición ni Goleadores (rankings globales), sin huecos.
const tabs = computed(() =>
  [
    { label: 'Resumen', to: { name: 'tournament', params: { id: props.id } } },
    // Tabla o cuadro + estadísticas (goleadores, porteros, defensa, disciplina).
    { label: 'Competición', to: { name: 'tournament-standings', params: { id: props.id } }, global: true },
    { label: 'Partidos', to: { name: 'tournament-matches', params: { id: props.id } } },
    { label: 'Equipos', to: { name: 'tournament-teams', params: { id: props.id } } },
  ]
    .filter((t) => !(partial.value && t.global))
    .map(({ label, to }) => ({ label, to })),
)
</script>

<template>
  <div>
    <div v-if="loading || error || !tournament" class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="reload" />
      <EmptyState
        v-else
        :icon="Trophy"
        title="Torneo no encontrado"
        description="Puede que haya sido eliminado o que el enlace sea incorrecto."
        class="card"
      >
        <RouterLink :to="{ name: 'tournaments' }" class="btn btn-secondary">Ver torneos</RouterLink>
      </EmptyState>
    </div>

    <template v-else>
      <TournamentHero :tournament="tournament" :teams="teams" :played="playedCount" :scheduled="matches.length" :goals="totalGoals" :leader="leader" :league="league" />
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <aside v-if="partial" class="mb-5 flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-sm sm:max-w-2xl" aria-label="Seguimiento parcial">
          <Eye class="mt-0.5 size-4 shrink-0 text-pitch-700" aria-hidden="true" />
          <p class="text-zinc-600"><strong class="font-semibold text-zinc-900">Seguimiento parcial.</strong> {{ PARTIAL_COVERAGE_NOTICE }}</p>
        </aside>
        <TabNav :tabs="tabs" label="Secciones del torneo" class="mb-6" />
        <RouterView />
      </div>
    </template>
  </div>
</template>
