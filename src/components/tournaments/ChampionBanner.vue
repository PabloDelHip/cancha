<script setup lang="ts">
import { Trophy } from 'lucide-vue-next'
import type { TeamRef } from '@/types'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/** Campeón oficial del torneo (ganador de la final o líder de la liga). Mismo diseño en Resumen y Competición. */
defineProps<{ team: TeamRef; detail?: string; label?: string }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'team', params: { id: team.id } }"
    aria-label="Campeón"
    class="flex items-center gap-4 rounded-3xl bg-pitch-950 p-5 text-white transition hover:ring-2 hover:ring-lime-400 sm:p-6"
  >
    <Trophy class="size-8 shrink-0 text-amber-400" aria-hidden="true" />
    <span class="shrink-0 rounded-xl bg-white p-1"><TeamLogo :team="team" size="lg" /></span>
    <span class="min-w-0">
      <span class="block text-xs font-semibold tracking-wider text-pitch-300 uppercase">{{ label ?? 'Torneo finalizado · Campeón' }}</span>
      <span class="display block truncate text-2xl sm:text-3xl">{{ team.name }}</span>
      <span v-if="detail" class="block text-sm text-pitch-200">{{ detail }}</span>
    </span>
  </RouterLink>
</template>
