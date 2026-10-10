<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, ExternalLink, LayoutDashboard, Settings, Shield } from 'lucide-vue-next'
import type { Tournament } from '@/types'
import { useMatchesStore, useTournamentsStore } from '@/stores'
import { isPendingCapture } from '@/utils/matches'
import { MODALITY_LABELS, ROLE_LABEL, TOURNAMENT_STATUS } from '@/utils/labels'
import { formatDate, plural } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps<{ tournament: Tournament; leagueName?: string }>()

const tournaments = useTournamentsStore()
const role = computed(() => tournaments.roleOf(props.tournament.id))
const canSchedule = computed(() => (['SCHEDULE', 'ASSIGNMENTS', 'RESULTS'] as const).some((p) => tournaments.can(props.tournament.id, p)))
const matches = useMatchesStore()

const list = computed(() => matches.ofTournament(props.tournament.id).filter((m) => m.status !== 'cancelled'))
const played = computed(() => list.value.filter((m) => m.status === 'finished').length)
const pending = computed(() => list.value.filter((m) => isPendingCapture(m)).length)
const percent = computed(() => (list.value.length ? Math.round((played.value / list.value.length) * 100) : 0))
const teamsCount = computed(() => tournaments.teamIdsOf(props.tournament.id).length)

const accent = computed(
  () => ({ active: 'bg-pitch-600', draft: 'bg-zinc-300', finished: 'bg-sky-500' })[props.tournament.status],
)
</script>

<template>
  <article class="card group relative flex flex-col overflow-hidden transition hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-900/5">
    <span class="absolute inset-x-0 top-0 h-1" :class="accent" aria-hidden="true" />
    <div class="flex items-start justify-between gap-3 p-5 pb-0">
      <StatusBadge v-bind="TOURNAMENT_STATUS[tournament.status]" :pulse="tournament.status === 'active'" />
      <StatusBadge v-if="role && role !== 'OWNER'" :label="ROLE_LABEL[role]" tone="blue" />
      <span v-if="pending" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
        {{ pending }} por capturar
      </span>
    </div>

    <div class="flex-1 p-5 pt-3">
      <h3 class="text-lg leading-snug font-bold text-zinc-950">
        <RouterLink :to="{ name: 'admin-tournament', params: { id: tournament.id } }" class="after:absolute after:inset-0 hover:text-pitch-700">
          {{ tournament.name }}
        </RouterLink>
      </h3>
      <p class="mt-0.5 text-sm text-zinc-500">{{ MODALITY_LABELS[tournament.modality] }} · {{ tournament.category }}</p>
      <p v-if="leagueName" class="mt-1 inline-flex max-w-full items-center rounded-full bg-pitch-50 px-2 py-0.5 text-xs font-semibold text-pitch-800"><span class="truncate">{{ leagueName }}</span></p>

      <div class="mt-5">
        <div class="flex items-baseline justify-between text-xs">
          <span class="font-semibold text-zinc-700">{{ list.length ? `${played} de ${list.length} partidos` : 'Sin partidos todavía' }}</span>
          <span v-if="list.length" class="tabular text-zinc-500">{{ percent }}%</span>
        </div>
        <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
          <div class="h-full rounded-full bg-pitch-600" :style="{ width: `${percent}%` }" />
        </div>
      </div>

      <dl class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600">
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Equipos</dt>
          <Shield class="size-4 text-zinc-400" aria-hidden="true" />
          <dd>{{ plural(teamsCount, 'equipo') }}</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Inicio</dt>
          <CalendarDays class="size-4 text-zinc-400" aria-hidden="true" />
          <dd>{{ formatDate(tournament.startDate) }}</dd>
        </div>
      </dl>
    </div>

    <!-- Acciones: z-10 para quedar por encima del enlace que cubre la tarjeta -->
    <div class="relative z-10 flex items-center gap-1 border-t border-zinc-100 bg-zinc-50/60 px-3 py-2">
      <RouterLink :to="{ name: 'admin-tournament', params: { id: tournament.id } }" class="btn btn-ghost btn-sm text-pitch-700">
        <LayoutDashboard class="size-3.5" aria-hidden="true" /> Administrar
      </RouterLink>
      <RouterLink v-if="canSchedule" :to="{ name: 'admin-tournament-schedule', params: { id: tournament.id } }" class="btn btn-ghost btn-sm">
        <CalendarDays class="size-3.5" aria-hidden="true" /> Calendario
      </RouterLink>
      <RouterLink
        v-if="tournaments.can(tournament.id, 'SETTINGS')"
        :to="{ name: 'admin-tournament-settings', params: { id: tournament.id } }"
        class="btn btn-ghost btn-sm btn-icon"
        :aria-label="`Configurar ${tournament.name}`"
        title="Configuración"
      >
        <Settings class="size-4" aria-hidden="true" />
      </RouterLink>
      <RouterLink
        :to="{ name: 'tournament', params: { id: tournament.id } }"
        class="btn btn-ghost btn-sm btn-icon ml-auto"
        :aria-label="`Ver ${tournament.name} en el sitio público`"
        title="Ver página pública"
      >
        <ExternalLink class="size-4" aria-hidden="true" />
      </RouterLink>
    </div>
  </article>
</template>
