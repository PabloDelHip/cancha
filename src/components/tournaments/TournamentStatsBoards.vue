<script setup lang="ts">
import { computed } from 'vue'
import { BrickWall, Goal, Hand, Handshake, Percent, Shield, Siren, Target, TriangleAlert, Zap } from 'lucide-vue-next'
import type { ID } from '@/types'
import { useMatchesStore, usePlayersStore, useTeamsStore } from '@/stores'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { fullName } from '@/utils/players'
import { formatDate } from '@/utils/format'
import { fmtAvg, keeperTotals, playerTotals, rank, teamTotals, type CardEvent, type PlayerTotalsRow } from '@/utils/rankings'
import RankingBoard, { type RankingRow } from '@/components/stats/RankingBoard.vue'

/**
 * Estadísticas del torneo: rankings de jugadores, porteros, equipos y disciplina (top 5 + "Ver
 * todos"). Solo partidos finalizados. Se calculan con los partidos y estadísticas por jugador que
 * ya tiene la app, como los goleadores.
 */
const props = defineProps<{ tournamentId: ID }>()
const stats = useTournamentStats(() => props.tournamentId)
const matchesStore = useMatchesStore()
const players = usePlayersStore()
const teams = useTeamsStore()

const matchStats = computed(() => {
  const ids = new Set(stats.matches.value.map((m) => m.id))
  return matchesStore.stats.filter((s) => ids.has(s.matchId))
})
const teamRows = computed(() => teamTotals(stats.teams.value.map((t) => t.id), stats.matches.value, matchStats.value))
const playerRows = computed(() => playerTotals(stats.matches.value, matchStats.value))
const keeperRows = computed(() => keeperTotals(stats.matches.value, matchStats.value, (id) => players.get(id)?.position))

const byName = (id: ID) => teams.get(id)?.name ?? ''
const team = (id: ID) => teams.get(id)
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function teamRow(teamId: ID, value: string, sub: string): RankingRow {
  return { key: teamId, name: byName(teamId), sub, team: team(teamId), to: { name: 'team', params: { id: teamId } }, value }
}
function playerRow(r: { playerId: ID; teamId: ID }, value: string, sub: string, details?: RankingRow['details']): RankingRow {
  const p = players.get(r.playerId)
  return {
    key: r.playerId,
    name: p ? fullName(p) : 'Jugador',
    sub: `${team(r.teamId)?.shortName ?? ''} · ${sub}`,
    player: p,
    to: { name: 'player', params: { id: r.playerId } },
    value,
    details,
  }
}
const cardDetails = (events: CardEvent[], kind: 'yellow' | 'red') =>
  events
    .filter((e) => (kind === 'yellow' ? e.yellow : e.red))
    .map((e) => ({
      key: e.matchId,
      label: `${formatDate(e.date)} · vs ${team(e.opponentId)?.name ?? 'rival'}`,
      to: { name: 'match', params: { id: e.matchId } },
      yellow: kind === 'yellow' ? e.yellow : 0,
      red: kind === 'red' ? e.red : 0,
    }))
const byPlayed = (a: PlayerTotalsRow, b: PlayerTotalsRow) => a.matches - b.matches

// ─── Jugadores ──────────────────────────────────────────────────────────────
const scorers = computed(() =>
  rank(playerRows.value, (r) => r.goals, byPlayed, (a, b) => b.assists - a.assists).map((r) => playerRow(r, String(r.goals), `${r.matches} PJ${r.assists ? ` · ${r.assists} A` : ''}`)),
)
const assists = computed(() =>
  rank(playerRows.value, (r) => r.assists, byPlayed, (a, b) => b.goals - a.goals).map((r) => playerRow(r, String(r.assists), `${r.matches} PJ${r.goals ? ` · ${r.goals} G` : ''}`)),
)
const playerAverage = computed(() =>
  rank(playerRows.value, (r) => r.goalsPerMatch, (a, b) => b.matches - a.matches).map((r) => playerRow(r, fmtAvg(r.goalsPerMatch), `${r.goals} goles en ${r.matches} PJ`)),
)
const keepers = computed(() =>
  [...keeperRows.value]
    .sort((a, b) => a.concededPerMatch - b.concededPerMatch || b.cleanSheets - a.cleanSheets || b.matches - a.matches)
    .map((r) => playerRow(r, fmtAvg(r.concededPerMatch), `${plural(r.conceded, 'gol recibido', 'goles recibidos')} en ${r.matches} PJ · ${r.cleanSheets} en cero`)),
)
const playerYellows = computed(() =>
  rank(playerRows.value, (r) => r.yellowCards, byPlayed).map((r) => playerRow(r, String(r.yellowCards), `${r.matches} PJ`, cardDetails(r.cards, 'yellow'))),
)
const playerReds = computed(() =>
  rank(playerRows.value, (r) => r.redCards, byPlayed).map((r) => playerRow(r, String(r.redCards), `${r.matches} PJ`, cardDetails(r.cards, 'red'))),
)

