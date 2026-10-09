<script setup lang="ts">
import { CalendarDays, Shield, Trophy } from 'lucide-vue-next'
import type { Tournament } from '@/types'
import { MODALITY_LABELS, TOURNAMENT_STATUS } from '@/utils/labels'
import { formatDate, plural } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps<{ tournament: Tournament; teamsCount: number; leagueName?: string }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'tournament', params: { id: tournament.id } }"
    class="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-900/5"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="grid size-11 place-items-center rounded-xl bg-pitch-900 text-lime-400">
        <Trophy class="size-5" aria-hidden="true" />
      </div>
      <StatusBadge v-bind="TOURNAMENT_STATUS[tournament.status]" :pulse="tournament.status === 'active'" />
    </div>
    <h3 class="mt-4 text-lg leading-snug font-bold text-zinc-950 group-hover:text-pitch-700">{{ tournament.name }}</h3>
    <p class="mt-1 text-sm text-zinc-500">{{ MODALITY_LABELS[tournament.modality] }} · {{ tournament.category }}</p>
    <p v-if="leagueName" class="mt-1.5 inline-flex max-w-full items-center rounded-full bg-pitch-50 px-2 py-0.5 text-xs font-semibold text-pitch-800"><span class="truncate">{{ leagueName }}</span></p>
    <dl class="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
      <div class="flex items-center gap-1.5">
        <dt class="sr-only">Equipos</dt>
        <Shield class="size-4 text-zinc-400" aria-hidden="true" />
        <dd>{{ plural(teamsCount, 'equipo') }}</dd>
      </div>
      <div class="flex items-center gap-1.5">
        <dt class="sr-only">Fecha de inicio</dt>
        <CalendarDays class="size-4 text-zinc-400" aria-hidden="true" />
        <dd>{{ formatDate(tournament.startDate) }}</dd>
      </div>
    </dl>
  </RouterLink>
</template>
