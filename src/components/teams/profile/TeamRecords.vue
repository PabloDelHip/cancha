<script setup lang="ts">
import { computed } from 'vue'
import { BrickWall, Frown, PartyPopper, ShieldCheck, ThumbsDown, Trophy, TrendingUp } from 'lucide-vue-next'
import type { TeamRecords, TeamTournamentRecord } from '@/types'
import { formatDate } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Récords del equipo (todo de partidos oficiales finalizados): mayor victoria y derrota, porterías
 * en cero y mejor / peor torneo (puntos por partido; un título pesa más).
 */
const props = defineProps<{ records: TeamRecords; teamId: string; color: string }>()

type Score = NonNullable<TeamRecords['biggestWin']>
const rival = (s: Score) => (s.match.homeTeam?.id === props.teamId ? s.match.awayTeam : s.match.homeTeam)
/** Victoria y derrota siempre en pareja: la que no existe se explica en su lugar (sin huecos). */
const scoreCards = computed(() => [
  {
    label: 'Mayor victoria',
    s: props.records.biggestWin,
    icon: PartyPopper,
    tone: 'from-lime-300 to-lime-400 text-pitch-950',
    emptyIcon: TrendingUp,
    emptyTitle: 'Aún sin victorias',
    emptyText: 'Su mayor victoria aparecerá aquí.',
  },
  {
    label: 'Mayor derrota',
    s: props.records.biggestLoss,
    icon: Frown,
    tone: 'from-zinc-800 to-zinc-900 text-white',
    emptyIcon: ShieldCheck,
    emptyTitle: 'Invicto',
    emptyText: 'Aún no pierde un partido oficial.',
  },
])
const tournamentCards = computed(() => [
  { c: props.records.bestTournament, label: 'Mejor torneo', icon: Trophy, accent: props.color },
  { c: props.records.worstTournament, label: 'Torneo más difícil', icon: ThumbsDown, accent: '#a1a1aa' },
])
const tournamentNote = (t: TeamTournamentRecord) =>
  t.champion
    ? 'Campeón'
    : t.finalStanding
      ? `${t.finalStanding.position}º de ${t.finalStanding.teams}`
      : `${t.record.won}G ${t.record.drawn}E ${t.record.lost}P`
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <!-- Mayor victoria / derrota: si falta una, tarjeta del mismo tamaño con un mensaje (sin huecos) -->
    <template v-for="r in scoreCards" :key="r.label">
      <RouterLink
        v-if="r.s"
        :to="{ name: 'match', params: { id: r.s.match.id } }"
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 transition hover:-translate-y-0.5"
        :class="r.tone"
      >
        <component :is="r.icon" class="absolute -top-2 -right-2 size-20 opacity-15" aria-hidden="true" />
        <p class="text-[11px] font-bold tracking-wider uppercase opacity-70">{{ r.label }}</p>
        <p class="tabular mt-1 font-display text-5xl leading-none font-bold">{{ r.s.goalsFor }}–{{ r.s.goalsAgainst }}</p>
        <p class="mt-2 flex items-center gap-1.5 text-sm font-semibold">
          vs <TeamLogo :team="rival(r.s)" size="xs" /> <span class="truncate">{{ rival(r.s)?.name }}</span>
        </p>
        <p class="truncate text-xs opacity-70">{{ r.s.match.tournament?.name }} · {{ formatDate(r.s.match.date) }}</p>
      </RouterLink>
      <div v-else class="relative flex flex-col justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-4">
        <component :is="r.emptyIcon" class="absolute -top-2 -right-2 size-20 text-zinc-100" aria-hidden="true" />
        <p class="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">{{ r.label }}</p>
        <p class="mt-1 font-display text-2xl leading-tight font-bold text-zinc-900">{{ r.emptyTitle }}</p>
        <p class="text-sm text-zinc-500">{{ r.emptyText }}</p>
      </div>
    </template>

    <!-- Porterías en cero -->
    <div class="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200/80 sm:col-span-2">
      <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-pitch-50 text-pitch-700"><BrickWall class="size-6" aria-hidden="true" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">Portería en cero</p>
        <p class="text-sm text-zinc-600">Partidos sin recibir gol</p>
      </div>
      <p class="tabular text-right">
        <span class="font-display text-4xl leading-none font-bold text-zinc-950">{{ records.cleanSheets.count }}</span>
        <span v-if="records.cleanSheets.rate !== null" class="block text-xs font-semibold text-zinc-500">{{ records.cleanSheets.rate }}% de {{ records.cleanSheets.played }} partidos</span>
      </p>
    </div>

    <!-- Mejor / peor torneo: el peor se compara a partir del segundo torneo -->
    <template v-if="records.bestTournament">
      <template v-for="t in tournamentCards" :key="t.label">
        <RouterLink
          v-if="t.c"
          :to="{ name: 'tournament', params: { id: t.c.tournament.id } }"
          class="relative overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-zinc-200/80 transition hover:ring-pitch-300"
        >
          <span class="absolute inset-y-0 left-0 w-1.5" :style="{ background: t.accent }" aria-hidden="true" />
          <p class="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
            <component :is="t.icon" class="size-3.5" aria-hidden="true" /> {{ t.label }}
          </p>
          <p class="mt-1 truncate font-display text-xl leading-tight font-bold text-zinc-950">{{ t.c.tournament.name }}</p>
          <p class="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm text-zinc-600">
            <span class="font-semibold" :class="t.c.champion ? 'text-lime-700' : 'text-zinc-800'">{{ tournamentNote(t.c) }}</span>
            <span class="tabular">{{ t.c.pointsPerMatch }} pts/partido</span>
            <span class="tabular">{{ t.c.record.goalsFor }}:{{ t.c.record.goalsAgainst }}</span>
          </p>
        </RouterLink>
        <div v-else class="relative overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-4">
          <p class="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            <component :is="t.icon" class="size-3.5" aria-hidden="true" /> {{ t.label }}
          </p>
          <p class="mt-1 font-display text-xl leading-tight font-bold text-zinc-900">Solo un torneo jugado</p>
          <p class="text-sm text-zinc-500">Se compara a partir de su segundo torneo.</p>
        </div>
      </template>
    </template>
  </div>
</template>
