<script setup lang="ts">
import { computed } from 'vue'
import { ClipboardEdit } from 'lucide-vue-next'
import type { Match } from '@/types'
import { useRoundsStore, useTeamsStore } from '@/stores'
import { isPendingCapture } from '@/utils/matches'
import { MATCH_STATUS } from '@/utils/labels'
import { formatMatchDay } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

/** Fila compacta para el resumen del torneo: jornada, equipos, marcador y acción. */
const props = defineProps<{ match: Match; readOnly?: boolean }>()

const teams = useTeamsStore()
const rounds = useRoundsStore()
const home = computed(() => teams.get(props.match.homeTeamId))
const away = computed(() => teams.get(props.match.awayTeamId))
const pending = computed(() => isPendingCapture(props.match))
const hasScore = computed(() => props.match.homeScore !== null && props.match.awayScore !== null)
</script>

<template>
  <li class="flex items-center gap-3 px-4 py-3" :class="pending && !readOnly && 'border-l-4 border-amber-400 pl-3'">
    <div class="w-[4.75rem] shrink-0 text-[11px] leading-tight whitespace-nowrap text-zinc-500">
      <p class="truncate font-semibold text-zinc-700">{{ rounds.labelOf(match.tournamentId, match.round).replace('Jornada ', 'J') }}</p>
      <p>{{ formatMatchDay(match.date).replace(' de ', ' ') }}</p>
      <p class="tabular">{{ match.time }}</p>
    </div>
    <div class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm">
      <span class="flex min-w-0 items-center justify-end gap-1.5 text-right">
        <span class="truncate font-semibold">{{ home?.shortName }}</span>
        <TeamLogo :team="home" size="xs" />
      </span>
      <span
        class="tabular min-w-12 rounded-md px-1.5 py-0.5 text-center font-display font-bold"
        :class="hasScore ? 'bg-pitch-950 text-white' : 'bg-zinc-100 text-zinc-500'"
      >
        {{ hasScore ? `${match.homeScore}–${match.awayScore}` : 'vs' }}
      </span>
      <span class="flex min-w-0 items-center gap-1.5">
        <TeamLogo :team="away" size="xs" />
        <span class="truncate font-semibold">{{ away?.shortName }}</span>
      </span>
    </div>
    <RouterLink
      v-if="!readOnly && (pending || match.status === 'scheduled')"
      :to="{ name: 'admin-match-capture', params: { id: match.id } }"
      class="btn btn-sm shrink-0"
      :class="pending ? 'btn-accent' : 'btn-ghost'"
      :aria-label="`Capturar ${home?.name} contra ${away?.name}`"
    >
      <ClipboardEdit class="size-3.5" aria-hidden="true" /><span class="hidden sm:inline">Capturar</span>
    </RouterLink>
    <StatusBadge v-else-if="match.status !== 'finished'" v-bind="MATCH_STATUS[match.status]" :pulse="match.status === 'live'" />
  </li>
</template>
