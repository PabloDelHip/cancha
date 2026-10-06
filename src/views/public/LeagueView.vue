<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BrickWall, CalendarDays, Crown, Flame, Footprints, Goal, Hand, Handshake, MapPin, Medal, Percent, Shield, ShieldCheck, Siren, Target, Trophy, TriangleAlert, Zap,
} from 'lucide-vue-next'
import type { LeagueDetail, LeagueHistory, LeagueMatchRef, LeaguePlayerStat } from '@/types'
import { getErrorMessage, leagueService } from '@/services'
import { usePageTitle } from '@/composables/usePageTitle'
import { SYSTEM_LABELS, TOURNAMENT_STATUS, POSITION_LABELS } from '@/utils/labels'
import { formatDate, formatDateRange } from '@/utils/format'
import { fullName } from '@/utils/players'
import { fmtAvg } from '@/utils/rankings'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import RankingBoard, { type RankingRow } from '@/components/stats/RankingBoard.vue'

/**
 * Liga: sus torneos y su histórico (lo calcula el servidor con partidos oficiales finalizados).
 * Campeones, el más campeón, tabla histórica, rankings de jugadores, porteros y equipos, y récords.
 */
const props = defineProps<{ id: string }>()
const league = ref<LeagueDetail | null>(null)
const history = ref<LeagueHistory | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
usePageTitle(() => league.value?.name)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [l, h] = await Promise.all([leagueService.get(props.id), leagueService.history(props.id)])
    league.value = l
    history.value = h
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })

const MIN_PJ = 3
const showAllTable = ref(false)
const table = computed(() => (showAllTable.value ? (history.value?.teams ?? []) : (history.value?.teams ?? []).slice(0, 10)))
const distinctChampions = computed(() => new Set((history.value?.champions ?? []).map((c) => c.champion?.id).filter(Boolean)).size)
const figures = computed(() => {
  const s = history.value?.summary
  if (!s) return []
  return [
    { label: 'Torneos', value: s.tournaments },
    { label: 'Campeones', value: distinctChampions.value },
    { label: 'Partidos', value: s.matches },
    { label: 'Goles', value: s.goals },
    { label: 'Goles/partido', value: s.goalsPerMatch ?? '—' },
  ]
})

// ─── Rankings ───────────────────────────────────────────────────────────────
const playerRow = (p: LeaguePlayerStat, value: string, sub: string): RankingRow => ({
  key: p.player.id,
  name: fullName(p.player),
  sub: `${p.team?.shortName ?? POSITION_LABELS[p.player.position]} · ${sub}`,
  player: p.player,
  to: { name: 'player', params: { id: p.player.id } },
  value,
})
const top = (list: LeaguePlayerStat[], metric: (p: LeaguePlayerStat) => number, tie: (a: LeaguePlayerStat, b: LeaguePlayerStat) => number = (a, b) => a.appearances - b.appearances) =>
  list.filter((p) => metric(p) > 0).sort((a, b) => metric(b) - metric(a) || tie(a, b))
const players = computed(() => history.value?.players ?? [])
const keepers = computed(() => (history.value?.keepers ?? []).filter((k) => k.appearances >= MIN_PJ))

