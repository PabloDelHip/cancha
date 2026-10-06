<script setup lang="ts">
import type { PlayerProfile } from '@/types'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import { stintPeriod } from './profileLabels'

defineProps<{ history: PlayerProfile['history'] }>()
</script>

<template>
  <ol class="space-y-5">
    <li v-for="y in history" :key="y.year">
      <h3 class="font-display text-lg font-bold text-zinc-400">{{ y.year }}</h3>
      <ol class="relative mt-2 ml-3 border-l-2 border-zinc-200">
        <li v-for="s in y.participations" :key="`${s.tournament.id}-${s.team?.id}`" class="relative pb-4 pl-5 last:pb-0">
          <span
            class="absolute top-2.5 -left-[7px] size-3 rounded-full ring-4 ring-canvas"
            :class="s.current ? 'bg-lime-500' : 'bg-zinc-300'"
            aria-hidden="true"
          />
          <div class="flex items-center gap-2.5">
            <TeamLogo :team="s.team" size="sm" />
            <div class="min-w-0">
              <p class="flex items-baseline gap-1.5 text-sm">
                <RouterLink v-if="s.team" :to="{ name: 'team', params: { id: s.team.id } }" class="truncate font-semibold text-zinc-900 hover:text-pitch-700">
                  {{ s.team.name }}
                </RouterLink>
                <span v-if="s.shirtNumber" class="shrink-0 text-zinc-500">#{{ s.shirtNumber }}</span>
                <span v-if="s.current" class="shrink-0 rounded-full bg-lime-100 px-1.5 text-[10px] font-semibold text-lime-800 uppercase">Actual</span>
              </p>
              <RouterLink :to="{ name: 'tournament', params: { id: s.tournament.id } }" class="block truncate text-xs text-zinc-600 hover:text-pitch-700">
                {{ s.tournament.name }}
              </RouterLink>
              <p class="text-xs text-zinc-400">{{ stintPeriod(s.startDate, s.endDate) }}</p>
            </div>
          </div>
        </li>
      </ol>
    </li>
  </ol>
</template>
