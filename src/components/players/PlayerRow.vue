<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Player, Team } from '@/types'
import { displayName } from '@/utils/players'
import { POSITION_LABELS } from '@/utils/labels'
import PlayerAvatar from './PlayerAvatar.vue'

defineProps<{ player: Player; shirtNumber?: number | null; team?: Team; subtitle?: string }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'player', params: { id: player.id } }"
    class="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
  >
    <span class="tabular w-6 text-center font-display text-lg font-bold text-zinc-400">
      {{ shirtNumber ?? '–' }}
    </span>
    <PlayerAvatar :player="player" :color="team?.colors.primary" decorative />
    <span class="min-w-0 flex-1">
      <span class="block truncate font-semibold text-zinc-900 group-hover:text-pitch-700">{{ displayName(player) }}</span>
      <span class="block truncate text-xs text-zinc-500">{{ subtitle ?? POSITION_LABELS[player.position] }}</span>
    </span>
    <slot />
    <ChevronRight class="size-4 shrink-0 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
  </RouterLink>
</template>
