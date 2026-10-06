<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import type { ID } from '@/types'
import { useTrackedSummary } from '@/composables/useTrackedSummary'
import { useTournamentStats } from '@/composables/useTournamentStats'
import TrackedTeamCard from './TrackedTeamCard.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

/** "Equipos en seguimiento" (6G): una sola petición para todas las tarjetas. */
const props = withDefaults(defineProps<{ tournamentId: ID; titleTag?: 'h2' | 'h3' }>(), { titleTag: 'h2' })
const { tournament } = useTournamentStats(() => props.tournamentId)
const { summary, loading, error, reload } = useTrackedSummary(() => props.tournamentId)
</script>

<template>
  <section aria-labelledby="tracked-title">
    <component :is="titleTag" id="tracked-title" class="display mb-3 text-2xl">Equipos en seguimiento</component>
    <EmptyState
      v-if="!tournament?.trackedTeamIds.length"
      :icon="Eye"
      title="Aún no se han seleccionado equipos para seguimiento"
      description="Cuando el organizador elija los equipos que Cancha sigue en esta competición, aparecerán aquí con sus partidos."
      class="card"
      compact
    />
    <LoadingState v-else-if="loading && !summary" label="Cargando equipos…" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />
    <div v-else-if="summary" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <TrackedTeamCard v-for="c in summary.trackedTeams" :key="c.team.id" :card="c" />
    </div>
  </section>
</template>
