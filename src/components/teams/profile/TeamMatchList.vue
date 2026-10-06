<script setup lang="ts">
import type { FormResult, TeamMatch } from '@/types'
import { formatMatchDay } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/** Partidos del equipo, desde su lado: el equipo del perfil en negrita. */
withDefaults(defineProps<{ matches: TeamMatch[]; teamId: string; total?: number; hasMore?: boolean; loading?: boolean }>(), {
  total: 0,
  hasMore: false,
  loading: false,
})
const emit = defineEmits<{ more: [] }>()

const RESULT: Record<FormResult, { label: string; long: string; cls: string }> = {
  W: { label: 'G', long: 'Ganado', cls: 'bg-pitch-600 text-white' },
  D: { label: 'E', long: 'Empate', cls: 'bg-zinc-200 text-zinc-800' },
  L: { label: 'P', long: 'Perdido', cls: 'bg-red-500 text-white' },
}

function sides(m: TeamMatch, teamId: string) {
  return [
    { key: 'home', team: m.homeTeam, score: m.homeScore, own: m.homeTeam?.id === teamId },
    { key: 'away', team: m.awayTeam, score: m.awayScore, own: m.awayTeam?.id === teamId },
  ]
}
</script>

<template>
  <div class="card overflow-hidden">
    <ol class="divide-y divide-zinc-100">
      <li v-for="m in matches" :key="m.id">
        <RouterLink :to="{ name: 'match', params: { id: m.id } }" class="flex gap-3 px-4 py-3 hover:bg-zinc-50">
          <span
            v-if="m.result"
            class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold"
            :class="RESULT[m.result].cls"
            :title="RESULT[m.result].long"
          >
            <span aria-hidden="true">{{ RESULT[m.result].label }}</span>
            <span class="sr-only">{{ RESULT[m.result].long }}</span>
          </span>
          <span
            v-else
            class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-center text-[10px] leading-tight font-semibold text-zinc-600"
          >
            {{ m.status === 'live' ? 'EN JUEGO' : m.time }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs break-words text-zinc-500">
              {{ m.tournament?.name }} · {{ formatMatchDay(m.date) }}
            </p>
            <dl class="tabular mt-1 space-y-0.5 text-sm">
              <div v-for="side in sides(m, teamId)" :key="side.key" class="flex items-center gap-2" :class="side.own ? 'font-bold text-zinc-950' : 'text-zinc-600'">
                <TeamLogo :team="side.team" size="xs" />
                <dt class="min-w-0 flex-1 break-words">{{ side.team?.name ?? 'Equipo' }}</dt>
                <dd v-if="side.score !== null" class="font-display text-lg leading-6 font-bold">{{ side.score }}</dd>
              </div>
            </dl>
          </div>
        </RouterLink>
      </li>
    </ol>
    <button
      v-if="hasMore"
      type="button"
      class="w-full border-t border-zinc-100 py-3 text-sm font-semibold text-pitch-700 hover:bg-zinc-50 disabled:opacity-60"
      :disabled="loading"
      @click="emit('more')"
    >
      {{ loading ? 'Cargando…' : matches.length <= 5 ? `Ver los ${total} partidos` : 'Ver más partidos' }}
    </button>
  </div>
</template>
