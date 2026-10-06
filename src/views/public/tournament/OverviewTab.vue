<script setup lang="ts">
import { computed } from 'vue'
import { Goal, Shield } from 'lucide-vue-next'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentStructure } from '@/composables/useTournamentStructure'
import { useTournamentChampion } from '@/composables/useTournamentChampion'
import ChampionBanner from '@/components/tournaments/ChampionBanner.vue'
import BracketView from '@/components/tournaments/structure/BracketView.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StandingsTable from '@/components/tournaments/StandingsTable.vue'
import TopScorersTable from '@/components/tournaments/TopScorersTable.vue'
import MatchCard from '@/components/matches/MatchCard.vue'
import TrackedTeamsSection from '@/components/tournaments/tracking/TrackedTeamsSection.vue'

const props = defineProps<{ id: string }>()
// Vista pública: en seguimiento parcial solo cuentan los partidos de equipos seguidos (6G).
const stats = useTournamentStats(() => props.id, { publicView: true })

const currentRound = computed(() => stats.rounds.value.find((r) => r.round === stats.currentRound.value))
const roundMatches = computed(() => currentRound.value?.matches ?? [])
const finished = computed(() => stats.tournament.value?.status === 'finished')
const partial = stats.partial
// Campeón oficial y eliminatoria: los calcula el servidor (nunca en seguimiento parcial).
const { structure } = useTournamentStructure(() => props.id, () => !partial.value)
const { champion, detail, knockout } = useTournamentChampion(structure)
/** Seguimiento parcial: en lugar de tabla y goleadores, los últimos partidos registrados. */
const latestResults = computed(() => stats.matches.value.filter((m) => m.status === 'finished').slice(-6).reverse())
</script>

<template>
  <div class="space-y-10">
    <EmptyState
      v-if="!stats.teams.value.length"
      :icon="Shield"
      title="Este torneo aún no tiene equipos"
      description="Cuando el organizador inscriba equipos y programe partidos, aquí verás la tabla y los resultados."
      class="card"
    />

    <template v-else>
      <ChampionBanner v-if="champion" :team="champion" :detail="detail" />

      <section v-if="knockout && structure" aria-label="Eliminatoria">
        <SectionHeader title="Eliminatoria" link-label="Ver competición" :to="{ name: 'tournament-standings', params: { id } }" />
        <BracketView :phase="knockout" :teams="structure.teams" />
      </section>

      <TrackedTeamsSection v-if="partial" :tournament-id="id" />

      <section v-if="roundMatches.length && !finished" aria-label="Jornada actual">
        <SectionHeader :title="currentRound?.label ?? ''" link-label="Calendario" :to="{ name: 'tournament-matches', params: { id } }" />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <MatchCard v-for="m in roundMatches" :key="m.id" :match="m" />
        </div>
      </section>

      <section v-if="partial && latestResults.length" aria-label="Últimos resultados">
        <SectionHeader title="Últimos resultados" link-label="Todos los partidos" :to="{ name: 'tournament-matches', params: { id } }" />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <MatchCard v-for="m in latestResults" :key="m.id" :match="m" />
        </div>
      </section>

      <div v-if="!partial" class="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr]">
        <section aria-label="Tabla de posiciones">
          <SectionHeader :title="finished ? 'Tabla final' : 'Tabla'" link-label="Completa" :to="{ name: 'tournament-standings', params: { id } }" />
          <div class="card overflow-hidden">
            <StandingsTable :standings="stats.standings.value" compact />
          </div>
        </section>
        <section aria-label="Goleadores">
          <SectionHeader title="Goleadores" link-label="Estadísticas" :to="{ name: 'tournament-standings', params: { id }, hash: '#estadisticas' }" />
          <div class="card overflow-hidden">
            <TopScorersTable v-if="stats.topScorers.value.length" :scorers="stats.topScorers.value.slice(0, 5)" />
            <EmptyState v-else :icon="Goal" title="Aún no hay goles registrados" compact />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
