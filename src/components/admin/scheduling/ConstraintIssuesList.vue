<script setup lang="ts">
import { AlertTriangle, Ban } from 'lucide-vue-next'
import type { ConstraintIssues } from '@/types'
import { useRoundsStore, useTeamsStore } from '@/stores'
import { formatDate } from '@/utils/format'

/** Partidos y las restricciones que incumplen: errores (bloquean) y preferencias (avisan). */
const props = defineProps<{ issues: ConstraintIssues[]; tournamentId: string; limit?: number; teamNames?: Record<string, string> }>()
const teams = useTeamsStore()
const rounds = useRoundsStore()
const name = (id: string) => props.teamNames?.[id] ?? teams.nameOf(id)
</script>

<template>
  <ul class="divide-y divide-zinc-100 text-sm">
    <li v-for="i in limit ? issues.slice(0, limit) : issues" :key="i.key" class="py-2.5 first:pt-0 last:pb-0">
      <p class="font-semibold text-zinc-900">
        {{ name(i.homeTeamId) }} vs {{ name(i.awayTeamId) }}
      </p>
      <p class="text-xs text-zinc-500">
        <template v-if="i.round">{{ rounds.labelOf(tournamentId, i.round) }} · </template>{{ formatDate(i.date) }} · {{ i.time }}
      </p>
      <p v-for="(v, k) in i.errors" :key="`e${k}`" class="mt-1 flex items-start gap-1.5 text-red-700">
        <Ban class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {{ v.message }}
      </p>
      <p v-for="(v, k) in i.warnings" :key="`w${k}`" class="mt-1 flex items-start gap-1.5 text-amber-800">
        <AlertTriangle class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {{ v.message }}
      </p>
    </li>
  </ul>
  <p v-if="limit && issues.length > limit" class="mt-2 text-xs text-zinc-500">Y {{ issues.length - limit }} partidos más.</p>
</template>
