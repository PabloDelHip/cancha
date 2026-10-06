<script setup lang="ts">
import { Medal, Target, Trophy } from 'lucide-vue-next'
import type { KeeperLine, PlayerProfile, ProfileOutcome } from '@/types'
import { MODALITY_LABELS, SYSTEM_LABELS } from '@/utils/labels'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import { COMPETITION_STATUS, stintPeriod } from './profileLabels'

/** `keeper`: línea de PORTERO en esta competición (recibidos, en cero). */
defineProps<{ competition: PlayerProfile['competitions'][number]; keeper?: KeeperLine | null }>()

/** Resultado oficial (torneo finalizado) en una etiqueta: título, final, fase o posición. */
function outcomeLabel(o: ProfileOutcome): { text: string; tone: 'gold' | 'silver' | 'plain'; icon?: unknown } | null {
  if (o.champion) return { text: 'Campeón', tone: 'gold', icon: Trophy }
  if (o.runnerUp) return { text: 'Finalista', tone: 'silver', icon: Medal }
  if (o.reached) return { text: `Llegó a: ${o.reached}`, tone: 'plain' }
  if (o.finalPosition) return { text: `${o.finalPosition.position}º de ${o.finalPosition.teams}`, tone: 'plain' }
  return null
}
const TONE = {
  gold: 'bg-lime-400 text-pitch-950',
  silver: 'bg-zinc-800 text-white',
  plain: 'bg-zinc-100 text-zinc-700',
}

const STATS = [
  { key: 'appearances', label: 'PJ', title: 'Partidos jugados' },
  { key: 'goals', label: 'G', title: 'Goles' },
  { key: 'assists', label: 'A', title: 'Asistencias' },
  { key: 'yellowCards', label: 'TA', title: 'Tarjetas amarillas' },
  { key: 'redCards', label: 'TR', title: 'Tarjetas rojas' },
] as const
</script>

<template>
  <article class="card overflow-hidden">
    <header class="flex items-start justify-between gap-3 px-4 pt-4">
      <div class="min-w-0">
        <RouterLink
          :to="{ name: 'tournament', params: { id: competition.tournament.id } }"
          class="font-display text-xl leading-tight font-bold break-words text-zinc-950 hover:text-pitch-700"
        >
          {{ competition.tournament.name }}
        </RouterLink>
        <p class="mt-0.5 text-xs text-zinc-500">
          <template v-if="competition.system">{{ SYSTEM_LABELS[competition.system] }} · </template>{{ MODALITY_LABELS[competition.tournament.modality] }} · {{ competition.tournament.category }}
        </p>
        <p v-if="competition.topScorer" class="mt-1.5 inline-flex items-center gap-1 rounded-full bg-pitch-900 px-2 py-0.5 text-xs font-semibold text-lime-300">
          <Target class="size-3.5" aria-hidden="true" /> Goleador del torneo · {{ competition.topScorer.goals }}{{ competition.topScorer.shared ? ' (compartido)' : '' }}
        </p>
      </div>
      <StatusBadge v-bind="COMPETITION_STATUS[competition.tournament.status]" class="shrink-0" />
    </header>

    <dl v-if="keeper && keeper.appearances" class="tabular mx-4 mt-3 grid grid-cols-3 rounded-xl bg-pitch-950 py-2.5 text-center text-white">
      <div>
        <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">En cero</dt>
        <dd class="font-display text-2xl font-bold text-lime-300">{{ keeper.cleanSheets }}</dd>
      </div>
      <div>
        <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">Recibidos</dt>
        <dd class="font-display text-2xl font-bold">{{ keeper.conceded }}</dd>
      </div>
      <div>
        <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">Por partido</dt>
        <dd class="font-display text-2xl font-bold">{{ keeper.concededPerMatch ?? '—' }}</dd>
      </div>
    </dl>

    <ul class="divide-y divide-zinc-100">
      <li v-for="s in competition.teams" :key="s.team?.id" class="px-4 py-3">
        <div class="flex items-center gap-3">
          <TeamLogo :team="s.team" size="md" />
          <div class="min-w-0 flex-1">
            <RouterLink v-if="s.team" :to="{ name: 'team', params: { id: s.team.id } }" class="block truncate font-semibold text-zinc-900 hover:text-pitch-700">
              {{ s.team.name }}
            </RouterLink>
            <p class="truncate text-xs text-zinc-500">
              <template v-if="s.shirtNumber">#{{ s.shirtNumber }} · </template>{{ stintPeriod(s.startDate, s.endDate) }}
            </p>
          </div>
          <span
            v-if="s.outcome && outcomeLabel(s.outcome)"
            class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
            :class="TONE[outcomeLabel(s.outcome)!.tone]"
          >
            <component :is="outcomeLabel(s.outcome)!.icon" v-if="outcomeLabel(s.outcome)!.icon" class="size-3.5" aria-hidden="true" />
            {{ outcomeLabel(s.outcome)!.text }}
          </span>
        </div>
        <dl v-if="s.stats.appearances" class="tabular mt-3 grid grid-cols-5 rounded-xl bg-zinc-50 py-2 text-center">
          <div v-for="stat in STATS" :key="stat.key">
            <dt class="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              <abbr :title="stat.title" class="no-underline">{{ stat.label }}</abbr>
            </dt>
            <dd class="font-display text-xl font-bold" :class="s.stats[stat.key] ? 'text-zinc-950' : 'text-zinc-300'">
              {{ s.stats[stat.key] }}
            </dd>
          </div>
        </dl>
        <p v-else class="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-500">
          {{ competition.tournament.status === 'finished' ? 'No disputó partidos en esta competición.' : 'Aún sin partidos disputados en esta competición.' }}
        </p>
      </li>
    </ul>
  </article>
</template>
