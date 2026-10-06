<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, CalendarX, ChevronLeft, Clock, Goal, Handshake, MapPin, Star, Users } from 'lucide-vue-next'
import type { ID, PlayerMatchStats, TeamRef } from '@/types'
import { useMatchesStore, usePlayersStore, useRoundsStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useLeagueData } from '@/composables/useLeagueData'
import { usePageTitle } from '@/composables/usePageTitle'
import { trackViewOnce } from '@/services/analytics'
import { MATCH_STATUS, POSITION_LABELS } from '@/utils/labels'
import { formatDate } from '@/utils/format'
import { fullName } from '@/utils/players'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import CardIcon from '@/components/players/CardIcon.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import MatchCard from '@/components/matches/MatchCard.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

/**
 * Ficha del partido: marcador con los colores de ambos equipos, goles y tarjetas por equipo, la
 * figura del partido, comparativa, alineaciones (con dorsal del torneo) y el resto de la jornada.
 */
const props = defineProps<{ id: string }>()

const { loading, error, reload } = useLeagueData()
const matches = useMatchesStore()
const teams = useTeamsStore()
const players = usePlayersStore()
const tournaments = useTournamentsStore()
const rounds = useRoundsStore()

const match = computed(() => matches.get(props.id))
const home = computed(() => teams.get(match.value?.homeTeamId))
const away = computed(() => teams.get(match.value?.awayTeamId))
const tournament = computed(() => (match.value ? tournaments.get(match.value.tournamentId) : undefined))
const hasScore = computed(() => match.value?.homeScore != null && match.value?.awayScore != null)
usePageTitle(() => (home.value && away.value ? `${home.value.name} vs ${away.value.name}` : undefined))

// Analítica: solo con el partido cargado (inexistente/errores → null). Ids técnicos, sin nombres.
trackViewOnce('match_viewed', () => (!loading.value && !error.value && match.value ? match.value.id : null), () => ({
  match_id: match.value!.id,
  tournament_id: match.value!.tournamentId,
  match_status: match.value!.status,
  has_result: hasScore.value,
  data_coverage: tournament.value?.dataCoverage ?? null,
}))

const stats = computed(() => matches.statsOf(props.id))
type Row = PlayerMatchStats & { player: ReturnType<typeof players.get>; shirt: number | null }
function side(teamId: ID | undefined) {
  const rows: Row[] = stats.value
    .filter((s) => s.teamId === teamId)
    .map((s) => ({ ...s, player: players.get(s.playerId), shirt: match.value ? (players.membershipIn(match.value.tournamentId, s.playerId)?.shirtNumber ?? null) : null }))
  const sum = (k: 'goals' | 'assists' | 'yellowCards' | 'redCards') => rows.reduce((n, r) => n + r[k], 0)
  return {
    lineup: [...rows].sort((a, b) => (a.shirt ?? 99) - (b.shirt ?? 99) || b.goals - a.goals),
    scorers: rows.filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals),
    /** Autogoles de ESTE equipo: se muestran del lado del rival, que es quien los suma. */
    ownGoals: rows.filter((s) => (s.ownGoals ?? 0) > 0),
    assisters: rows.filter((s) => s.assists > 0),
    cards: rows.filter((s) => s.yellowCards || s.redCards),
    totals: { players: rows.length, goals: sum('goals'), assists: sum('assists'), yellow: sum('yellowCards'), red: sum('redCards') },
  }
}
const homeSide = computed(() => side(match.value?.homeTeamId))
const awaySide = computed(() => side(match.value?.awayTeamId))

/** Figura del partido: más goles + asistencias (desempata goles); solo con el partido finalizado. */
const mvp = computed(() => {
  if (match.value?.status !== 'finished') return null
  const best = [...stats.value].sort((a, b) => b.goals + b.assists - (a.goals + a.assists) || b.goals - a.goals)[0]
  if (!best || best.goals + best.assists === 0) return null
  return { ...best, player: players.get(best.playerId), team: teams.get(best.teamId) }
})

