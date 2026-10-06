<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { CalendarClock } from 'lucide-vue-next'
import type { ID, Match } from '@/types'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { formatDate } from '@/utils/format'
import MatchCard from '@/components/matches/MatchCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{ id: string }>()
// Vista pública: en seguimiento parcial solo los partidos con al menos un equipo seguido (6G).
const { rounds: allRounds, currentRound, partial, trackedTeams } = useTournamentStats(() => props.id, { publicView: true })

/** Filtro opcional por equipo seguido (solo con más de uno). */
const teamFilter = ref<ID | null>(null)
const rounds = computed(() =>
  teamFilter.value
    ? allRounds.value
        .map((r) => ({ ...r, matches: r.matches.filter((m) => m.homeTeamId === teamFilter.value || m.awayTeamId === teamFilter.value) }))
        .filter((r) => r.matches.length)
    : allRounds.value,
)
watch(teamFilter, () => (selected.value = rounds.value.find((r) => r.round === selected.value) ? selected.value : (rounds.value[0]?.round ?? null)))

type Mode = 'round' | 'upcoming' | 'finished'
const mode = ref<Mode>('round')
const modes: { value: Mode; label: string }[] = [
  { value: 'round', label: 'Por jornada' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'finished', label: 'Resultados' },
]

const selected = ref<number | null>(null)
watchEffect(() => {
  if (selected.value === null && rounds.value.length) selected.value = currentRound.value
})
const round = computed(() => rounds.value.find((r) => r.round === selected.value))

const filtered = computed(() => {
  const test = (m: Match) =>
    mode.value === 'upcoming' ? m.status === 'scheduled' || m.status === 'live' || m.status === 'postponed' : m.status === 'finished'
  const groups = rounds.value.map((r) => ({ ...r, matches: r.matches.filter(test) })).filter((r) => r.matches.length)
  return mode.value === 'finished' ? groups.reverse() : groups
})
</script>

<template>
  <section aria-label="Partidos">
    <div v-if="partial && trackedTeams.length > 1" role="radiogroup" aria-label="Filtrar por equipo" class="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      <button
        v-for="o in [{ id: null, name: 'Todos' }, ...trackedTeams.map((t) => ({ id: t.id, name: t.name }))]"
        :key="o.id ?? 'all'"
        type="button"
        role="radio"
        :aria-checked="teamFilter === o.id"
        class="h-8 shrink-0 rounded-full border px-3 text-sm font-semibold transition-colors"
        :class="teamFilter === o.id ? 'border-pitch-900 bg-pitch-900 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'"
        @click="teamFilter = o.id"
      >
        {{ o.name }}
      </button>
    </div>
    <p v-if="partial" class="mb-3 text-xs text-zinc-500">Partidos registrados de los equipos en seguimiento.</p>
    <template v-if="rounds.length">
      <div role="radiogroup" aria-label="Ver partidos" class="mb-4 inline-flex rounded-lg bg-zinc-200/70 p-1">
        <button
          v-for="m in modes"
          :key="m.value"
          type="button"
          role="radio"
          :aria-checked="mode === m.value"
          class="h-8 rounded-md px-3 text-sm font-semibold transition"
          :class="mode === m.value ? 'bg-white shadow-sm' : 'text-zinc-600'"
          @click="mode = m.value"
        >
          {{ m.label }}
        </button>
      </div>

      <template v-if="mode === 'round'">
        <div role="tablist" aria-label="Jornadas" class="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            v-for="r in rounds"
            :key="r.round"
            type="button"
            role="tab"
            :aria-selected="selected === r.round"
            :title="r.label"
            class="h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors"
            :class="selected === r.round ? 'border-pitch-900 bg-pitch-900 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'"
            @click="selected = r.round"
          >
            J{{ r.round }}
            <span v-if="r.round === currentRound" class="ml-1 inline-block size-1.5 rounded-full bg-lime-400 align-middle" aria-label="(actual)" />
          </button>
        </div>

        <div v-if="round" role="tabpanel">
          <p class="mb-3 text-sm text-zinc-500">
            {{ round.label }}<template v-if="round.matches[0]"> · {{ formatDate(round.matches[0].date, 'long') }}</template>
          </p>
          <div v-if="round.matches.length" class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <MatchCard v-for="m in round.matches" :key="m.id" :match="m" />
          </div>
          <EmptyState v-else :icon="CalendarClock" title="Jornada sin partidos programados" compact class="card" />
        </div>
      </template>

      <template v-else>
        <div v-if="filtered.length" class="space-y-6">
          <section v-for="r in filtered" :key="r.round" :aria-label="r.label">
            <h3 class="mb-2 text-sm font-semibold text-zinc-500">{{ r.label }}</h3>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <MatchCard v-for="m in r.matches" :key="m.id" :match="m" />
            </div>
          </section>
        </div>
        <EmptyState v-else :icon="CalendarClock" :title="mode === 'upcoming' ? 'No quedan partidos por jugar' : 'Aún no hay resultados'" class="card" />
      </template>
    </template>
    <EmptyState v-else :icon="CalendarClock" :title="partial ? 'Aún no hay partidos registrados de los equipos en seguimiento' : 'Aún no hay partidos programados'" class="card" />
  </section>
</template>
