<script setup lang="ts">
import { computed } from 'vue'
import { Goal, Shield } from 'lucide-vue-next'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentStructure } from '@/composables/useTournamentStructure'
import { useTournamentChampion } from '@/composables/useTournamentChampion'
import TournamentAwards from '@/components/tournaments/TournamentAwards.vue'
import BracketView from '@/components/tournaments/structure/BracketView.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StandingsTable from '@/components/tournaments/StandingsTable.vue'
import TopScorersTable from '@/components/tournaments/TopScorersTable.vue'
import MatchCard from '@/components/matches/MatchCard.vue'

const props = defineProps<{ id: string }>()

const stats = useTournamentStats(() => props.id)

const currentRound = computed(() => stats.rounds.value.find((r) => r.round === stats.currentRound.value))
const roundMatches = computed(() => currentRound.value?.matches ?? [])
const finished = computed(() => stats.tournament.value?.status === 'finished')
const { structure } = useTournamentStructure(() => props.id)
const { knockout } = useTournamentChampion(structure)
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
      <TournamentAwards v-if="structure" :structure="structure" />

      <section v-if="knockout && structure" aria-label="Eliminatoria">
        <SectionHeader title="Eliminatoria" link-label="Ver competición" :to="{ name: 'tournament-standings', params: { id } }" />
        <BracketView :phase="knockout" :teams="structure.teams" />
      </section>

      <section v-if="roundMatches.length && !finished" aria-label="Jornada actual">
        <SectionHeader :title="currentRound?.label ?? ''" link-label="Calendario" :to="{ name: 'tournament-matches', params: { id } }" />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <MatchCard v-for="m in roundMatches" :key="m.id" :match="m" />
        </div>
      </section>

      <div class="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr]">
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