const comparison = computed(() => {
  const h = homeSide.value.totals
  const a = awaySide.value.totals
  return [
    { label: 'Goles de jugadores', home: h.goals, away: a.goals },
    { label: 'Asistencias', home: h.assists, away: a.assists },
    { label: 'Amarillas', home: h.yellow, away: a.yellow },
    { label: 'Rojas', home: h.red, away: a.red },
    { label: 'Jugadores', home: h.players, away: a.players },
  ].filter((r) => r.home + r.away > 0)
})
const share = (x: number, y: number) => (x + y ? Math.round((x / (x + y)) * 100) : 50)

const roundMates = computed(() =>
  match.value ? matches.ofTournament(match.value.tournamentId).filter((m) => m.round === match.value!.round && m.id !== match.value!.id) : [],
)
const color = (t: TeamRef | undefined, fallback: string) => t?.colors?.primary ?? fallback
const winner = computed(() => {
  const m = match.value
  if (!m || m.status !== 'finished' || !hasScore.value) return null
  if (m.homeScore! !== m.awayScore!) return m.homeScore! > m.awayScore! ? 'home' : 'away'
  if (m.penalties && m.penalties.home !== m.penalties.away) return m.penalties.home > m.penalties.away ? 'home' : 'away'
  return 'draw'
})
</script>

