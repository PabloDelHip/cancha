<script setup lang="ts">
import type { TeamProfile } from '@/types'
import { POSITION_LABELS } from '@/utils/labels'
import { fullName } from '@/utils/players'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'

/**
 * Plantilla GLOBAL actual del equipo: quién pertenece hoy al equipo, independiente de torneos.
 * Las plantillas de cada torneo (con dorsal y partidos) siguen dentro de su competición.
 */
defineProps<{ roster: TeamProfile['currentRoster'] }>()
</script>

<template>
  <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <li v-for="r in roster" :key="r.player.id">
      <RouterLink :to="{ name: 'player', params: { id: r.player.id } }" class="card flex items-center gap-3 px-3 py-2.5 hover:border-pitch-300">
        <PlayerAvatar :player="r.player" size="md" decorative />
        <span class="min-w-0">
          <span class="block truncate font-semibold text-zinc-900">{{ fullName(r.player) }}</span>
          <span class="block text-xs text-zinc-500">{{ POSITION_LABELS[r.player.position] }}</span>
        </span>
      </RouterLink>
    </li>
  </ul>
</template>
