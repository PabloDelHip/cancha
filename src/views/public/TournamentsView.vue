<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trophy } from 'lucide-vue-next'
import type { TournamentStatus } from '@/types'
import { useTournamentsStore } from '@/stores'
import { useLeagueData } from '@/composables/useLeagueData'
import { TOURNAMENT_STATUS } from '@/utils/labels'
import PageHeader from '@/components/common/PageHeader.vue'
import TournamentCard from '@/components/tournaments/TournamentCard.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const { loading, error, reload } = useLeagueData()
const tournaments = useTournamentsStore()

const filter = ref<TournamentStatus | 'all'>('all')
const filters: { value: TournamentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: TOURNAMENT_STATUS.active.label },
  { value: 'finished', label: 'Finalizados' },
  { value: 'draft', label: 'Próximos' },
]
const visible = computed(() =>
  tournaments.sorted.filter((t) => filter.value === 'all' || t.status === filter.value),
)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title="Torneos" subtitle="Ligas y copas de fútbol amateur en la plataforma." />

    <div role="radiogroup" aria-label="Filtrar por estado" class="mb-6 flex flex-wrap gap-2">
      <button
        v-for="f in filters"
        :key="f.value"
        type="button"
        role="radio"
        :aria-checked="filter === f.value"
        class="h-9 rounded-full border px-4 text-sm font-semibold transition-colors"
        :class="filter === f.value ? 'border-pitch-900 bg-pitch-900 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'"
        @click="filter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />
    <div v-else-if="visible.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TournamentCard v-for="t in visible" :key="t.id" :tournament="t" :teams-count="tournaments.teamIdsOf(t.id).length" />
    </div>
    <EmptyState v-else :icon="Trophy" title="No hay torneos en esta categoría" description="Prueba con otro filtro." class="card" />
  </div>
</template>
