<script setup lang="ts">
import type { Player, Team } from '@/types'
import { fullName } from '@/utils/players'
import { POSITION_LABELS } from '@/utils/labels'
import PlayerAvatar from './PlayerAvatar.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'

defineProps<{ player: Player; team?: Team; goals: number; assists: number; matches: number; rank?: number }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'player', params: { id: player.id } }"
    class="group relative flex flex-col overflow-hidden rounded-2xl bg-pitch-900 p-4 text-white transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-pitch-950/20"
  >
    <span
      class="pointer-events-none absolute -top-6 -right-4 font-display text-[7rem] leading-none font-extrabold text-white/5"
      aria-hidden="true"
    >
      {{ rank }}
    </span>
    <div class="flex items-center gap-3">
      <PlayerAvatar :player="player" :color="team?.colors.primary" size="lg" decorative class="ring-2 ring-lime-400/80" />
      <div class="min-w-0">
        <p class="truncate font-semibold group-hover:text-lime-300">{{ fullName(player) }}</p>
        <p class="text-xs text-pitch-200">{{ POSITION_LABELS[player.position] }}</p>
        <p class="mt-1 flex items-center gap-1.5 text-xs text-pitch-200">
          <TeamLogo :team="team" size="xs" /> <span class="truncate">{{ team?.name }}</span>
        </p>
      </div>
    </div>
    <dl class="tabular mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
      <div>
        <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">Goles</dt>
        <dd class="font-display text-3xl font-bold text-lime-400">{{ goals }}</dd>
      </div>
      <div>
        <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">Asist.</dt>
        <dd class="font-display text-3xl font-bold">{{ assists }}</dd>
      </div>
      <div>
        <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">PJ</dt>
        <dd class="font-display text-3xl font-bold">{{ matches }}</dd>
      </div>
    </dl>
  </RouterLink>
</template>
