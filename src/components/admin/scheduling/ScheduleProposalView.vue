<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, Ban, CalendarCheck, ChevronDown, MapPin } from 'lucide-vue-next'
import type { ScheduleProposal } from '@/types'
import { useTeamsStore } from '@/stores'
import { formatDate, formatDateRange, plural } from '@/utils/format'

/**
 * 6B: propuesta de calendario antes de guardarla: qué partidos tienen horario (con las preferencias
 * que incumplen), cuáles no caben y por qué, y un resumen del reparto. No guarda nada.
 */
const props = defineProps<{ proposal: ScheduleProposal; roundLabel?: (round: number) => string }>()
const teams = useTeamsStore()
const name = (id: string) => props.proposal.teams[id] ?? teams.nameOf(id)
const label = (round: number) => props.roundLabel?.(round) ?? props.proposal.rounds?.find((r) => r.number === round)?.name ?? `Jornada ${round}`

const byRound = computed(() => {
  const groups = new Map<number, ScheduleProposal['matches']>()
  for (const m of props.proposal.matches) groups.set(m.round, [...(groups.get(m.round) ?? []), m])
  return [...groups].sort(([a], [b]) => a - b)
})
const m = computed(() => props.proposal.metrics)
/** Con muchas jornadas, se muestran las primeras y el resto bajo demanda. */
const showAll = ref(false)
const visible = computed(() => (showAll.value ? byRound.value : byRound.value.slice(0, 4)))
</script>

<template>
  <div class="space-y-3 text-sm">
    <div class="rounded-xl bg-zinc-50 p-3">
      <p class="flex flex-wrap items-center gap-x-2 font-semibold text-zinc-900">
        <CalendarCheck class="size-4 text-pitch-700" aria-hidden="true" />
        {{ plural(m.placed, 'partido con horario', 'partidos con horario') }}
        <template v-if="m.firstDate && m.lastDate"> · {{ formatDateRange(m.firstDate, m.lastDate) }}</template>
      </p>
      <ul class="mt-1 space-y-0.5 text-zinc-600">
        <li v-if="m.unplaced" class="font-medium text-red-700">{{ plural(m.unplaced, 'partido no cabe', 'partidos no caben') }} con las restricciones obligatorias.</li>
        <li v-if="m.withWarnings" class="text-amber-800">{{ plural(m.withWarnings, 'partido incumple', 'partidos incumplen') }} alguna preferencia (se puede guardar).</li>
        <li v-if="m.lateRounds">{{ plural(m.lateRounds, 'jornada se retrasa', 'jornadas se retrasan') }} respecto de su fecha habitual ({{ plural(m.lateDays, 'día') }} en total).</li>
        <li v-if="m.shortestRestHours !== null">Descanso más corto de un equipo: {{ m.shortestRestHours >= 48 ? `${Math.round(m.shortestRestHours / 24)} días` : `${m.shortestRestHours} h` }}.</li>
        <li v-if="!m.unplaced && !m.withWarnings">Cumple todas las restricciones y preferencias.</li>
      </ul>
      <p v-if="m.truncated" class="mt-1 text-amber-800">La búsqueda llegó a su límite: reduce el periodo o las canchas y vuelve a intentarlo.</p>
    </div>

    <section v-if="proposal.unscheduled.length" class="rounded-xl border border-red-200 bg-red-50 p-3" role="alert" aria-labelledby="unsched-title">
      <p id="unsched-title" class="mb-1 font-semibold text-red-900">Sin horario posible</p>
      <p class="mb-2 text-red-800">
        Amplía la fecha final, agrega días o canchas, o revisa las restricciones del torneo y de los equipos. También puedes guardarlos como «por programar» y programarlos después.
      </p>
      <ul class="divide-y divide-red-100">
        <li v-for="u in proposal.unscheduled.slice(0, 6)" :key="u.key" class="py-2 first:pt-0 last:pb-0">
          <p class="font-medium text-zinc-900">{{ label(u.round) }} · {{ name(u.homeTeamId) }} vs {{ name(u.awayTeamId) }}</p>
          <p v-for="(r, i) in u.reasons.slice(0, 2)" :key="i" class="mt-0.5 flex items-start gap-1.5 text-red-700">
            <Ban class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{{ r.message }}<template v-if="r.count > 1"> ({{ plural(r.count, 'horario descartado', 'horarios descartados') }})</template></span>
          </p>
        </li>
      </ul>
      <p v-if="proposal.unscheduled.length > 6" class="mt-2 text-xs text-red-800">Y {{ proposal.unscheduled.length - 6 }} partidos más.</p>
    </section>

    <section v-for="[round, list] in visible" :key="round" :aria-label="label(round)">
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{{ label(round) }}</p>
      <ul class="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
        <li v-for="p in list" :key="p.key" class="px-3 py-2">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3">
            <span class="min-w-0 font-medium text-zinc-900">{{ name(p.homeTeamId) }} vs {{ name(p.awayTeamId) }}</span>
            <span class="tabular text-zinc-600">{{ formatDate(p.date) }} · {{ p.time }}</span>
          </div>
          <p v-if="p.field" class="mt-0.5 flex items-center gap-1 text-xs text-zinc-500"><MapPin class="size-3" aria-hidden="true" /> {{ p.field }}</p>
          <p v-for="(w, i) in p.warnings" :key="i" class="mt-1 flex items-start gap-1.5 text-xs text-amber-800">
            <AlertTriangle class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {{ w.message }}
          </p>
        </li>
      </ul>
    </section>
    <button v-if="byRound.length > visible.length" type="button" class="flex items-center gap-1 text-sm font-medium text-pitch-800 hover:underline" @click="showAll = true">
      <ChevronDown class="size-4" aria-hidden="true" /> Ver las {{ byRound.length }} jornadas
    </button>
  </div>
</template>
