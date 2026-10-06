<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Clock, MapPin } from 'lucide-vue-next'
import type { Match } from '@/types'
import { useRoundsStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { MATCH_STATUS } from '@/utils/labels'
import { formatMatchDay } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

/**
 * Tarjeta de partido: equipos uno sobre otro con su marcador, estado y un botón explícito
 * ("Ver resumen" / "Ver partido") para quien no sabe que toda la tarjeta se puede tocar.
 */
const props = withDefaults(defineProps<{ match: Match; showTournament?: boolean; highlightTeamId?: string }>(), {
  highlightTeamId: undefined,
})

const teams = useTeamsStore()
const tournaments = useTournamentsStore()
const rounds = useRoundsStore()
const home = computed(() => teams.get(props.match.homeTeamId))
const away = computed(() => teams.get(props.match.awayTeamId))
const hasScore = computed(() => props.match.homeScore !== null && props.match.awayScore !== null)
const finished = computed(() => props.match.status === 'finished' && hasScore.value)
const live = computed(() => props.match.status === 'live')
const winner = computed(() => {
  if (!finished.value) return null
  if (props.match.homeScore! > props.match.awayScore!) return 'home'
  if (props.match.homeScore! < props.match.awayScore!) return 'away'
  const p = props.match.penalties
  if (p && p.home !== p.away) return p.home > p.away ? 'home' : 'away'
  return 'draw'
})
const sides = computed(() => [
  { key: 'home' as const, team: home.value, id: props.match.homeTeamId, score: props.match.homeScore, pen: props.match.penalties?.home },
  { key: 'away' as const, team: away.value, id: props.match.awayTeamId, score: props.match.awayScore, pen: props.match.penalties?.away },
])
const cta = computed(() => (finished.value ? 'Ver resumen' : live.value ? 'Seguir en vivo' : 'Ver partido'))
const a11yLabel = computed(() => {
  const score = hasScore.value ? `${props.match.homeScore} a ${props.match.awayScore}` : `${props.match.time} horas`
  return `${home.value?.name} contra ${away.value?.name}, ${score}, ${MATCH_STATUS[props.match.status].label}. ${cta.value}`
})
</script>

<template>
  <RouterLink
    :to="{ name: 'match', params: { id: match.id } }"
    class="group flex flex-col overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-zinc-900/5"
    :class="live ? 'border-red-200 ring-1 ring-red-100' : 'border-zinc-200/80 hover:border-pitch-300'"
    :aria-label="a11yLabel"
  >
    <div class="flex items-center justify-between gap-2 px-4 pt-3 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
      <span class="truncate">
        <template v-if="showTournament">{{ tournaments.get(match.tournamentId)?.name }} · </template>
        {{ rounds.labelOf(match.tournamentId, match.round) }} · {{ formatMatchDay(match.date) }}
      </span>
      <StatusBadge v-if="match.status !== 'scheduled' && !finished" v-bind="MATCH_STATUS[match.status]" :pulse="live" />
      <span v-else-if="finished" class="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">Finalizado</span>
    </div>

    <div class="flex items-center gap-3 px-4 py-3">
      <ul class="min-w-0 flex-1 space-y-2">
        <li v-for="s in sides" :key="s.key" class="flex items-center gap-2.5">
          <TeamLogo :team="s.team" size="sm" />
          <span
            class="min-w-0 flex-1 truncate text-[15px] leading-tight"
            :class="[
              winner && winner !== 'draw' && winner !== s.key ? 'font-medium text-zinc-400' : 'font-bold text-zinc-900',
              highlightTeamId === s.id && 'underline decoration-lime-400 decoration-2 underline-offset-4',
            ]"
          >
            {{ s.team?.name }}
          </span>
          <span v-if="hasScore" class="tabular flex items-baseline gap-1">
            <span v-if="s.pen != null" class="text-[11px] font-semibold text-zinc-400">({{ s.pen }})</span>
            <span class="w-6 text-right font-display text-2xl leading-none font-bold" :class="live ? 'text-red-600' : winner && winner !== 'draw' && winner !== s.key ? 'text-zinc-400' : 'text-zinc-950'">{{ s.score }}</span>
          </span>
        </li>
      </ul>
      <div v-if="!hasScore" class="shrink-0 rounded-xl bg-pitch-50 px-3 py-2 text-center">
        <Clock class="mx-auto size-4 text-pitch-700" aria-hidden="true" />
        <span class="tabular mt-0.5 block font-display text-xl leading-none font-bold text-pitch-900">{{ match.status === 'cancelled' || match.status === 'postponed' ? '—' : match.time }}</span>
      </div>
    </div>

    <div class="mt-auto flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/60 px-4 py-2 text-xs">
      <span class="inline-flex min-w-0 items-center gap-1 truncate text-zinc-500">
        <template v-if="match.venue"><MapPin class="size-3.5 shrink-0" aria-hidden="true" /> {{ match.venue }}</template>
        <template v-else-if="match.extraTime">Con tiempos extra</template>
      </span>
      <span class="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-pitch-900 px-3 py-1 font-semibold text-white transition group-hover:bg-pitch-700" aria-hidden="true">
        {{ cta }} <ChevronRight class="size-3.5" />
      </span>
    </div>
  </RouterLink>
</template>
