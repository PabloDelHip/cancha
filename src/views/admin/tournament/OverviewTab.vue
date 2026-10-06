<script setup lang="ts">
import { computed } from 'vue'
import { CalendarClock, CalendarPlus, ClipboardEdit, Goal, Shield, UserPlus, Users } from 'lucide-vue-next'
import { useRoundsStore } from '@/stores'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { isOpen, isPendingCapture } from '@/utils/matches'
import TournamentGuide from '@/components/admin/workspace/TournamentGuide.vue'
import CompactMatchItem from '@/components/admin/workspace/CompactMatchItem.vue'
import StandingsTable from '@/components/tournaments/StandingsTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{ id: string }>()
const stats = useTournamentStats(() => props.id)
const rounds = useRoundsStore()
const { readOnly } = useTournamentWorkspace(() => props.id)

const params = computed(() => ({ id: props.id }))
const total = computed(() => stats.matches.value.length)
const upcoming = computed(() => stats.matches.value.filter(isOpen).slice(0, 5))
const recent = computed(() => stats.matches.value.filter((m) => m.status === 'finished').reverse().slice(0, 5))
const nextToCapture = computed(() => stats.matches.value.find((m) => isPendingCapture(m)) ?? upcoming.value[0])
const lastRound = computed(() => stats.rounds.value[stats.rounds.value.length - 1]?.round ?? 0)

const kpis = computed(() => [
  { label: 'Equipos', value: stats.teams.value.length, icon: Shield },
  { label: 'Jugadores', value: stats.playersCount.value, icon: Users },
  { label: 'Partidos', value: total.value, icon: CalendarClock },
  { label: 'Jugados', value: stats.playedCount.value, icon: Goal },
  { label: 'Pendientes', value: stats.openCount.value, icon: ClipboardEdit },
])

const quickActions = computed(() => [
  { label: 'Inscribir equipo', icon: Shield, to: { name: 'admin-tournament-teams', params: params.value, query: { new: '1' } } },
  { label: 'Agregar jugador', icon: UserPlus, to: { name: 'admin-tournament-players', params: params.value, query: { new: '1' } } },
  { label: 'Nueva jornada', icon: CalendarPlus, to: { name: 'admin-tournament-schedule', params: params.value, query: { round: 'new' } } },
  { label: 'Programar partido', icon: CalendarClock, to: { name: 'admin-tournament-schedule', params: params.value, query: { new: '1' } } },
  ...(nextToCapture.value
    ? [{ label: 'Capturar resultado', icon: ClipboardEdit, to: { name: 'admin-match-capture', params: { id: nextToCapture.value.id } } }]
    : []),
])
</script>

<template>
  <div class="space-y-6">
    <TournamentGuide :tournament-id="id" />

    <dl class="tabular grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
      <div v-for="k in kpis" :key="k.label" class="card px-3 py-3 sm:px-4">
        <dt class="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
          <component :is="k.icon" class="size-3.5" aria-hidden="true" /> {{ k.label }}
        </dt>
        <dd class="mt-1 font-display text-2xl font-bold text-zinc-950 sm:text-3xl">{{ k.value }}</dd>
      </div>
    </dl>

    <nav v-if="!readOnly" aria-label="Acciones rápidas" class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      <RouterLink v-for="a in quickActions" :key="a.label" :to="a.to" class="btn btn-secondary btn-sm shrink-0">
        <component :is="a.icon" class="size-3.5" aria-hidden="true" /> {{ a.label }}
      </RouterLink>
    </nav>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section aria-labelledby="ov-upcoming">
        <div class="mb-2 flex items-baseline justify-between">
          <h2 id="ov-upcoming" class="text-lg font-bold">
            Próximos partidos
            <span v-if="total && stats.openCount.value" class="text-sm font-normal text-zinc-500">
              · {{ rounds.labelOf(id, stats.currentRound.value) }} de {{ lastRound }}
            </span>
          </h2>
          <RouterLink :to="{ name: 'admin-tournament-schedule', params }" class="link text-sm">Calendario</RouterLink>
        </div>
        <ul v-if="upcoming.length" class="card divide-y divide-zinc-100 overflow-hidden">
          <CompactMatchItem v-for="m in upcoming" :key="m.id" :match="m" :read-only="readOnly" />
        </ul>
        <EmptyState
          v-else
          :icon="CalendarClock"
          :title="total ? 'No quedan partidos por jugar' : 'Aún no hay calendario'"
          compact
          class="card"
        />
      </section>

      <section aria-labelledby="ov-recent">
        <div class="mb-2 flex items-baseline justify-between">
          <h2 id="ov-recent" class="text-lg font-bold">Últimos resultados</h2>
          <RouterLink :to="{ name: 'admin-tournament-schedule', params, query: { view: 'finished' } }" class="link text-sm">Todos</RouterLink>
        </div>
        <ul v-if="recent.length" class="card divide-y divide-zinc-100 overflow-hidden">
          <CompactMatchItem v-for="m in recent" :key="m.id" :match="m" :read-only="readOnly" />
        </ul>
        <EmptyState v-else :icon="Goal" title="Todavía no hay resultados" compact class="card" />
      </section>
    </div>

    <section v-if="stats.teams.value.length && !stats.partial.value" aria-labelledby="ov-table">
      <div class="mb-2 flex items-baseline justify-between">
        <h2 id="ov-table" class="text-lg font-bold">Tabla</h2>
        <RouterLink :to="{ name: 'admin-tournament-standings', params }" class="link text-sm">Completa</RouterLink>
      </div>
      <div class="card overflow-hidden">
        <StandingsTable :standings="stats.standings.value.slice(0, 5)" compact />
      </div>
    </section>
  </div>
</template>
