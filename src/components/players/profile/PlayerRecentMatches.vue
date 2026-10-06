<script setup lang="ts">
import type { FormResult, ProfileMatch } from '@/types'
import { formatMatchDay, plural } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import CardIcon from '../CardIcon.vue'

/**
 * Partidos del jugador tal como los entrega el servidor (ya filtrados y ordenados). "Ver más"
 * pide la siguiente página al servidor: nunca se descargan todos los partidos de la plataforma.
 */
defineProps<{ matches: ProfileMatch[]; total: number; hasMore: boolean; loading?: boolean }>()
const emit = defineEmits<{ more: [] }>()

/** Local arriba, visitante abajo; marca cuál es el equipo del jugador. */
function sides(m: ProfileMatch) {
  return [
    { key: 'home', team: m.homeTeam, score: m.homeScore, own: m.homeTeam?.id === m.playerTeamId },
    { key: 'away', team: m.awayTeam, score: m.awayScore, own: m.awayTeam?.id === m.playerTeamId },
  ]
}

const RESULT: Record<FormResult, { label: string; long: string; cls: string }> = {
  W: { label: 'G', long: 'Ganado', cls: 'bg-pitch-600 text-white' },
  D: { label: 'E', long: 'Empate', cls: 'bg-zinc-200 text-zinc-800' },
  L: { label: 'P', long: 'Perdido', cls: 'bg-red-500 text-white' },
}
</script>

<template>
  <div class="card overflow-hidden">
    <ol class="divide-y divide-zinc-100">
      <li v-for="e in matches" :key="e.id">
        <RouterLink :to="{ name: 'match', params: { id: e.id } }" class="flex gap-3 px-4 py-3 hover:bg-zinc-50">
          <span
            v-if="e.result"
            class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold"
            :class="RESULT[e.result].cls"
            :title="RESULT[e.result].long"
          >
            <span aria-hidden="true">{{ RESULT[e.result].label }}</span>
            <span class="sr-only">{{ RESULT[e.result].long }}</span>
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs text-zinc-500">{{ e.tournament?.name }} · {{ formatMatchDay(e.date) }}</p>
            <!-- Marcador en dos filas: nombres completos también a 390px; el equipo del jugador, en negrita -->
            <dl class="tabular mt-1 space-y-0.5 text-sm">
              <div v-for="side in sides(e)" :key="side.key" class="flex items-center gap-2" :class="side.own ? 'font-bold text-zinc-950' : 'text-zinc-600'">
                <TeamLogo :team="side.team" size="xs" />
                <dt class="min-w-0 flex-1 break-words">{{ side.team?.name ?? 'Equipo' }}</dt>
                <dd class="font-display text-lg leading-6 font-bold">{{ side.score }}</dd>
              </div>
            </dl>
            <!-- Aporte del jugador en ese partido (solo lo registrado) -->
            <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span v-if="e.stats.goals" class="rounded-full bg-pitch-50 px-2 py-0.5 font-semibold text-pitch-800">{{ plural(e.stats.goals, 'gol', 'goles') }}</span>
              <span v-if="e.stats.assists" class="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-800">{{ plural(e.stats.assists, 'asistencia') }}</span>
              <span v-if="e.stats.yellowCards" class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                <CardIcon color="yellow" /> {{ e.stats.yellowCards > 1 ? `×${e.stats.yellowCards}` : 'Amarilla' }}
              </span>
              <span v-if="e.stats.redCards" class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700"><CardIcon color="red" /> Roja</span>
              <span v-if="!e.stats.goals && !e.stats.assists && !e.stats.yellowCards && !e.stats.redCards" class="text-zinc-500">Disputó el partido</span>
            </p>
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
