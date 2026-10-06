<script setup lang="ts">
import type { SquadEntry } from '@/types'
import { POSITION_LABELS } from '@/utils/labels'
import { fullName } from '@/utils/players'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'

/** Plantilla de UN equipo en UNA competición (no es una plantilla global del club). */
defineProps<{ squad: SquadEntry[]; color: string }>()
</script>

<template>
  <ul class="divide-y divide-zinc-100">
    <li v-for="e in squad" :key="e.player.id">
      <RouterLink :to="{ name: 'player', params: { id: e.player.id } }" class="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50">
        <span class="tabular w-6 text-center font-display text-lg font-bold text-zinc-400">{{ e.shirtNumber ?? '–' }}</span>
        <PlayerAvatar :player="e.player" size="sm" :color="color" decorative />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold break-words text-zinc-900">{{ fullName(e.player) }}</span>
          <span class="block truncate text-xs text-zinc-500">
            {{ POSITION_LABELS[e.player.position] }}<template v-if="e.player.age !== null"> · {{ e.player.age }} años</template>
            <template v-if="!e.active"> · ya no está en la plantilla</template>
          </span>
        </span>
        <span class="tabular shrink-0 text-right text-xs text-zinc-500">
          <span class="font-display text-base font-bold text-zinc-900">{{ e.appearances }}</span> PJ
          <template v-if="e.goals"> · <span class="font-display text-base font-bold text-zinc-900">{{ e.goals }}</span> G</template>
        </span>
      </RouterLink>
    </li>
  </ul>
</template>