const scorers = computed(() => top(players.value, (p) => p.goals).map((p) => playerRow(p, String(p.goals), `${p.appearances} PJ · ${p.tournaments} ${p.tournaments === 1 ? 'torneo' : 'torneos'}`)))
const appearances = computed(() => top(players.value, (p) => p.appearances, (a, b) => b.goals - a.goals).map((p) => playerRow(p, String(p.appearances), `${p.goals} goles · ${p.teams} ${p.teams === 1 ? 'equipo' : 'equipos'}`)))
const assists = computed(() => top(players.value, (p) => p.assists).map((p) => playerRow(p, String(p.assists), `${p.appearances} PJ`)))
const average = computed(() =>
  top(players.value.filter((p) => p.appearances >= MIN_PJ), (p) => p.goals / p.appearances, (a, b) => b.appearances - a.appearances).map((p) => playerRow(p, fmtAvg(p.goals / p.appearances), `${p.goals} goles en ${p.appearances} PJ`)),
)
const lessBeaten = computed(() =>
  [...keepers.value]
    .sort((a, b) => a.conceded / a.appearances - b.conceded / b.appearances || b.cleanSheets - a.cleanSheets)
    .map((p) => playerRow(p, fmtAvg(p.conceded / p.appearances), `${p.conceded} recibidos en ${p.appearances} PJ`)),
)
const cleanSheets = computed(() => top(history.value?.keepers ?? [], (p) => p.cleanSheets).map((p) => playerRow(p, String(p.cleanSheets), `${p.appearances} PJ · ${Math.round((p.cleanSheets / p.appearances) * 100)}% en cero`)))
const yellows = computed(() => top(players.value, (p) => p.yellowCards).map((p) => playerRow(p, String(p.yellowCards), `${p.appearances} PJ`)))
const reds = computed(() => top(players.value, (p) => p.redCards).map((p) => playerRow(p, String(p.redCards), `${p.appearances} PJ`)))

type TeamRowT = LeagueHistory['teams'][number]
const teamRow = (t: TeamRowT, value: string, sub: string): RankingRow => ({ key: t.team.id, name: t.team.name, sub, team: t.team, to: { name: 'team', params: { id: t.team.id } }, value })
const teams = computed(() => history.value?.teams ?? [])
const mostTitles = computed(() =>
  teams.value
    .filter((t) => t.titles > 0)
    .sort((a, b) => b.titles - a.titles || b.runnerUps - a.runnerUps || b.points - a.points)
    .map((t) => teamRow(t, String(t.titles), `${t.runnerUps} ${t.runnerUps === 1 ? 'final perdida' : 'finales perdidas'} · ${t.tournaments} torneos`)),
)
const attack = computed(() => [...teams.value].filter((t) => t.goalsFor).sort((a, b) => b.goalsFor - a.goalsFor).map((t) => teamRow(t, String(t.goalsFor), `${t.played} PJ · ${fmtAvg(t.goalsFor / t.played)} por partido`)))
const defense = computed(() =>
  teams.value
    .filter((t) => t.played >= MIN_PJ)
    .sort((a, b) => a.goalsAgainst / a.played - b.goalsAgainst / b.played)
    .map((t) => teamRow(t, fmtAvg(t.goalsAgainst / t.played), `${t.goalsAgainst} en contra en ${t.played} PJ`)),
)
const teamCleanSheets = computed(() => [...teams.value].filter((t) => t.cleanSheets).sort((a, b) => b.cleanSheets - a.cleanSheets).map((t) => teamRow(t, String(t.cleanSheets), `${t.played} PJ`)))
const loyal = computed(() => [...teams.value].sort((a, b) => b.tournaments - a.tournaments || b.played - a.played).map((t) => teamRow(t, String(t.tournaments), `${t.played} partidos`)))

const records = computed(() =>
  [
    { label: 'Mayor goleada', icon: Flame, m: history.value?.records.biggestWin ?? null },
    { label: 'Partido con más goles', icon: Zap, m: history.value?.records.highestScoring ?? null },
  ].filter((r): r is { label: string; icon: typeof Flame; m: LeagueMatchRef } => !!r.m),
)
</script>

