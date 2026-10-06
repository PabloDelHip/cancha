<script setup lang="ts">
import { computed } from 'vue'
import { Users } from 'lucide-vue-next'
import type { Team } from '@/types'
import { fullName } from '@/utils/players'
import { POSITION_SHORT } from '@/utils/labels'
import NumberStepper from '@/components/common/NumberStepper.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import CardIcon from '@/components/players/CardIcon.vue'
import type { CaptureRow } from './captureTypes'

const props = withDefaults(defineProps<{ team: Team | undefined; tournamentId: string | undefined; rows: CaptureRow[]; score: number; rivalOwnGoals?: number }>(), { rivalOwnGoals: 0 })

/** Goles de este equipo explicados: los de sus jugadores + los autogoles del rival. */
const assigned = computed(() => props.rows.reduce((s, r) => s + r.goals, 0) + props.rivalOwnGoals)
const playedCount = computed(() => props.rows.filter((r) => r.played).length)
const allPlayed = computed(() => props.rows.length > 0 && props.rows.every((r) => r.played))

function touch(row: CaptureRow) {
  row.played = true
}
function togglePlayed(row: CaptureRow) {
  row.played = !row.played
  if (!row.played) Object.assign(row, { goals: 0, assists: 0, ownGoals: 0, yellowCards: 0, redCards: 0 })
}
function toggleAll() {
  const value = !allPlayed.value
  for (const row of props.rows) if (row.played !== value) togglePlayed(row)
}
function cycleYellow(row: CaptureRow) {
  row.yellowCards = (row.yellowCards + 1) % 3
  touch(row)
}
function toggleRed(row: CaptureRow) {
  row.redCards = row.redCards ? 0 : 1
  touch(row)
}
</script>

<template>
  <section class="card overflow-hidden" :aria-label="`Estadísticas de ${team?.name}`">
    <header class="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
      <TeamLogo :team="team" size="sm" />
      <div class="min-w-0 flex-1">
        <h2 class="truncate font-bold">{{ team?.name }}</h2>
        <p class="text-xs text-zinc-500">{{ playedCount }} de {{ rows.length }} jugaron</p>
      </div>
      <p
        class="tabular rounded-full px-2.5 py-1 text-xs font-semibold"
        :class="assigned === score ? 'bg-pitch-50 text-pitch-700' : 'bg-amber-50 text-amber-800'"
        aria-live="polite"
      >
        Goles asignados {{ assigned }}/{{ score }}
      </p>
    </header>

    <p v-if="rivalOwnGoals" class="border-b border-zinc-100 px-4 py-1.5 text-xs text-zinc-500">Incluye {{ rivalOwnGoals }} {{ rivalOwnGoals === 1 ? 'autogol' : 'autogoles' }} del rival.</p>
    <p v-if="assigned < score" class="border-b border-amber-100 bg-amber-50/60 px-4 py-2 text-xs text-amber-800">
      {{ score - assigned }} {{ score - assigned === 1 ? 'gol sin asignar' : 'goles sin asignar' }}. Si fue autogol, regístralo en el jugador del rival que lo hizo (AG).
    </p>

    <EmptyState v-if="!rows.length" :icon="Users" title="Este equipo no tiene jugadores" compact>
      <RouterLink
        v-if="tournamentId && team"
        :to="{ name: 'admin-tournament-team', params: { id: tournamentId, teamId: team.id } }"
        class="link text-sm"
      >
        Armar la plantilla
      </RouterLink>
    </EmptyState>

    <template v-else>
      <div class="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
        <button type="button" class="link normal-case tracking-normal" @click="toggleAll">
          {{ allPlayed ? 'Desmarcar todos' : 'Marcar todos como convocados' }}
        </button>
      </div>
      <ul class="divide-y divide-zinc-100">
        <li
          v-for="row in rows"
          :key="row.player.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors"
          :class="row.played ? 'bg-white' : 'bg-zinc-50/80'"
        >
          <label class="flex min-w-0 flex-1 basis-44 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              class="size-5 shrink-0 cursor-pointer rounded accent-pitch-700"
              :checked="row.played"
              :aria-label="`${fullName(row.player)} jugó el partido`"
              @change="togglePlayed(row)"
            />
            <span class="tabular w-6 shrink-0 text-center font-display text-lg font-bold text-zinc-400">{{ row.shirtNumber ?? '–' }}</span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold" :class="row.played ? 'text-zinc-900' : 'text-zinc-400'">{{ fullName(row.player) }}</span>
              <span class="text-[11px] text-zinc-400">{{ POSITION_SHORT[row.player.position] }}</span>
            </span>
          </label>
          <div class="ml-auto flex items-center gap-1.5 sm:gap-2" :class="!row.played && 'opacity-50'">
            <span class="text-[10px] font-bold text-zinc-400" aria-hidden="true">G</span>
            <NumberStepper v-model="row.goals" :label="`goles de ${fullName(row.player)}`" :max="15" @update:model-value="touch(row)" />
            <span class="text-[10px] font-bold text-zinc-400" aria-hidden="true">A</span>
            <NumberStepper v-model="row.assists" :label="`asistencias de ${fullName(row.player)}`" :max="15" @update:model-value="touch(row)" />
            <span class="text-[10px] font-bold text-red-400" aria-hidden="true" title="Autogol">AG</span>
            <NumberStepper v-model="row.ownGoals" :label="`autogoles de ${fullName(row.player)}`" :max="9" @update:model-value="touch(row)" />
            <button
              type="button"
              class="relative grid size-8 place-items-center rounded-lg border transition"
              :class="row.yellowCards ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-200 hover:bg-zinc-100'"
              :aria-label="`Amarillas de ${fullName(row.player)}: ${row.yellowCards}`"
              @click="cycleYellow(row)"
            >
              <CardIcon color="yellow" :class="!row.yellowCards && 'opacity-30'" />
              <span v-if="row.yellowCards > 1" class="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">2</span>
            </button>
            <button
              type="button"
              class="grid size-8 place-items-center rounded-lg border transition"
              :class="row.redCards ? 'border-red-400 bg-red-50' : 'border-zinc-200 hover:bg-zinc-100'"
              :aria-pressed="row.redCards > 0"
              :aria-label="`Roja para ${fullName(row.player)}`"
              @click="toggleRed(row)"
            >
              <CardIcon color="red" :class="!row.redCards && 'opacity-30'" />
            </button>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>
