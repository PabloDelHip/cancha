<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileMatch } from '@/types'
import { formatDate, plural } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Partido destacado + mejores actuaciones. El orden lo decide el servidor con contribución
 * objetiva: goles → asistencias → más reciente. Sin valoraciones subjetivas.
 */
/** `keeper`: mejores partidos de PORTERO (porterías en cero), no goles y asistencias. */
const props = defineProps<{ matches: ProfileMatch[]; keeper?: boolean }>()

const featured = computed(() => props.matches[0])
const rest = computed(() => props.matches.slice(1))

const own = (m: ProfileMatch) => (m.homeTeam?.id === m.playerTeamId ? m.homeTeam : m.awayTeam)
const ownScore = (m: ProfileMatch) => (m.homeTeam?.id === m.playerTeamId ? m.homeScore : m.awayScore)
const keeperNote = (m: ProfileMatch) => (ownScore(m) > 0 ? 'Victoria en cero' : 'Empate en cero')
const contribution = (m: ProfileMatch) =>
  props.keeper ? keeperNote(m) : [m.stats.goals && plural(m.stats.goals, 'gol', 'goles'), m.stats.assists && plural(m.stats.assists, 'asistencia')].filter(Boolean).join(' · ')
</script>

<template>
  <div class="space-y-3">
    <RouterLink
      v-if="featured"
      :to="{ name: 'match', params: { id: featured.id } }"
      class="group relative block overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-zinc-200/80 hover:ring-pitch-300"
    >
      <span class="absolute inset-y-0 left-0 w-1.5" :style="{ background: own(featured)?.colors.primary ?? '#226643' }" aria-hidden="true" />
      <p class="eyebrow text-pitch-700">Partido destacado</p>
      <p class="mt-0.5 truncate text-xs text-zinc-500">{{ featured.tournament?.name }} · {{ formatDate(featured.date) }}</p>
      <div class="tabular mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div class="flex min-w-0 items-center gap-2" :class="featured.homeTeam?.id === featured.playerTeamId ? 'font-bold text-zinc-950' : 'text-zinc-600'">
          <TeamLogo :team="featured.homeTeam" size="sm" />
          <span class="line-clamp-2 text-sm break-words">{{ featured.homeTeam?.name }}</span>
        </div>
        <span class="font-display text-3xl font-bold">{{ featured.homeScore }}–{{ featured.awayScore }}</span>
        <div class="flex min-w-0 flex-row-reverse items-center gap-2 text-right" :class="featured.awayTeam?.id === featured.playerTeamId ? 'font-bold text-zinc-950' : 'text-zinc-600'">
          <TeamLogo :team="featured.awayTeam" size="sm" />
          <span class="line-clamp-2 text-sm break-words">{{ featured.awayTeam?.name }}</span>
        </div>
      </div>
      <p v-if="keeper" class="mt-4 inline-flex items-center gap-2 rounded-full bg-pitch-900 px-3 py-1 text-sm font-bold text-lime-300">
        Portería en cero · {{ keeperNote(featured) }}
      </p>
      <dl v-else class="tabular mt-4 flex gap-6">
        <div>
          <dd class="font-display text-5xl leading-none font-bold text-pitch-700">{{ featured.stats.goals }}</dd>
          <dt class="eyebrow mt-1">{{ featured.stats.goals === 1 ? 'Gol' : 'Goles' }}</dt>
        </div>
        <div>
          <dd class="font-display text-5xl leading-none font-bold">{{ featured.stats.assists }}</dd>
          <dt class="eyebrow mt-1">{{ featured.stats.assists === 1 ? 'Asistencia' : 'Asistencias' }}</dt>
        </div>
      </dl>
    </RouterLink>

    <ol v-if="rest.length" class="card divide-y divide-zinc-100 overflow-hidden" aria-label="Otras mejores actuaciones">
      <li v-for="m in rest" :key="m.id">
        <RouterLink :to="{ name: 'match', params: { id: m.id } }" class="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50">
          <TeamLogo :team="own(m)" size="sm" />
          <div class="min-w-0 flex-1">
            <p class="tabular truncate text-sm font-semibold text-zinc-900">
              {{ m.homeTeam?.shortName }} {{ m.homeScore }}–{{ m.awayScore }} {{ m.awayTeam?.shortName }}
            </p>
            <p class="truncate text-xs text-zinc-500">{{ m.tournament?.name }} · {{ formatDate(m.date) }}</p>
          </div>
          <span class="shrink-0 rounded-full bg-pitch-50 px-2 py-0.5 text-xs font-semibold text-pitch-800">{{ contribution(m) }}</span>
        </RouterLink>
      </li>
    </ol>
  </div>
</template>
