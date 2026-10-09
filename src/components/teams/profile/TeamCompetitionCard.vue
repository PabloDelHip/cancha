<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import type { TeamCompetition } from '@/types'
import { COMPETITION_STATUS, MODALITY_LABELS } from '@/utils/labels'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TeamSquad from './TeamSquad.vue'

defineProps<{ competition: TeamCompetition; color: string }>()

const STATS = [
  { key: 'played', label: 'PJ', title: 'Partidos jugados' },
  { key: 'won', label: 'G', title: 'Ganados' },
  { key: 'drawn', label: 'E', title: 'Empatados' },
  { key: 'lost', label: 'P', title: 'Perdidos' },
  { key: 'goalsFor', label: 'GF', title: 'Goles a favor' },
  { key: 'goalsAgainst', label: 'GC', title: 'Goles en contra' },
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
          {{ MODALITY_LABELS[competition.tournament.modality] }} · {{ competition.tournament.category }}
        </p>
      </div>
      <StatusBadge v-bind="COMPETITION_STATUS[competition.tournament.status]" class="shrink-0" />
    </header>

    <div class="px-4 pt-3 pb-4">
      <p v-if="competition.standing" class="tabular mb-2 text-sm text-zinc-600">
        Posición actual: <strong class="text-zinc-900">{{ competition.standing.position }}º de {{ competition.standing.teams }}</strong>
        · {{ competition.standing.points }} pts
      </p>
      <p v-else-if="competition.finalStanding" class="tabular mb-2 text-sm text-zinc-600">
        Tabla final: <strong class="text-zinc-900">{{ competition.finalStanding.position }}º de {{ competition.finalStanding.teams }}</strong>
        · {{ competition.finalStanding.points }} pts
      </p>
      <dl v-if="competition.record.played" class="tabular grid grid-cols-6 rounded-xl bg-zinc-50 py-2 text-center">
        <div v-for="s in STATS" :key="s.key">
          <dt class="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            <abbr :title="s.title" class="no-underline">{{ s.label }}</abbr>
          </dt>
          <dd class="font-display text-xl font-bold" :class="competition.record[s.key] ? 'text-zinc-950' : 'text-zinc-300'">
            {{ competition.record[s.key] }}
          </dd>
        </div>
      </dl>
      <p v-else class="rounded-xl bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-500">
        {{ competition.tournament.status === 'finished' ? 'No disputó partidos en esta competición.' : 'Aún sin partidos disputados.' }}
      </p>
    </div>

    <details v-if="competition.squad.length" :open="competition.current" class="group border-t border-zinc-100">
      <summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
        <span class="min-w-0 break-words">Plantilla en {{ competition.tournament.name }} ({{ competition.squad.length }})</span>
        <ChevronDown class="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <TeamSquad :squad="competition.squad" :color="color" />
    </details>
    <p v-else class="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">Sin jugadores registrados en esta competición.</p>
  </article>
</template>
