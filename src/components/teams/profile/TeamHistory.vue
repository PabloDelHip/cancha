<script setup lang="ts">
import type { TeamProfile } from '@/types'
import { COMPETITION_STATUS } from '@/utils/labels'

/** Historia por año de inicio de cada torneo (no hay "temporadas" como concepto en el modelo). */
defineProps<{ history: TeamProfile['history'] }>()
</script>

<template>
  <ol class="space-y-5">
    <li v-for="y in history" :key="y.year">
      <h3 class="font-display text-lg font-bold text-zinc-400">{{ y.year }}</h3>
      <ol class="relative mt-2 ml-3 border-l-2 border-zinc-200">
        <li v-for="c in y.competitions" :key="c.tournament.id" class="relative pb-4 pl-5 last:pb-0">
          <span
            class="absolute top-1.5 -left-[7px] size-3 rounded-full ring-4 ring-canvas"
            :class="c.current ? 'bg-lime-500' : 'bg-zinc-300'"
            aria-hidden="true"
          />
          <RouterLink :to="{ name: 'tournament', params: { id: c.tournament.id } }" class="block truncate text-sm font-semibold text-zinc-900 hover:text-pitch-700">
            {{ c.tournament.name }}
          </RouterLink>
          <p class="tabular text-xs text-zinc-500">
            {{ COMPETITION_STATUS[c.tournament.status].label }}
            <template v-if="c.record.played"> · {{ c.record.won }}G {{ c.record.drawn }}E {{ c.record.lost }}P</template>
            <template v-if="c.finalStanding"> · {{ c.finalStanding.position }}º de {{ c.finalStanding.teams }}</template>
          </p>
        </li>
      </ol>
    </li>
  </ol>
</template>
