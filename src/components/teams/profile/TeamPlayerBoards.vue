<script setup lang="ts">
import { computed } from 'vue'
import { Footprints, Goal, Hand, Handshake, Percent, Siren, TriangleAlert } from 'lucide-vue-next'
import type { TeamPlayerStat } from '@/types'
import { fullName } from '@/utils/players'
import { formatDate } from '@/utils/format'
import { POSITION_LABELS } from '@/utils/labels'
import { fmtAvg } from '@/utils/rankings'
import RankingBoard, { type RankingRow } from '@/components/stats/RankingBoard.vue'

/**
 * Tops de los jugadores CON ESTE EQUIPO (todas sus competiciones): goles, asistencias, promedio de
 * gol, amarillas y rojas. Top 5 + "Ver todos"; en las tarjetas, en qué partidos las vio.
 */
const props = defineProps<{ stats: TeamPlayerStat[] }>()

function row(s: TeamPlayerStat, value: string, sub: string, details?: RankingRow['details']): RankingRow {
  return {
    key: s.player.id,
    name: fullName(s.player),
    sub: `${POSITION_LABELS[s.player.position]} · ${sub}`,
    player: s.player,
    to: { name: 'player', params: { id: s.player.id } },
    value,
    details,
  }
}
const cardMatches = (s: TeamPlayerStat, kind: 'yellow' | 'red') =>
  s.cards
    .filter((c) => c[kind])
    .map((c) => ({
      key: c.match.id,
      label: `${formatDate(c.match.date)} · vs ${c.match.opponent?.name ?? 'rival'}${c.match.tournament ? ` · ${c.match.tournament.name}` : ''}`,
      to: { name: 'match', params: { id: c.match.id } },
      yellow: kind === 'yellow' ? c.yellow : 0,
      red: kind === 'red' ? c.red : 0,
    }))
const top = (metric: (s: TeamPlayerStat) => number, ...ties: ((a: TeamPlayerStat, b: TeamPlayerStat) => number)[]) =>
  props.stats
    .filter((s) => metric(s) > 0)
    .sort((a, b) => metric(b) - metric(a) || ties.reduce((acc, f) => acc || f(a, b), 0) || a.appearances - b.appearances)
const avg = (s: TeamPlayerStat) => (s.appearances ? s.goals / s.appearances : 0)

const goals = computed(() => top((s) => s.goals, (a, b) => b.assists - a.assists).map((s) => row(s, String(s.goals), `${s.appearances} PJ`)))
const assists = computed(() => top((s) => s.assists, (a, b) => b.goals - a.goals).map((s) => row(s, String(s.assists), `${s.appearances} PJ`)))
const average = computed(() => top(avg, (a, b) => b.appearances - a.appearances).map((s) => row(s, fmtAvg(avg(s)), `${s.goals} goles en ${s.appearances} PJ`)))
const yellows = computed(() => top((s) => s.yellowCards).map((s) => row(s, String(s.yellowCards), `${s.appearances} PJ`, cardMatches(s, 'yellow'))))
/** Porteros (posición GK): menos goles recibidos por partido; luego más partidos en cero. */
const keepers = computed(() =>
  props.stats
    .filter((s) => s.player.position === 'GK' && s.appearances > 0)
    .sort((a, b) => a.conceded / a.appearances - b.conceded / b.appearances || b.cleanSheets - a.cleanSheets || b.appearances - a.appearances)
    .map((s) => row(s, fmtAvg(s.conceded / s.appearances), `${s.conceded} recibidos en ${s.appearances} PJ · ${s.cleanSheets} en cero`)),
)
/** Más partidos con este equipo (todas sus competiciones). */
const appearances = computed(() =>
  top((s) => s.appearances, (a, b) => b.goals - a.goals).map((s) => row(s, String(s.appearances), `${s.goals} goles · ${s.assists} asist.`)),
)
const reds = computed(() => top((s) => s.redCards).map((s) => row(s, String(s.redCards), `${s.appearances} PJ`, cardMatches(s, 'red'))))
</script>

<template>
  <div class="space-y-4">
    <RankingBoard title="Más partidos" unit="Partidos" :icon="Footprints" tone="zinc" :rows="appearances" empty="Sin partidos registrados" />
    <RankingBoard title="Goleadores" unit="Goles" :icon="Goal" tone="green" :rows="goals" empty="Sin goles registrados" />
    <RankingBoard title="Asistencias" unit="Asist." :icon="Handshake" tone="sky" :rows="assists" empty="Sin asistencias registradas" />
    <RankingBoard v-if="keepers.length" title="Porteros" unit="Recibidos / PJ" :icon="Hand" tone="zinc" :rows="keepers" />
    <RankingBoard title="Promedio de gol" unit="Goles / PJ" :icon="Percent" tone="lime" :rows="average" empty="Sin goles registrados" />
    <RankingBoard title="Más amarillas" unit="Amarillas" :icon="TriangleAlert" tone="amber" :rows="yellows" empty="Sin amarillas" />
    <RankingBoard title="Más rojas" unit="Rojas" :icon="Siren" tone="red" :rows="reds" empty="Sin rojas" />
  </div>
</template>
