<script setup lang="ts">
import { computed } from 'vue'
import { Hand, Target, Trophy } from 'lucide-vue-next'
import type { TournamentStructure } from '@/types'
import { useMatchesStore, usePlayersStore, useTeamsStore } from '@/stores'
import { useTournamentChampion } from '@/composables/useTournamentChampion'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { fullName } from '@/utils/players'
import { fmtAvg, keeperTotals, playerTotals } from '@/utils/rankings'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'

/**
 * Premios de un torneo FINALIZADO: campeón (resultado oficial que calcula el servidor), goleador y
 * mejor portero (de los partidos finalizados del torneo). Se muestra una sola vez por pestaña.
 * - Goleador: más goles; si hay empate, se comparte.
 * - Mejor portero: menos goles recibidos por partido (desempate: más porterías en cero), entre los
 *   porteros que jugaron al menos la mitad de los partidos del portero más constante.
 */
const props = defineProps<{ structure: TournamentStructure }>()
const { champion, detail } = useTournamentChampion(() => props.structure)
const stats = useTournamentStats(() => props.structure.tournamentId)
const matchesStore = useMatchesStore()
const players = usePlayersStore()
const teams = useTeamsStore()

const finished = computed(() => props.structure.status === 'finished' && !!champion.value)
const matchStats = computed(() => {
  const ids = new Set(stats.matches.value.map((m) => m.id))
  return matchesStore.stats.filter((s) => ids.has(s.matchId))
})

const scorers = computed(() => {
  const rows = playerTotals(stats.matches.value, matchStats.value).filter((r) => r.goals > 0)
  const best = Math.max(0, ...rows.map((r) => r.goals))
  return rows.filter((r) => r.goals === best).sort((a, b) => a.matches - b.matches)
})
const keeper = computed(() => {
  const rows = keeperTotals(stats.matches.value, matchStats.value, (id) => players.get(id)?.position)
  const most = Math.max(0, ...rows.map((r) => r.matches))
  return rows
    .filter((r) => r.matches >= Math.max(1, Math.ceil(most / 2)))
    .sort((a, b) => a.concededPerMatch - b.concededPerMatch || b.cleanSheets - a.cleanSheets || b.matches - a.matches)[0] ?? null
})
const person = (id: string) => players.get(id)
</script>

<template>
  <section v-if="finished && champion" aria-label="Premios del torneo" class="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
    <!-- Campeón -->
    <RouterLink
      :to="{ name: 'team', params: { id: champion.id } }"
      aria-label="Campeón"
      class="relative flex items-center gap-4 overflow-hidden rounded-3xl bg-pitch-950 p-5 text-white transition hover:ring-2 hover:ring-lime-400 sm:p-6"
    >
      <Trophy class="pointer-events-none absolute -right-4 -bottom-6 size-32 text-white/5" aria-hidden="true" />
      <Trophy class="size-8 shrink-0 text-amber-400" aria-hidden="true" />
      <span class="shrink-0 rounded-xl bg-white p-1"><TeamLogo :team="champion" size="lg" /></span>
      <span class="relative min-w-0">
        <span class="block text-xs font-semibold tracking-wider text-pitch-300 uppercase">Torneo finalizado · Campeón</span>
        <span class="display block truncate text-2xl sm:text-3xl">{{ champion.name }}</span>
        <span v-if="detail" class="block text-sm text-pitch-200">{{ detail }}</span>
      </span>
    </RouterLink>

    <!-- Goleador -->
    <div class="relative flex items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-lime-300 to-lime-400 p-5 text-pitch-950">
      <Target class="pointer-events-none absolute -top-3 -right-3 size-24 opacity-15" aria-hidden="true" />
      <template v-if="scorers.length">
        <PlayerAvatar :player="person(scorers[0]!.playerId)" size="lg" decorative class="shrink-0 ring-4 ring-white/60" />
        <span class="relative min-w-0">
          <span class="block text-xs font-bold tracking-wider uppercase opacity-70">{{ scorers.length > 1 ? 'Goleadores (compartido)' : 'Goleador' }}</span>
          <RouterLink
            v-for="s in scorers"
            :key="s.playerId"
            :to="{ name: 'player', params: { id: s.playerId } }"
            class="display block truncate text-xl leading-tight hover:underline"
          >
            {{ person(s.playerId) ? fullName(person(s.playerId)!) : 'Jugador' }}
          </RouterLink>
          <span class="block text-sm font-semibold opacity-80">
            <span class="font-display text-2xl">{{ scorers[0]!.goals }}</span> goles<template v-if="scorers.length === 1"> · {{ teams.get(scorers[0]!.teamId)?.name }}</template>
          </span>
        </span>
      </template>
      <span v-else class="relative text-sm font-semibold">Sin goles registrados</span>
    </div>

    <!-- Mejor portero -->
    <div class="relative flex items-center gap-3 overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-zinc-200/80">
      <Hand class="pointer-events-none absolute -top-3 -right-3 size-24 text-zinc-100" aria-hidden="true" />
      <template v-if="keeper">
        <PlayerAvatar :player="person(keeper.playerId)" size="lg" decorative class="shrink-0" />
        <span class="relative min-w-0">
          <span class="block text-xs font-bold tracking-wider text-pitch-700 uppercase">Mejor portero</span>
          <RouterLink :to="{ name: 'player', params: { id: keeper.playerId } }" class="display block truncate text-xl leading-tight text-zinc-950 hover:underline">
            {{ person(keeper.playerId) ? fullName(person(keeper.playerId)!) : 'Portero' }}
          </RouterLink>
          <span class="block text-sm text-zinc-600">
            <span class="font-display text-2xl font-bold text-zinc-950">{{ fmtAvg(keeper.concededPerMatch) }}</span> recibidos por partido
          </span>
          <span class="block text-xs text-zinc-500">{{ keeper.cleanSheets }} en cero · {{ keeper.matches }} PJ · {{ teams.get(keeper.teamId)?.shortName }}</span>
        </span>
      </template>
      <span v-else class="relative text-sm text-zinc-500">Sin porteros registrados en partidos jugados</span>
    </div>
  </section>
</template>
