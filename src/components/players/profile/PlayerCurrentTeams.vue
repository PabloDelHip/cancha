<script setup lang="ts">
import { computed } from 'vue'
import { CalendarClock } from 'lucide-vue-next'
import type { PlayerProfile, ProfileMatch, TeamRef } from '@/types'
import { formatDate, plural } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * "Actualmente": en fútbol amateur un jugador puede estar en varios equipos a la vez (liga del
 * sábado, torneo nocturno, veteranos…). Se agrupa por EQUIPO (el mismo equipo en dos torneos es un
 * solo bloque) y cada torneo es una fila compacta con sus números. Ninguno es "el principal": el
 * orden es el del servidor (en curso más reciente primero). Escala igual con 1 que con 5 equipos.
 */
const props = defineProps<{ current: PlayerProfile['currentParticipations']; lastMatch?: ProfileMatch | null }>()

const groups = computed(() => {
  const byTeam = new Map<string, { team: TeamRef | null; entries: PlayerProfile['currentParticipations'] }>()
  for (const c of props.current) {
    const key = c.team?.id ?? `sin-equipo-${c.tournament.id}`
    const g = byTeam.get(key) ?? { team: c.team, entries: [] }
    g.entries.push(c)
    byTeam.set(key, g)
  }
  return [...byTeam.values()].map((g) => {
    const numbers = [...new Set(g.entries.map((e) => e.shirtNumber).filter((n): n is number => n !== null))]
    return { ...g, shirt: numbers.length === 1 ? numbers[0] : null }
  })
})

/** Sin competiciones en curso: su último partido oficial le da contexto (inactivo, no "roto"). */
const lastTeam = computed(() => {
  const m = props.lastMatch
  if (!m) return null
  return m.homeTeam?.id === m.playerTeamId ? m.homeTeam : m.awayTeam
})
</script>

<template>
  <section id="actualmente" aria-labelledby="current-title" class="scroll-mt-20">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
      <h2 id="current-title" class="display text-2xl">Actualmente</h2>
      <p v-if="current.length" class="text-sm text-zinc-500">
        {{ plural(groups.length, 'equipo') }} · {{ plural(current.length, 'competición', 'competiciones') }}
      </p>
    </div>

    <ul v-if="current.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="g in groups" :key="g.team?.id ?? g.entries[0]!.tournament.id" class="card overflow-hidden">
        <div class="flex items-center gap-3 px-4 pt-3 pb-2">
          <span class="h-9 w-1 shrink-0 rounded-full" :style="{ background: g.team?.colors.primary ?? '#226643' }" aria-hidden="true" />
          <TeamLogo :team="g.team" size="md" />
          <RouterLink
            v-if="g.team"
            :to="{ name: 'team', params: { id: g.team.id } }"
            class="min-w-0 flex-1 truncate font-semibold text-zinc-950 hover:text-pitch-700"
          >
            {{ g.team.name }}
          </RouterLink>
          <span v-else class="min-w-0 flex-1 text-zinc-500">Equipo</span>
          <span v-if="g.shirt" class="shrink-0 font-display text-2xl leading-none font-bold text-pitch-700">#{{ g.shirt }}</span>
        </div>
        <ul class="divide-y divide-zinc-100 border-t border-zinc-100">
          <li v-for="e in g.entries" :key="e.tournament.id" class="flex items-center gap-3 px-4 py-2">
            <div class="min-w-0 flex-1">
              <RouterLink :to="{ name: 'tournament', params: { id: e.tournament.id } }" class="block truncate text-sm text-zinc-700 hover:text-pitch-700">
                {{ e.tournament.name }}
              </RouterLink>
              <p v-if="!g.shirt && e.shirtNumber" class="text-xs text-zinc-500">#{{ e.shirtNumber }}</p>
            </div>
            <p v-if="e.stats.appearances" class="tabular shrink-0 text-sm text-zinc-500">
              <span class="font-semibold text-zinc-900">{{ e.stats.appearances }}</span> PJ ·
              <span class="font-semibold text-pitch-700">{{ e.stats.goals }}</span> G ·
              <span class="font-semibold text-zinc-900">{{ e.stats.assists }}</span> A
            </p>
            <p v-else class="shrink-0 text-xs text-zinc-400">Sin partidos aún</p>
          </li>
        </ul>
      </li>
    </ul>

    <div v-else class="card flex items-start gap-3 px-4 py-4 text-sm text-zinc-600">
      <CalendarClock class="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden="true" />
      <p>
        Sin competiciones en curso.
        <span v-if="lastMatch" class="block text-xs text-zinc-500">
          Último partido oficial: {{ formatDate(lastMatch.date) }}<template v-if="lastTeam"> con {{ lastTeam.name }}</template>.
        </span>
      </p>
    </div>
  </section>
</template>
