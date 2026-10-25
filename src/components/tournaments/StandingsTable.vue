<script setup lang="ts">
import { computed } from 'vue'
import type { ID, Standing } from '@/types'
import { useHistoricalNamesStore } from '@/stores'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import FormGuide from '@/components/teams/FormGuide.vue'
import HScroll from '@/components/common/HScroll.vue'

const props = withDefaults(
  defineProps<{
    standings: Standing[]
    /** Versión reducida (POS, equipo, PJ, GF, GC, DG, PTS). */
    compact?: boolean
    highlightTeamId?: ID
    /** Número de equipos que clasifican a liguilla. */
    qualifyCount?: number
    /** 3D: equipos retirados. Siguen en la tabla, marcados, y no ocupan plaza de clasificación. */
    withdrawn?: ID[]
    /**
     * Clasificados efectivos (la eliminatoria siguiente ya se generó): se marcan tal cual, aunque
     * alguno se retirara después. Sin él, la zona sale de `qualifyCount` saltando a los retirados.
     */
    qualified?: ID[] | null
    /** 10C: torneo de la tabla (en uno finalizado, los nombres con que se jugó). */
    tournamentId?: ID | null
  }>(),
  { qualifyCount: 4, highlightTeamId: undefined, withdrawn: () => [], qualified: null, tournamentId: null },
)

/** 10C: dentro de un torneo finalizado, los nombres con que se jugó. */
const names = useHistoricalNamesStore()
/** Zona de clasificación entre los elegibles: el siguiente ocupa el lugar del retirado. */
const qualifies = computed(() => {
  if (props.qualified) return new Set(props.qualified)
  const out = new Set<ID>()
  let rank = 0
  for (const row of props.standings) {
    if (props.withdrawn.includes(row.teamId)) continue
    if (++rank <= props.qualifyCount) out.add(row.teamId)
  }
  return out
})
</script>

<template>
  <!--
    Móvil: las mismas columnas que en escritorio (con la forma de los últimos 5, pedido del usuario
    2026-10-19); el equipo va con su abreviatura y el nombre completo pequeño debajo. POS y equipo
    quedan fijos (sticky) y el resto se desplaza; HScroll muestra una barra arriba y abajo.
  -->
  <HScroll>
    <table class="tabular w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-200 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
          <th scope="col" class="sticky left-0 z-10 w-10 bg-white py-2.5 pr-1 pl-4 text-left"><abbr title="Posición">Pos</abbr></th>
          <th scope="col" class="sticky left-10 z-10 bg-white py-2.5 pr-3 text-left shadow-[6px_0_6px_-6px_rgb(0_0_0/0.15)]">Equipo</th>
          <th scope="col" class="px-1.5 text-center sm:px-2"><abbr title="Partidos jugados">PJ</abbr></th>
          <template v-if="!compact">
            <th scope="col" class="px-1.5 text-center sm:px-2"><abbr title="Ganados">G</abbr></th>
            <th scope="col" class="px-1.5 text-center sm:px-2"><abbr title="Empatados">E</abbr></th>
            <th scope="col" class="px-1.5 text-center sm:px-2"><abbr title="Perdidos">P</abbr></th>
          </template>
          <th scope="col" class="px-1.5 text-center sm:px-2"><abbr title="Goles a favor">GF</abbr></th>
          <th scope="col" class="px-1.5 text-center sm:px-2"><abbr title="Goles en contra">GC</abbr></th>
          <th scope="col" class="px-1.5 text-center sm:px-2"><abbr title="Diferencia de goles">DG</abbr></th>
          <th scope="col" class="px-3 text-center"><abbr title="Puntos">Pts</abbr></th>
          <th v-if="!compact" scope="col" class="pr-4 pl-2 text-left">Forma</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in standings"
          :key="row.teamId"
          class="border-b border-zinc-100 last:border-0"
          :class="row.teamId === highlightTeamId ? 'bg-lime-50' : 'bg-white'"
        >
          <td class="sticky left-0 z-10 py-3 pr-1 pl-4 font-semibold" :class="row.teamId === highlightTeamId ? 'bg-lime-50' : 'bg-white'">
            <span
              class="grid size-6 place-items-center rounded-md text-xs"
              :class="qualifies.has(row.teamId) ? 'bg-pitch-900 text-lime-400' : 'text-zinc-500'"
            >
              {{ row.position }}
            </span>
          </td>
          <th scope="row" class="sticky left-10 z-10 py-2 pr-3 text-left font-normal shadow-[6px_0_6px_-6px_rgb(0_0_0/0.15)]" :class="row.teamId === highlightTeamId ? 'bg-lime-50' : 'bg-white'">
            <RouterLink :to="{ name: 'team', params: { id: row.teamId } }" class="group flex items-center gap-2.5">
              <TeamLogo :team="names.team(tournamentId, row.teamId)" size="sm" />
              <!-- Móvil: abreviatura y, debajo, el nombre completo pequeño (cortado si no cabe): la columna fija ocupa poco. -->
              <span class="min-w-0 group-hover:text-pitch-700">
                <span class="block font-semibold text-zinc-900 sm:hidden">{{ names.team(tournamentId, row.teamId)?.shortName }}</span>
                <span class="block w-[5.5rem] truncate text-[11px] leading-tight text-zinc-500 sm:hidden">{{ names.team(tournamentId, row.teamId)?.name }}</span>
                <span class="hidden font-semibold whitespace-nowrap text-zinc-900 sm:inline">{{ names.team(tournamentId, row.teamId)?.name }}</span>
              </span>
              <StatusBadge v-if="withdrawn.includes(row.teamId)" label="Retirado" tone="red" />
            </RouterLink>
          </th>
          <td class="px-1.5 text-center sm:px-2 text-zinc-600">{{ row.played }}</td>
          <template v-if="!compact">
            <td class="px-1.5 text-center sm:px-2 text-zinc-600">{{ row.won }}</td>
            <td class="px-1.5 text-center sm:px-2 text-zinc-600">{{ row.drawn }}</td>
            <td class="px-1.5 text-center sm:px-2 text-zinc-600">{{ row.lost }}</td>
          </template>
          <td class="px-1.5 text-center sm:px-2 text-zinc-600">{{ row.goalsFor }}</td>
          <td class="px-1.5 text-center sm:px-2 text-zinc-600">{{ row.goalsAgainst }}</td>
          <td class="px-1.5 text-center sm:px-2 text-zinc-600">{{ row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference }}</td>
          <td class="px-3 text-center font-display text-lg font-bold text-zinc-950">{{ row.points }}</td>
          <td v-if="!compact" class="pr-4 pl-2"><FormGuide :form="row.form" /></td>
        </tr>
      </tbody>
    </table>
  </HScroll>
</template>
