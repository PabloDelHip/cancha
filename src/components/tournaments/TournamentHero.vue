<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, ChevronRight, Crown, MapPin, Medal, Trophy } from 'lucide-vue-next'
import type { Standing, Team, Tournament } from '@/types'
import { MODALITY_LABELS, SYSTEM_LABELS, TOURNAMENT_STATUS } from '@/utils/labels'
import { formatDateRange } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Portada del torneo: identidad (estado, formato, fechas, sede), cifras principales y el líder (o
 * campeón) de la tabla cuando el formato es liga. Mismo lenguaje visual que los perfiles.
 */
const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  played: number
  scheduled: number
  goals: number
  /** Primero de la tabla (solo liga con cobertura completa y partidos jugados). */
  leader?: { standing: Standing; team: Team } | null
  /** Liga a la que pertenece (enlace a su página e histórico). */
  league?: { id: string; name: string } | null
}>()

const progress = computed(() => (props.scheduled ? Math.round((props.played / props.scheduled) * 100) : 0))
const avg = computed(() => (props.played ? (props.goals / props.played).toFixed(1) : '0'))
const finished = computed(() => props.tournament.status === 'finished')
const figures = computed(() => [
  { label: 'Equipos', value: props.teams.length },
  { label: 'Partidos', value: `${props.played}/${props.scheduled}` },
  { label: 'Goles', value: props.goals },
  { label: 'Goles por partido', value: avg.value },
])
</script>

<template>
  <section class="relative overflow-hidden bg-pitch-950 text-white">
    <div class="absolute inset-y-0 right-0 w-2/3 opacity-25" style="background: linear-gradient(110deg, transparent 22%, #a3e635 22.2%, #a3e635 23.5%, transparent 23.7%, transparent 30%, #166534 30.2%)" aria-hidden="true" />
    <Trophy class="pointer-events-none absolute -right-6 -bottom-10 size-56 text-white/5 sm:right-10 sm:size-72" aria-hidden="true" />

    <div class="relative mx-auto max-w-6xl px-4 pt-8 pb-8 sm:px-6 sm:pt-12 sm:pb-10">
      <RouterLink v-if="league" :to="{ name: 'league', params: { id: league.id } }" class="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-lime-300 hover:text-lime-200">
        <Medal class="size-4" aria-hidden="true" /> {{ league.name }} <ChevronRight class="size-4" aria-hidden="true" />
      </RouterLink>
      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge v-bind="TOURNAMENT_STATUS[tournament.status]" :pulse="tournament.status === 'active'" />
        <span class="rounded-full bg-lime-400 px-2 py-0.5 text-xs font-bold text-pitch-950">{{ SYSTEM_LABELS[tournament.settings.system] }}</span>
        <span class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/15">{{ MODALITY_LABELS[tournament.modality] }}</span>
        <span class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/15">{{ tournament.category }}</span>
      </div>

      <h1 class="display mt-3 max-w-4xl text-[2.6rem] leading-[0.92] break-words sm:text-7xl">{{ tournament.name }}</h1>
      <p class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-pitch-200">
        <span class="inline-flex items-center gap-1.5"><CalendarDays class="size-4" aria-hidden="true" /> {{ formatDateRange(tournament.startDate, tournament.endDate) }}</span>
        <span v-if="tournament.venue" class="inline-flex items-center gap-1.5"><MapPin class="size-4" aria-hidden="true" /> {{ tournament.venue }}</span>
      </p>

      <div class="mt-7 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <dl class="grid grid-cols-4 gap-2 sm:max-w-xl sm:gap-3">
          <div v-for="f in figures" :key="f.label" class="rounded-2xl bg-white/[0.07] px-2 py-3 text-center ring-1 ring-white/10 sm:px-3">
            <dt class="text-[10px] leading-tight font-semibold tracking-wider text-pitch-300 uppercase">{{ f.label }}</dt>
            <dd class="tabular mt-1 font-display text-2xl leading-none font-bold sm:text-3xl">{{ f.value }}</dd>
          </div>
        </dl>

        <RouterLink
          v-if="leader"
          :to="{ name: 'team', params: { id: leader.team.id } }"
          class="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-300 px-4 py-3 text-pitch-950 shadow-lg shadow-lime-400/10 transition hover:brightness-105"
        >
          <Crown class="size-6 shrink-0" aria-hidden="true" />
          <TeamLogo :team="leader.team" size="md" />
          <span class="min-w-0">
            <span class="block text-[10px] font-bold tracking-wider uppercase opacity-70">{{ finished ? 'Campeón' : 'Líder' }}</span>
            <span class="block truncate font-display text-xl leading-none font-bold">{{ leader.team.name }}</span>
            <span class="text-xs font-semibold opacity-75">{{ leader.standing.points }} pts · {{ leader.standing.played }} PJ</span>
          </span>
        </RouterLink>
      </div>

      <div v-if="scheduled" class="mt-5 sm:max-w-xl">
        <div class="flex justify-between text-[11px] font-semibold text-pitch-300">
          <span>Avance del torneo</span><span class="tabular">{{ progress }}%</span>
        </div>
        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" aria-label="Avance del torneo">
          <div class="h-full rounded-full bg-lime-400" :style="{ width: `${progress}%` }" />
        </div>
      </div>
    </div>
  </section>
</template>
