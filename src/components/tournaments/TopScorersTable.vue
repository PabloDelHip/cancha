<script setup lang="ts">
import type { ID, TopScorer } from '@/types'
import { useHistoricalNamesStore } from '@/stores'
import { fullName } from '@/utils/players'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/** `tournamentId` (10C): en un torneo finalizado, los nombres con que se jugó. */
withDefaults(defineProps<{ scorers: TopScorer[]; showAssists?: boolean; tournamentId?: ID | null }>(), { showAssists: false, tournamentId: null })

/** 10C: dentro de un torneo finalizado, los nombres con que se jugó. */
const names = useHistoricalNamesStore()
</script>

<template>
  <table class="tabular w-full text-sm">
    <thead>
      <tr class="border-b border-zinc-200 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
        <th scope="col" class="w-10 py-2.5 pl-4 text-left">#</th>
        <th scope="col" class="py-2.5 text-left">Jugador</th>
        <th scope="col" class="px-2 text-center"><abbr title="Partidos jugados">PJ</abbr></th>
        <th v-if="showAssists" scope="col" class="hidden px-2 text-center sm:table-cell"><abbr title="Asistencias">Asist</abbr></th>
        <th scope="col" class="pr-4 pl-2 text-center">Goles</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in scorers" :key="row.playerId" class="border-b border-zinc-100 last:border-0">
        <td class="py-3 pl-4 font-semibold text-zinc-500">{{ row.position }}</td>
        <th scope="row" class="py-2 pr-2 text-left font-normal">
          <RouterLink :to="{ name: 'player', params: { id: row.playerId } }" class="group flex items-center gap-3">
            <PlayerAvatar :player="names.player(tournamentId, row.playerId)" :color="names.team(tournamentId, row.teamId)?.colors.primary" size="sm" decorative />
            <span class="min-w-0">
              <span class="block truncate font-semibold text-zinc-900 group-hover:text-pitch-700">
                {{ names.player(tournamentId, row.playerId) ? fullName(names.player(tournamentId, row.playerId)!) : 'Jugador' }}
              </span>
              <span class="flex items-center gap-1 text-xs text-zinc-500">
                <TeamLogo :team="names.team(tournamentId, row.teamId)" size="xs" />
                <span class="truncate">{{ names.team(tournamentId, row.teamId)?.name }}</span>
              </span>
            </span>
          </RouterLink>
        </th>
        <td class="px-2 text-center text-zinc-600">{{ row.matches }}</td>
        <td v-if="showAssists" class="hidden px-2 text-center text-zinc-600 sm:table-cell">{{ row.assists }}</td>
        <td class="pr-4 pl-2 text-center font-display text-xl font-bold text-zinc-950">{{ row.goals }}</td>
      </tr>
    </tbody>
  </table>
</template>