<template>
  <div>
    <div v-if="loading || error || !league" class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="load" />
      <EmptyState v-else :icon="Medal" title="Liga no encontrada" class="card" />
    </div>

    <template v-else>
      <!-- Portada -->
      <section class="relative overflow-hidden bg-pitch-950 text-white">
        <div class="absolute inset-y-0 right-0 w-2/3 opacity-25" style="background: linear-gradient(110deg, transparent 22%, #a3e635 22.2%, #a3e635 23.5%, transparent 23.7%, transparent 30%, #166534 30.2%)" aria-hidden="true" />
        <Medal class="pointer-events-none absolute -right-8 -bottom-10 size-64 text-white/5 sm:right-10" aria-hidden="true" />
        <div class="relative mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 sm:pt-12">
          <p class="flex flex-wrap items-center gap-2 text-xs">
            <span class="rounded-full bg-lime-400 px-2 py-0.5 font-bold text-pitch-950">Liga</span>
            <span v-if="league.city" class="inline-flex items-center gap-1 text-pitch-200"><MapPin class="size-3.5" aria-hidden="true" /> {{ league.city }}</span>
            <span v-if="history?.summary.firstYear" class="inline-flex items-center gap-1 text-pitch-200"><CalendarDays class="size-3.5" aria-hidden="true" /> Desde {{ history.summary.firstYear }}</span>
          </p>
          <h1 class="display mt-3 max-w-4xl text-[2.6rem] leading-[0.92] break-words sm:text-7xl">{{ league.name }}</h1>
          <p v-if="league.description" class="mt-3 max-w-2xl text-sm text-pitch-200">{{ league.description }}</p>
          <dl class="mt-7 grid grid-cols-3 gap-2 sm:max-w-2xl sm:grid-cols-5 sm:gap-3">
            <div v-for="f in figures" :key="f.label" class="rounded-2xl bg-white/[0.07] px-2 py-3 text-center ring-1 ring-white/10">
              <dt class="text-[10px] leading-tight font-semibold tracking-wider text-pitch-300 uppercase">{{ f.label }}</dt>
              <dd class="tabular mt-1 font-display text-2xl leading-none font-bold sm:text-3xl">{{ f.value }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div class="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6">
        <!-- Campeones -->
        <section v-if="history?.champions.length" aria-labelledby="champs-title">
          <h2 id="champs-title" class="display mb-4 flex items-center gap-2 text-3xl"><Trophy class="size-7 text-amber-500" aria-hidden="true" /> Campeones</h2>
          <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <li v-for="c in history.champions" :key="c.tournament.id" class="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/80">
              <RouterLink :to="{ name: 'tournament', params: { id: c.tournament.id } }" class="flex items-center gap-3 bg-pitch-950 p-4 text-white hover:bg-pitch-900">
                <span class="shrink-0 rounded-xl bg-white p-1"><TeamLogo :team="c.champion" size="md" /></span>
                <span class="min-w-0">
                  <span class="block text-[10px] font-bold tracking-wider text-lime-300 uppercase">{{ c.year }} · {{ c.decidedBy === 'final' ? 'Ganó la final' : 'Primero de la tabla' }}</span>
                  <span class="display block truncate text-xl leading-tight">{{ c.champion?.name ?? 'Sin campeón' }}</span>
                  <span class="block truncate text-xs text-pitch-200">{{ c.tournament.name }}</span>
                </span>
                <Crown class="ml-auto size-5 shrink-0 text-amber-400" aria-hidden="true" />
              </RouterLink>
              <div class="space-y-1.5 px-4 py-3 text-xs text-zinc-600">
                <p v-if="c.runnerUp" class="flex items-center gap-1.5"><Medal class="size-3.5 text-zinc-400" aria-hidden="true" /> Finalista: <TeamLogo :team="c.runnerUp" size="xs" /> <span class="truncate font-semibold text-zinc-800">{{ c.runnerUp.name }}</span></p>
                <RouterLink v-if="c.topScorer" :to="{ name: 'player', params: { id: c.topScorer.player.id } }" class="flex items-center gap-1.5 hover:text-pitch-700">
                  <Target class="size-3.5 text-pitch-600" aria-hidden="true" /> Goleador: <span class="truncate font-semibold text-zinc-800">{{ fullName(c.topScorer.player) }}</span> · {{ c.topScorer.goals }} goles
                </RouterLink>
              </div>
            </li>
          </ul>
        </section>

        <!-- Más campeón + récords -->
        <div v-if="history" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RankingBoard title="El más campeón" unit="Títulos" :icon="Crown" tone="amber" :rows="mostTitles" empty="Aún no hay torneos finalizados" />
          <section v-if="records.length" aria-label="Récords de la liga" class="space-y-3">
            <RouterLink
              v-for="r in records"
              :key="r.label"
              :to="{ name: 'match', params: { id: r.m.id } }"
              class="relative block overflow-hidden rounded-2xl bg-gradient-to-br from-lime-300 to-lime-400 p-4 text-pitch-950 transition hover:-translate-y-0.5"
            >
              <component :is="r.icon" class="absolute -top-2 -right-2 size-20 opacity-15" aria-hidden="true" />
              <p class="text-[11px] font-bold tracking-wider uppercase opacity-70">{{ r.label }}</p>
              <p class="mt-1 flex items-center gap-2 text-sm font-bold">
                <TeamLogo :team="r.m.homeTeam" size="xs" /> {{ r.m.homeTeam?.shortName }}
                <span class="tabular font-display text-3xl">{{ r.m.homeScore }}–{{ r.m.awayScore }}</span>
                {{ r.m.awayTeam?.shortName }} <TeamLogo :team="r.m.awayTeam" size="xs" />
              </p>
              <p class="truncate text-xs opacity-70">{{ r.m.tournament?.name }} · {{ formatDate(r.m.date) }}</p>
            </RouterLink>
          </section>
        </div>

        <!-- Tabla histórica -->
        <section v-if="teams.length" aria-labelledby="table-title">
          <h2 id="table-title" class="display mb-1 text-3xl">Tabla histórica</h2>
          <p class="mb-3 text-xs text-zinc-500">Todos los partidos de la liga (3 puntos por victoria, 1 por empate).</p>
          <div class="card overflow-x-auto">
            <table class="tabular w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-200 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                  <th class="sticky left-0 bg-white py-2.5 pl-4 text-left">#</th>
                  <th class="sticky left-8 bg-white py-2.5 pr-3 text-left">Equipo</th>
                  <th class="px-2 text-center" title="Títulos"><Trophy class="mx-auto size-3.5" aria-label="Títulos" /></th>
                  <th class="px-2 text-center">Torneos</th>
                  <th class="px-2 text-center">PJ</th>
                  <th class="px-2 text-center">G</th>
                  <th class="px-2 text-center">E</th>
                  <th class="px-2 text-center">P</th>
                  <th class="px-2 text-center">GF</th>
                  <th class="px-2 text-center">GC</th>
                  <th class="px-2 text-center">DG</th>
                  <th class="px-3 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in table" :key="t.team.id" class="border-b border-zinc-100 last:border-0">
                  <td class="sticky left-0 bg-white py-2.5 pl-4 font-semibold text-zinc-500">{{ i + 1 }}</td>
                  <th scope="row" class="sticky left-8 bg-white py-2 pr-3 text-left font-normal">
                    <RouterLink :to="{ name: 'team', params: { id: t.team.id } }" class="flex items-center gap-2 font-semibold whitespace-nowrap text-zinc-900 hover:text-pitch-700">
                      <TeamLogo :team="t.team" size="sm" /> <span class="sm:hidden">{{ t.team.shortName }}</span><span class="hidden sm:inline">{{ t.team.name }}</span>
                    </RouterLink>
                  </th>
                  <td class="px-2 text-center font-bold" :class="t.titles ? 'text-amber-600' : 'text-zinc-300'">{{ t.titles }}</td>
                  <td class="px-2 text-center text-zinc-600">{{ t.tournaments }}</td>
                  <td class="px-2 text-center text-zinc-600">{{ t.played }}</td>
                  <td class="px-2 text-center text-zinc-600">{{ t.won }}</td>
                  <td class="px-2 text-center text-zinc-600">{{ t.drawn }}</td>
                  <td class="px-2 text-center text-zinc-600">{{ t.lost }}</td>
                  <td class="px-2 text-center text-zinc-600">{{ t.goalsFor }}</td>
                  <td class="px-2 text-center text-zinc-600">{{ t.goalsAgainst }}</td>
                  <td class="px-2 text-center text-zinc-600">{{ t.goalDifference > 0 ? `+${t.goalDifference}` : t.goalDifference }}</td>
                  <td class="px-3 text-center font-display text-lg font-bold text-zinc-950">{{ t.points }}</td>
                </tr>
              </tbody>
            </table>
            <button v-if="teams.length > 10" type="button" class="w-full border-t border-zinc-100 py-2.5 text-sm font-semibold text-pitch-700 hover:bg-zinc-50" @click="showAllTable = !showAllTable">
              {{ showAllTable ? 'Ver menos' : `Ver los ${teams.length} equipos` }}
            </button>
          </div>
        </section>

        <!-- Jugadores -->
        <section v-if="players.length" aria-labelledby="players-title">
          <h2 id="players-title" class="display mb-1 text-3xl">Jugadores históricos</h2>
          <p class="mb-4 text-xs text-zinc-500">Todos los torneos de la liga. Promedios con al menos {{ MIN_PJ }} partidos.</p>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <RankingBoard title="Máximos goleadores" unit="Goles" :icon="Goal" tone="green" :rows="scorers" />
            <RankingBoard title="Más partidos" unit="Partidos" :icon="Footprints" tone="zinc" :rows="appearances" />
            <RankingBoard title="Asistencias" unit="Asist." :icon="Handshake" tone="sky" :rows="assists" />
            <RankingBoard title="Promedio de gol" unit="Goles / PJ" :icon="Percent" tone="lime" :rows="average" />
            <RankingBoard title="Más amarillas" unit="Amarillas" :icon="TriangleAlert" tone="amber" :rows="yellows" empty="Sin amarillas" />
            <RankingBoard title="Más rojas" unit="Rojas" :icon="Siren" tone="red" :rows="reds" empty="Sin rojas" />
          </div>
        </section>

        <!-- Porteros -->
        <section v-if="history?.keepers.length" aria-labelledby="keepers-title">
          <h2 id="keepers-title" class="display mb-1 text-3xl">Porteros</h2>
          <p class="mb-4 text-xs text-zinc-500">Goles que recibió su equipo en los partidos que jugaron.</p>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RankingBoard title="Menos goleados" unit="Recibidos / PJ" :icon="Hand" tone="zinc" :rows="lessBeaten" :empty="`Ningún portero con ${MIN_PJ}+ partidos`" />
            <RankingBoard title="Porterías en cero" unit="En cero" :icon="ShieldCheck" tone="green" :rows="cleanSheets" />
          </div>
        </section>

        <!-- Equipos -->
        <section v-if="teams.length" aria-labelledby="teams-title">
          <h2 id="teams-title" class="display mb-4 text-3xl">Equipos</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RankingBoard title="Más goleadores" unit="Goles a favor" :icon="Target" tone="lime" :rows="attack" />
            <RankingBoard title="Mejor defensa" unit="En contra / PJ" :icon="BrickWall" tone="green" :rows="defense" />
            <RankingBoard title="Porterías en cero" unit="Partidos" :icon="Shield" tone="sky" :rows="teamCleanSheets" />
            <RankingBoard title="Más torneos jugados" unit="Torneos" :icon="CalendarDays" tone="zinc" :rows="loyal" />
          </div>
        </section>

        <!-- Torneos -->
        <section aria-labelledby="tournaments-title">
          <h2 id="tournaments-title" class="display mb-4 text-3xl">Torneos</h2>
          <ul v-if="league.tournaments.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <li v-for="t in league.tournaments" :key="t.id">
              <RouterLink :to="{ name: 'tournament', params: { id: t.id } }" class="card flex h-full flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:border-pitch-300">
                <span class="flex flex-wrap items-center gap-2">
                  <StatusBadge v-bind="TOURNAMENT_STATUS[t.status]" />
                  <span class="text-xs font-semibold text-zinc-500">{{ SYSTEM_LABELS[t.system] }}</span>
                </span>
                <span class="font-display text-xl leading-tight font-bold text-zinc-950">{{ t.name }}</span>
                <span class="mt-auto text-xs text-zinc-500">{{ formatDateRange(t.startDate, t.endDate) }} · {{ t.category }}</span>
              </RouterLink>
            </li>
          </ul>
          <EmptyState v-else :icon="Trophy" title="Esta liga aún no tiene torneos" class="card" />
        </section>
      </div>
    </template>
  </div>
</template>
