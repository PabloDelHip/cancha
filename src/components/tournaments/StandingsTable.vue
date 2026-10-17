<script setup lang="ts">
import { computed } from 'vue'
import type { ID, Standing } from '@/types'
import { useTeamsStore } from '@/stores'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import FormGuide from '@/components/teams/FormGuide.vue'

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
  }>(),
  { qualifyCount: 4, highlightTeamId: undefined, withdrawn: () => [], qualified: null },
)

const teams = useTeamsStore()
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
    Estrategia móvil: abreviatura del club y todas las columnas visibles (GF y GC incluidas,
    pedido del usuario); si no cabe, POS y equipo quedan fijos (sticky) y el resto se desplaza
    horizontalmente.
  -->
  <div class="overflow-x-auto">
    <table class="tabular w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-200 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
          <th scope="col" class="sticky left-0 z-10 w-10 bg-white py-2.5 pr-1 pl-4 text-left"><abbr title="Posición">Pos</abbr></th>
          <th scope="col" class="sticky left-10 z-10 bg-white py-2.5 pr-3 text-left">Equipo</th>
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
          <th v-if="!compact" scope="col" class="hidden pr-4 pl-2 text-left lg:table-cell">Forma</th>
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
          <th scope="row" class="sticky left-10 z-10 py-2 pr-3 text-left font-normal" :class="row.teamId === highlightTeamId ? 'bg-lime-50' : 'bg-white'">
            <RouterLink :to="{ name: 'team', params: { id: row.teamId } }" class="group flex items-center gap-2.5">
              <TeamLogo :team="teams.get(row.teamId)" size="sm" />
              <span class="font-semibold text-zinc-900 group-hover:text-pitch-700">
                <span class="sm:hidden">{{ teams.get(row.teamId)?.shortName }}</span>
                <span class="hidden whitespace-nowrap sm:inline">{{ teams.get(row.teamId)?.name }}</span>
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
          <td v-if="!compact" class="hidden pr-4 pl-2 lg:table-cell"><FormGuide :form="row.form" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
