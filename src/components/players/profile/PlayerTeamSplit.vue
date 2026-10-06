<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerGoalkeeping, PlayerProfile } from '@/types'
import { formatDate } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/** Rendimiento por equipo representado en cada partido (no por plantillas actuales). */
/** `keeper` (portero): en lugar de goles y asistencias, en cero y recibidos con cada equipo. */
const props = defineProps<{ teams: PlayerProfile['byTeam']; keeper?: PlayerGoalkeeping['byTeam'] | null }>()
const keeperOf = (id: string | undefined) => props.keeper?.find((k) => k.team?.id === id)
const max = computed(() => Math.max(1, ...props.teams.map((t) => t.stats.appearances)))
const period = (a: string, b: string) => (a.slice(0, 4) === b.slice(0, 4) && a === b ? formatDate(a) : `${formatDate(a)} – ${formatDate(b)}`)
</script>

<template>
  <ul class="card divide-y divide-zinc-100 overflow-hidden">
    <li v-for="t in teams" :key="t.team?.id" class="px-4 py-3">
      <div class="flex items-center gap-3">
        <TeamLogo :team="t.team" size="md" />
        <div class="min-w-0 flex-1">
          <RouterLink v-if="t.team" :to="{ name: 'team', params: { id: t.team.id } }" class="block truncate font-semibold text-zinc-900 hover:text-pitch-700">
            {{ t.team.name }}
          </RouterLink>
          <p class="truncate text-xs text-zinc-500">{{ period(t.firstDate, t.lastDate) }} · {{ t.competitions }} {{ t.competitions === 1 ? 'competición' : 'competiciones' }}</p>
        </div>
        <dl class="tabular flex shrink-0 gap-3 text-center">
          <div><dd class="font-display text-xl leading-none font-bold">{{ t.stats.appearances }}</dd><dt class="text-[10px] font-semibold text-zinc-500">PJ</dt></div>
          <template v-if="keeper">
            <div><dd class="font-display text-xl leading-none font-bold text-pitch-700">{{ keeperOf(t.team?.id)?.cleanSheets ?? 0 }}</dd><dt class="text-[10px] font-semibold text-zinc-500"><abbr title="Porterías en cero" class="no-underline">EC</abbr></dt></div>
            <div><dd class="font-display text-xl leading-none font-bold">{{ keeperOf(t.team?.id)?.conceded ?? 0 }}</dd><dt class="text-[10px] font-semibold text-zinc-500"><abbr title="Goles recibidos" class="no-underline">GR</abbr></dt></div>
          </template>
          <template v-else>
            <div><dd class="font-display text-xl leading-none font-bold text-pitch-700">{{ t.stats.goals }}</dd><dt class="text-[10px] font-semibold text-zinc-500">G</dt></div>
            <div><dd class="font-display text-xl leading-none font-bold">{{ t.stats.assists }}</dd><dt class="text-[10px] font-semibold text-zinc-500">A</dt></div>
          </template>
        </dl>
      </div>
      <div class="mt-2 h-1.5 rounded-full bg-zinc-100" aria-hidden="true">
        <div class="h-full rounded-full" :style="{ width: `${(t.stats.appearances / max) * 100}%`, background: t.team?.colors.primary ?? '#226643' }" />
      </div>
    </li>
  </ul>
</template>
