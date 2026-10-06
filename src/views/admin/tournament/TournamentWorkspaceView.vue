<script setup lang="ts">
import { computed } from 'vue'
import { useMatchesStore } from '@/stores'
import { Archive, ChevronLeft, ExternalLink, Eye, Lock, Play, Trophy } from 'lucide-vue-next'
import { useAdminData } from '@/composables/useLeagueData'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useTournamentLifecycle } from '@/composables/useTournamentLifecycle'
import { usePageTitle } from '@/composables/usePageTitle'
import { DATA_COVERAGE_LABEL, MODALITY_LABELS, TOURNAMENT_STATUS } from '@/utils/labels'
import { formatDateRange } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TabNav from '@/components/common/TabNav.vue'
import AppButton from '@/components/common/AppButton.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FinishTournamentDialog from '@/components/admin/workspace/FinishTournamentDialog.vue'

/**
 * Workspace del torneo: el contexto principal del panel. Todo lo que el organizador hace
 * (equipos, plantillas, calendario, resultados, tabla, cierre) ocurre dentro de su torneo.
 */
const props = defineProps<{ id: string }>()

const { loading, error, reload } = useAdminData()
const { tournament, isMine, readOnly } = useTournamentWorkspace(() => props.id)
const { start } = useTournamentLifecycle()
const matches = useMatchesStore()
/** "Iniciar" en la cabecera solo cuando ya hay calendario; antes, la guía marca el paso siguiente. */
const canStart = computed(() => tournament.value?.status === 'draft' && matches.ofTournament(props.id).length > 0)
usePageTitle(() => (tournament.value ? `${tournament.value.name} · Panel` : undefined))

const partial = computed(() => tournament.value?.dataCoverage === 'partial')

// Seguimiento parcial: sin Tabla/Competición ni Goleadores (rankings globales engañosos).
const tabs = computed(() => {
  const params = { id: props.id }
  const all = [
    { label: 'Resumen', to: { name: 'admin-tournament', params } },
    { label: 'Equipos', to: { name: 'admin-tournament-teams', params }, exact: false },
    { label: 'Jugadores', to: { name: 'admin-tournament-players', params } },
    { label: 'Calendario', to: { name: 'admin-tournament-schedule', params } },
    { label: tournament.value?.settings.system && tournament.value.settings.system !== 'league' ? 'Competición' : 'Tabla', to: { name: 'admin-tournament-standings', params }, global: true },
    { label: 'Goleadores', to: { name: 'admin-tournament-scorers', params }, global: true },
    { label: 'Inscripciones', to: { name: 'admin-tournament-registration', params } },
    { label: 'Configuración', to: { name: 'admin-tournament-settings', params } },
  ]
  return all.filter((t) => !(partial.value && t.global)).map(({ label, to, exact }) => ({ label, to, exact }))
})
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'admin-tournaments' }" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-900">
      <ChevronLeft class="size-4" aria-hidden="true" /> Mis torneos
    </RouterLink>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />
    <EmptyState v-else-if="!tournament" :icon="Trophy" title="Torneo no encontrado" class="card">
      <AppButton :to="{ name: 'admin-tournaments' }" variant="secondary">Ver mis torneos</AppButton>
    </EmptyState>
    <EmptyState
      v-else-if="!isMine"
      :icon="Lock"
      title="Este torneo lo administra otro organizador"
      description="Puedes verlo en su página pública, pero solo su organizador puede gestionarlo."
      class="card"
    >
      <AppButton :to="{ name: 'tournament', params: { id } }" variant="secondary">Ver página pública</AppButton>
    </EmptyState>

    <template v-else>
      <header class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge v-bind="TOURNAMENT_STATUS[tournament.status]" :pulse="tournament.status === 'active'" />
            <span class="text-xs font-semibold text-zinc-500">
              {{ MODALITY_LABELS[tournament.modality] }} · {{ tournament.category }} · {{ formatDateRange(tournament.startDate, tournament.endDate) }}
            </span>
            <RouterLink
              :to="{ name: 'admin-tournament-settings', params: { id } }"
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="partial ? 'bg-amber-100 text-amber-900' : 'bg-zinc-200/70 text-zinc-700'"
            >
              Cobertura: {{ DATA_COVERAGE_LABEL[tournament.dataCoverage] }}<template v-if="partial"> · {{ tournament.trackedTeamIds.length ? `${tournament.trackedTeamIds.length} en seguimiento` : 'sin equipos en seguimiento' }}</template>
            </RouterLink>
          </div>
          <h1 class="display text-3xl leading-none text-zinc-950 sm:text-4xl">{{ tournament.name }}</h1>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <AppButton v-if="canStart" @click="start(tournament.id)">
            <Play class="size-4" aria-hidden="true" /> Iniciar torneo
          </AppButton>
          <AppButton variant="secondary" :to="{ name: 'tournament', params: { id } }">
            <ExternalLink class="size-4" aria-hidden="true" /> Página pública
          </AppButton>
        </div>
      </header>

      <div v-if="readOnly" class="mb-4 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" role="status">
        <Archive class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Torneo finalizado.</strong> Es parte del historial de sus equipos y jugadores: puedes consultarlo todo, pero
          ya no se capturan resultados ni se cambian plantillas o calendario.
        </p>
      </div>

      <p v-if="partial" class="mb-4 flex items-start gap-2 text-sm text-zinc-600">
        <Eye class="mt-0.5 size-4 shrink-0 text-pitch-700" aria-hidden="true" />
        <span>Seguimiento parcial: registras partidos, resultados y estadísticas como siempre, pero no se muestran tabla ni goleadores generales.</span>
      </p>
      <TabNav :tabs="tabs" label="Secciones del torneo" class="mb-6" />
      <RouterView />
      <FinishTournamentDialog />
    </template>
  </div>
</template>
