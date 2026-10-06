<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerGoalkeeping, PlayerRecords } from '@/types'
import { formatDate } from '@/utils/format'

/** Récords personales derivados en el servidor; solo se muestran los que tienen dato real. */
const props = defineProps<{ records: PlayerRecords; keeper?: PlayerGoalkeeping | null }>()

const rivalOf = (m: { homeTeam: { id: string; shortName: string } | null; awayTeam: { id: string; shortName: string } | null; playerTeamId: string }) =>
  (m.homeTeam?.id === m.playerTeamId ? m.awayTeam : m.homeTeam)?.shortName
const tiles = computed(() => {
  const r = props.records
  const k = props.keeper
  return [
    k?.longestCleanSheetStreak && { label: 'Racha sin recibir gol', value: k.longestCleanSheetStreak.value, note: `partidos seguidos · ${formatDate(k.longestCleanSheetStreak.from)} – ${formatDate(k.longestCleanSheetStreak.to)}` },
    k && k.career.cleanSheets > 0 && { label: k.career.cleanSheets === 1 ? 'Portería en cero' : 'Porterías en cero', value: k.career.cleanSheets, note: `${k.career.cleanSheetRate}% de sus partidos` },
    k && k.career.concededPerMatch !== null && { label: 'Goles recibidos por partido', value: k.career.concededPerMatch, note: `${k.career.conceded} en ${k.career.appearances} partidos` },
    r.mostGoalsInMatch && { label: 'Más goles en un partido', value: r.mostGoalsInMatch.value, note: `vs ${rivalOf(r.mostGoalsInMatch.match) ?? '—'} · ${formatDate(r.mostGoalsInMatch.match.date)}`, to: r.mostGoalsInMatch.match.id },
    r.mostAssistsInMatch && { label: 'Más asistencias en un partido', value: r.mostAssistsInMatch.value, note: `vs ${rivalOf(r.mostAssistsInMatch.match) ?? '—'} · ${formatDate(r.mostAssistsInMatch.match.date)}`, to: r.mostAssistsInMatch.match.id },
    r.longestScoringStreak && { label: 'Racha goleadora', value: r.longestScoringStreak.value, note: `partidos seguidos · ${formatDate(r.longestScoringStreak.from)} – ${formatDate(r.longestScoringStreak.to)}` },
    r.mostMatchesInYear && { label: 'Partidos en un año', value: r.mostMatchesInYear.value, note: r.mostMatchesInYear.year },
    r.hatTricks > 0 && { label: r.hatTricks === 1 ? 'Hat-trick' : 'Hat-tricks', value: r.hatTricks, note: '3 o más goles en un partido' },
    r.braces > 0 && { label: r.braces === 1 ? 'Doblete' : 'Dobletes', value: r.braces, note: '2 goles en un partido' },
  ].filter((t): t is { label: string; value: number; note: string; to?: string } => Boolean(t))
})
const empty = computed(() =>
  props.keeper ? 'Sus récords aparecerán con sus primeros partidos oficiales.' : 'Sus récords aparecerán con sus primeros goles y asistencias oficiales.',
)
</script>

<template>
  <ul v-if="tiles.length" class="grid grid-cols-2 gap-2">
    <li v-for="t in tiles" :key="t.label" class="rounded-2xl bg-white p-3 ring-1 ring-zinc-200/80">
      <component :is="t.to ? 'RouterLink' : 'div'" v-bind="t.to ? { to: { name: 'match', params: { id: t.to } } } : {}" class="block">
        <p class="font-display text-4xl leading-none font-bold text-zinc-950">{{ t.value }}</p>
        <p class="mt-1 text-xs font-semibold text-zinc-800">{{ t.label }}</p>
        <p class="line-clamp-2 text-[11px] text-zinc-500">{{ t.note }}</p>
      </component>
    </li>
  </ul>
  <p v-else class="card px-4 py-3 text-sm text-zinc-500">{{ empty }}</p>
</template>
