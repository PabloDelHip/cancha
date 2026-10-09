<script setup lang="ts">
import { Goal } from 'lucide-vue-next'
import { useTournamentStats } from '@/composables/useTournamentStats'
import TopScorersTable from '@/components/tournaments/TopScorersTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{ id: string }>()
const { topScorers, playedCount } = useTournamentStats(() => props.id)
</script>

<template>
  <section aria-labelledby="sc-title">
    <h2 id="sc-title" class="mb-1 text-xl font-bold">Goleadores</h2>
    <p class="mb-4 text-sm text-zinc-500">Ranking de este torneo · {{ playedCount }} partidos finalizados. Toca un jugador para ver su perfil.</p>
    <div v-if="topScorers.length" class="card overflow-hidden">
      <TopScorersTable :scorers="topScorers" show-assists />
    </div>
    <EmptyState
      v-else
      :icon="Goal"
      title="Aún no hay goles registrados"
      description="Aparecerán aquí en cuanto captures el primer resultado con goleadores."
      class="card"
    />
    <p class="mt-3 text-xs text-zinc-500">Empate en goles: menos partidos jugados, después más asistencias.</p>
  </section>
</template>