<template>
  <div>
    <div v-if="loading || error || !match" class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="reload" />
      <EmptyState v-else :icon="CalendarX" title="Partido no encontrado" class="card" />
    </div>

    <template v-else>
      <!-- Marcador con los colores de ambos equipos -->
      <section class="relative overflow-hidden bg-pitch-950 text-white">
        <div
          class="absolute inset-0 opacity-60"
          :style="{ background: `linear-gradient(105deg, ${color(home, '#14532d')} 0%, transparent 42%, transparent 58%, ${color(away, '#1e3a8a')} 100%)` }"
          aria-hidden="true"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50" aria-hidden="true" />
        <div class="relative mx-auto max-w-5xl px-4 pt-5 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <RouterLink v-if="tournament" :to="{ name: 'tournament-matches', params: { id: tournament.id } }" class="inline-flex items-center gap-1 font-semibold text-white/80 hover:text-white">
              <ChevronLeft class="size-4" aria-hidden="true" /> {{ tournament.name }} · {{ rounds.labelOf(tournament.id, match.round) }}
            </RouterLink>
            <StatusBadge v-bind="MATCH_STATUS[match.status]" :pulse="match.status === 'live'" />
          </div>

          <div class="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-6">
            <RouterLink :to="{ name: 'team', params: { id: match.homeTeamId } }" class="flex flex-col items-center gap-2 text-center">
              <span class="rounded-2xl bg-white/95 p-2 shadow-lg sm:p-3"><TeamLogo :team="home" size="lg" /></span>
              <span class="line-clamp-2 text-sm font-bold sm:text-xl" :class="winner === 'away' && 'text-white/60'">{{ home?.name }}</span>
            </RouterLink>
            <div class="tabular text-center">
              <p v-if="hasScore" class="font-display text-6xl leading-none font-extrabold sm:text-8xl">
                {{ match.homeScore }}<span class="mx-1.5 text-white/40 sm:mx-3">–</span>{{ match.awayScore }}
              </p>
              <p v-else-if="match.status === 'postponed'" class="font-display text-3xl text-amber-300">Pospuesto</p>
              <p v-else class="font-display text-5xl font-bold text-white/90">{{ match.status === 'cancelled' ? '—' : match.time }}</p>
              <p v-if="match.extraTime" class="mt-1 text-xs font-semibold text-lime-300">Tras tiempos extra</p>
              <p v-if="match.penalties" class="mt-1 rounded-full bg-black/30 px-3 py-0.5 text-xs font-bold text-amber-300">
                Penales {{ match.penalties.home }}–{{ match.penalties.away }}
              </p>
            </div>
            <RouterLink :to="{ name: 'team', params: { id: match.awayTeamId } }" class="flex flex-col items-center gap-2 text-center">
              <span class="rounded-2xl bg-white/95 p-2 shadow-lg sm:p-3"><TeamLogo :team="away" size="lg" /></span>
              <span class="line-clamp-2 text-sm font-bold sm:text-xl" :class="winner === 'home' && 'text-white/60'">{{ away?.name }}</span>
            </RouterLink>
          </div>

          <!-- Goleadores bajo el marcador -->
          <div v-if="homeSide.scorers.length || awaySide.scorers.length || homeSide.ownGoals.length || awaySide.ownGoals.length" class="mt-6 grid grid-cols-2 gap-4 text-xs sm:text-sm">
            <ul class="space-y-1 text-right">
              <li v-for="s in homeSide.scorers" :key="s.id" class="text-white/90">
                {{ s.player ? fullName(s.player) : '—' }} <Goal class="inline size-3.5 text-lime-300" aria-hidden="true" /><span v-if="s.goals > 1" class="font-bold"> ×{{ s.goals }}</span>
              </li>
              <li v-for="s in awaySide.ownGoals" :key="`og${s.id}`" class="text-white/75">
                {{ s.player ? fullName(s.player) : '—' }} <span class="font-semibold text-red-300">(a.g.)</span> <Goal class="inline size-3.5 text-red-300" aria-hidden="true" /><span v-if="(s.ownGoals ?? 0) > 1" class="font-bold"> ×{{ s.ownGoals }}</span>
              </li>
            </ul>
            <ul class="space-y-1">
              <li v-for="s in awaySide.scorers" :key="s.id" class="text-white/90">
                <Goal class="inline size-3.5 text-lime-300" aria-hidden="true" /><span v-if="s.goals > 1" class="font-bold">×{{ s.goals }} </span> {{ s.player ? fullName(s.player) : '—' }}
              </li>
              <li v-for="s in homeSide.ownGoals" :key="`og${s.id}`" class="text-white/75">
                <Goal class="inline size-3.5 text-red-300" aria-hidden="true" /><span v-if="(s.ownGoals ?? 0) > 1" class="font-bold">×{{ s.ownGoals }} </span> {{ s.player ? fullName(s.player) : '—' }} <span class="font-semibold text-red-300">(a.g.)</span>
              </li>
            </ul>
          </div>

          <p class="mt-6 flex flex-wrap justify-center gap-2 text-xs">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15" :class="match.status === 'postponed' && 'line-through'"><CalendarDays class="size-3.5" aria-hidden="true" /> {{ formatDate(match.date, 'long') }}</span>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15" :class="match.status === 'postponed' && 'line-through'"><Clock class="size-3.5" aria-hidden="true" /> {{ match.time }} h</span>
            <span v-if="match.venue" class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15"><MapPin class="size-3.5" aria-hidden="true" /> {{ match.venue }}</span>
          </p>
        </div>
      </section>

      <div class="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <template v-if="stats.length">
          <div class="grid gap-4 md:grid-cols-[1fr_1.3fr]">
            <!-- Figura del partido -->
            <section v-if="mvp" aria-label="Figura del partido" class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lime-300 to-lime-400 p-5 text-pitch-950">
              <Star class="absolute -top-3 -right-3 size-28 text-white/30" aria-hidden="true" />
              <p class="text-[11px] font-bold tracking-wider uppercase opacity-70">Figura del partido</p>
              <RouterLink :to="{ name: 'player', params: { id: mvp.playerId } }" class="relative mt-3 flex items-center gap-3">
                <PlayerAvatar :player="mvp.player" size="lg" decorative class="ring-4 ring-white/60" />
                <span class="min-w-0">
                  <span class="display block text-2xl leading-none break-words">{{ mvp.player ? fullName(mvp.player) : 'Jugador' }}</span>
                  <span class="mt-1 flex items-center gap-1.5 text-sm font-semibold opacity-80"><TeamLogo :team="mvp.team" size="xs" /> {{ mvp.team?.name }}</span>
                </span>
              </RouterLink>
              <p class="relative mt-4 flex gap-4 font-display text-xl font-bold">
                <span v-if="mvp.goals"><span class="text-3xl">{{ mvp.goals }}</span> {{ mvp.goals === 1 ? 'gol' : 'goles' }}</span>
                <span v-if="mvp.assists"><span class="text-3xl">{{ mvp.assists }}</span> {{ mvp.assists === 1 ? 'asistencia' : 'asistencias' }}</span>
              </p>
            </section>

            <!-- Comparativa -->
            <section aria-labelledby="cmp-title" class="card p-5" :class="!mvp && 'md:col-span-2'">
              <div class="mb-4 flex items-center justify-between gap-2">
                <TeamLogo :team="home" size="sm" />
                <h2 id="cmp-title" class="text-sm font-bold tracking-wider text-zinc-500 uppercase">Comparativa</h2>
                <TeamLogo :team="away" size="sm" />
              </div>
              <ul class="space-y-3">
                <li v-for="r in comparison" :key="r.label">
                  <div class="tabular flex items-center justify-between text-sm">
                    <span class="font-display text-lg font-bold">{{ r.home }}</span>
                    <span class="text-xs text-zinc-500">{{ r.label }}</span>
                    <span class="font-display text-lg font-bold">{{ r.away }}</span>
                  </div>
                  <div class="mt-1 flex h-2 gap-1 overflow-hidden">
                    <div class="flex flex-1 justify-end rounded-l-full bg-zinc-100">
                      <div class="h-full rounded-l-full" :style="{ width: `${share(r.home, r.away)}%`, backgroundColor: color(home, '#166534') }" />
                    </div>
                    <div class="flex-1 rounded-r-full bg-zinc-100">
                      <div class="h-full rounded-r-full" :style="{ width: `${share(r.away, r.home)}%`, backgroundColor: color(away, '#1e40af') }" />
                    </div>
                  </div>
                </li>
              </ul>
            </section>
          </div>

          <!-- Tarjetas y asistencias por equipo -->
          <section v-if="homeSide.cards.length || awaySide.cards.length || homeSide.assisters.length || awaySide.assisters.length" aria-label="Incidencias" class="grid gap-4 sm:grid-cols-2">
            <div v-for="b in [{ team: home, s: homeSide }, { team: away, s: awaySide }]" :key="b.team?.id" class="card p-4">
              <h3 class="mb-2 flex items-center gap-2 text-sm font-bold"><TeamLogo :team="b.team" size="xs" /> {{ b.team?.name }}</h3>
              <ul class="space-y-1.5 text-sm">
                <li v-for="s in b.s.assisters" :key="`a${s.id}`" class="flex items-center gap-2 text-zinc-700">
                  <Handshake class="size-4 text-sky-600" aria-hidden="true" /> {{ s.player ? fullName(s.player) : '—' }}<span v-if="s.assists > 1" class="text-xs text-zinc-500">×{{ s.assists }}</span>
                </li>
                <li v-for="s in b.s.cards" :key="`c${s.id}`" class="flex items-center gap-2 text-zinc-700">
                  <span class="inline-flex gap-0.5"><CardIcon v-for="n in s.yellowCards" :key="`y${n}`" color="yellow" /><CardIcon v-for="n in s.redCards" :key="`r${n}`" color="red" /></span>
                  {{ s.player ? fullName(s.player) : '—' }}
                  <span class="sr-only">{{ s.yellowCards ? `${s.yellowCards} amarilla` : '' }} {{ s.redCards ? `${s.redCards} roja` : '' }}</span>
                </li>
                <li v-if="!b.s.cards.length && !b.s.assisters.length" class="text-xs text-zinc-500">Sin asistencias ni tarjetas</li>
              </ul>
            </div>
          </section>

          <!-- Alineaciones -->
          <section aria-labelledby="lineups-title">
            <h2 id="lineups-title" class="display mb-3 flex items-center gap-2 text-2xl"><Users class="size-6 text-pitch-700" aria-hidden="true" /> Alineaciones</h2>
            <div class="grid gap-4 md:grid-cols-2">
              <div v-for="block in [{ team: home, side: homeSide }, { team: away, side: awaySide }]" :key="block.team?.id" class="card overflow-hidden">
                <h3 class="flex items-center gap-2 px-4 py-3 font-semibold text-white" :style="{ backgroundColor: color(block.team, '#14532d') }">
                  <span class="rounded-lg bg-white/90 p-0.5"><TeamLogo :team="block.team" size="xs" /></span> {{ block.team?.name }}
                  <span class="ml-auto text-xs font-medium text-white/80">{{ block.side.lineup.length }} jugadores</span>
                </h3>
                <ul class="divide-y divide-zinc-100">
                  <li v-for="s in block.side.lineup" :key="s.id">
                    <RouterLink :to="{ name: 'player', params: { id: s.playerId } }" class="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-50">
                      <span class="tabular w-6 text-center font-display text-base font-bold text-zinc-400">{{ s.shirt ?? '–' }}</span>
                      <PlayerAvatar :player="s.player" size="sm" decorative />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium text-zinc-800">{{ s.player ? fullName(s.player) : 'Jugador' }}</span>
                        <span v-if="s.player" class="block text-[11px] text-zinc-500">{{ POSITION_LABELS[s.player.position] }}</span>
                      </span>
                      <span v-if="s.goals" class="inline-flex items-center gap-0.5 text-xs font-bold text-pitch-700"><Goal class="size-3.5" aria-hidden="true" />{{ s.goals > 1 ? s.goals : '' }}<span class="sr-only">{{ s.goals }} goles</span></span>
                      <span v-if="s.ownGoals" class="rounded bg-red-50 px-1 text-[10px] font-bold text-red-700" :title="`${s.ownGoals} autogol`">AG{{ s.ownGoals > 1 ? ` ×${s.ownGoals}` : '' }}<span class="sr-only"> autogol</span></span>
                      <span v-if="s.assists" class="inline-flex items-center gap-0.5 text-xs font-bold text-sky-700"><Handshake class="size-3.5" aria-hidden="true" />{{ s.assists > 1 ? s.assists : '' }}<span class="sr-only">{{ s.assists }} asistencias</span></span>
                      <CardIcon v-for="n in s.yellowCards" :key="`y${n}`" color="yellow" />
                      <CardIcon v-for="n in s.redCards" :key="`r${n}`" color="red" />
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </template>
        <EmptyState
          v-else-if="match.status === 'scheduled'"
          :icon="CalendarDays"
          title="Partido por jugarse"
          description="Las estadísticas aparecerán cuando el organizador capture el resultado."
          class="card"
        />
        <EmptyState
          v-else-if="match.status === 'postponed'"
          :icon="CalendarX"
          title="Partido pospuesto"
          description="El organizador anunciará la nueva fecha. Mientras tanto no cuenta en la tabla."
          class="card"
        />
        <EmptyState v-else-if="match.status === 'cancelled'" :icon="CalendarX" title="Partido cancelado" description="No se jugará y no cuenta en la tabla." class="card" />

        <section v-if="roundMates.length && tournament" aria-labelledby="round-title">
          <h2 id="round-title" class="display mb-3 text-2xl">Más de la {{ rounds.labelOf(tournament.id, match.round).toLowerCase() }}</h2>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <MatchCard v-for="m in roundMates" :key="m.id" :match="m" />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
