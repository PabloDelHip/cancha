<script setup lang="ts">
import { computed } from 'vue'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentStructure } from '@/composables/useTournamentStructure'
import CompetitionView from '@/components/tournaments/structure/CompetitionView.vue'
import TournamentStatsBoards from '@/components/tournaments/TournamentStatsBoards.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { pointsRuleLabel } from '@/utils/labels'

const props = defineProps<{ id: string }>()
const { pointsRule, tournament } = useTournamentStats(() => props.id)
const { structure, loading, error, reload } = useTournamentStructure(() => props.id)
const system = computed(() => tournament.value?.settings.system ?? 'league')
</script>

<template>
  <div class="space-y-12">
    <section aria-label="Competición" class="space-y-6">
      <LoadingState v-if="loading" label="Cargando competición…" />
      <ErrorState v-else-if="error" :message="error" @retry="reload" />
      <CompetitionView v-else-if="structure" :structure="structure" />
      <p v-if="system !== 'knockout'" class="mt-4 text-xs text-zinc-500">
        {{ pointsRuleLabel(pointsRule) }} · Desempate: DG, GF · Solo partidos finalizados
      </p>
    </section>
    <section id="estadisticas" aria-labelledby="stats-title" class="scroll-mt-24">
      <h2 id="stats-title" class="display mb-4 text-3xl">Estadísticas</h2>
      <TournamentStatsBoards :tournament-id="id" />
    </section>
  </div>
</template>