// ─── Equipos ────────────────────────────────────────────────────────────────
const playedTeams = computed(() => teamRows.value.filter((r) => r.played > 0))
const defense = computed(() =>
  [...playedTeams.value]
    .sort((a, b) => a.goalsAgainstPerMatch - b.goalsAgainstPerMatch || b.cleanSheets - a.cleanSheets || b.played - a.played)
    .map((r) => teamRow(r.teamId, String(r.goalsAgainst), `${r.played} PJ · ${fmtAvg(r.goalsAgainstPerMatch)} por partido · ${r.cleanSheets} en cero`)),
)
const attack = computed(() =>
  rank(playedTeams.value, (r) => r.goalsFor, (a, b) => a.played - b.played).map((r) => teamRow(r.teamId, String(r.goalsFor), `${r.played} PJ · ${fmtAvg(r.goalsForPerMatch)} por partido`)),
)
const teamAverage = computed(() =>
  rank(playedTeams.value, (r) => r.goalsForPerMatch, (a, b) => b.played - a.played).map((r) => teamRow(r.teamId, fmtAvg(r.goalsForPerMatch), `${r.goalsFor} goles en ${r.played} PJ`)),
)
const teamYellows = computed(() => rank(playedTeams.value, (r) => r.yellowCards).map((r) => teamRow(r.teamId, String(r.yellowCards), `${r.played} PJ · ${fmtAvg(per(r.yellowCards, r.played))} por partido`)))
const teamReds = computed(() => rank(playedTeams.value, (r) => r.redCards).map((r) => teamRow(r.teamId, String(r.redCards), `${r.played} PJ`)))
const per = (n: number, d: number) => (d ? n / d : 0)

const anyPlayed = computed(() => stats.playedCount.value > 0)
</script>

<template>
  <div class="space-y-8">
    <p v-if="!anyPlayed" class="card p-6 text-center text-sm text-zinc-500">Las estadísticas aparecen con el primer partido finalizado.</p>
    <template v-else>
      <section aria-labelledby="st-players">
        <h3 id="st-players" class="eyebrow mb-3">Jugadores</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RankingBoard title="Goleadores" unit="Goles" :icon="Goal" tone="green" :rows="scorers" empty="Aún no hay goles" />
          <RankingBoard title="Asistencias" unit="Asist." :icon="Handshake" tone="sky" :rows="assists" empty="Aún no hay asistencias" />
          <RankingBoard title="Promedio de gol" unit="Goles / PJ" :icon="Percent" tone="lime" :rows="playerAverage" empty="Aún no hay goles" />
          <RankingBoard title="Porteros" unit="Recibidos / PJ" :icon="Hand" tone="zinc" :rows="keepers" empty="Sin porteros registrados (posición Portero) en partidos jugados" />
        </div>
      </section>

      <section aria-labelledby="st-teams">
        <h3 id="st-teams" class="eyebrow mb-3">Equipos</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RankingBoard title="Mejor defensa" unit="Goles en contra" :icon="BrickWall" tone="green" :rows="defense" />
          <RankingBoard title="Más goleadores" unit="Goles a favor" :icon="Target" tone="lime" :rows="attack" />
          <RankingBoard title="Promedio de gol" unit="Goles / PJ" :icon="Zap" tone="sky" :rows="teamAverage" />
        </div>
      </section>

      <section aria-labelledby="st-discipline">
        <h3 id="st-discipline" class="eyebrow mb-3">Disciplina</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RankingBoard title="Equipos con más amarillas" unit="Amarillas" :icon="TriangleAlert" tone="amber" :rows="teamYellows" empty="Sin amarillas" />
          <RankingBoard title="Equipos con más rojas" unit="Rojas" :icon="Siren" tone="red" :rows="teamReds" empty="Sin rojas" />
          <RankingBoard title="Jugadores con más amarillas" unit="Amarillas" :icon="TriangleAlert" tone="amber" :rows="playerYellows" empty="Sin amarillas" />
          <RankingBoard title="Jugadores con más rojas" unit="Rojas" :icon="Shield" tone="red" :rows="playerReds" empty="Sin rojas" />
        </div>
      </section>
      <p class="text-xs text-zinc-500">Solo partidos finalizados. Porteros: jugadores con posición Portero; cuentan los goles que recibió su equipo en los partidos que jugó.</p>
    </template>
  </div>
</template>
