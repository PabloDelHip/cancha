<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { CalendarPlus, ClipboardEdit, ExternalLink, Goal, Shield, Users } from 'lucide-vue-next'
import type { ID } from '@/types'
import { useTeamsStore } from '@/stores'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { isPendingCapture } from '@/utils/matches'
import { MODALITY_LABELS, TOURNAMENT_STATUS } from '@/utils/labels'
import { formatDateRange } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

/** Tarjeta protagonista del dashboard: estado del torneo y la siguiente acción útil. */
const props = defineProps<{ tournamentId: ID }>()

const teams = useTeamsStore()
const stats = useTournamentStats(() => props.tournamentId)
const t = computed(() => stats.tournament.value!)

const total = computed(() => stats.matches.value.filter((m) => m.status !== 'cancelled').length)
const played = computed(() => stats.playedCount.value)
const percent = computed(() => (total.value ? Math.round((played.value / total.value) * 100) : 0))
const lastRound = computed(() => stats.rounds.value[stats.rounds.value.length - 1]?.round ?? 0)
const top = computed(() => stats.standings.value.slice(0, 4))
const pending = computed(() => stats.matches.value.filter((m) => isPendingCapture(m)))

/** La acción más útil ahora: capturar lo pendiente, o programar si no hay partidos. */
const cta = computed<{ label: string; to: RouteLocationRaw; icon: typeof ClipboardEdit }>(() => {
  const next = pending.value[0] ?? stats.matches.value.find((m) => m.status === 'scheduled')
  if (next) {
    return {
      label: `Capturar jornada ${next.round}`,
      to: { name: 'admin-match-capture', params: { id: next.id } },
      icon: ClipboardEdit,
    }
  }
  return { label: 'Abrir torneo', to: { name: 'admin-tournament', params: { id: props.tournamentId } }, icon: CalendarPlus }
})
</script>

<template>
  <section aria-labelledby="spotlight-title" class="relative overflow-hidden rounded-3xl bg-pitch-950 text-white">
    <svg class="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 300">
      <g fill="none" stroke="#fff" stroke-width="2">
        <rect x="20" y="20" width="760" height="260" />
        <line x1="400" y1="20" x2="400" y2="280" />
        <circle cx="400" cy="150" r="55" />
      </g>
    </svg>

    <div class="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.4fr_1fr]">
      <!-- Estado del torneo -->
      <div class="flex flex-col">
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge v-bind="TOURNAMENT_STATUS[t.status]" :pulse="t.status === 'active'" />
          <span class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-lime-300">{{ MODALITY_LABELS[t.modality] }}</span>
          <span class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-pitch-100">{{ t.category }}</span>
        </div>
        <h2 id="spotlight-title" class="display mt-3 text-3xl leading-none sm:text-4xl">{{ t.name }}</h2>
        <p class="mt-2 text-sm text-pitch-200">{{ formatDateRange(t.startDate, t.endDate) }}</p>

        <div class="mt-6">
          <div class="flex items-baseline justify-between gap-4">
            <p class="text-sm text-pitch-200">
              <template v-if="total">
                Jornada <span class="font-display text-2xl font-bold text-white">{{ stats.currentRound.value }}</span>
                <span class="text-pitch-300"> de {{ lastRound }}</span>
              </template>
              <template v-else>Aún no hay partidos programados</template>
            </p>
            <p v-if="total" class="tabular text-sm text-pitch-200">{{ played }}/{{ total }} partidos</p>
          </div>
          <div
            class="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            :aria-valuenow="played"
            aria-valuemin="0"
            :aria-valuemax="total"
            aria-label="Partidos jugados"
          >
            <div class="h-full rounded-full bg-lime-400 transition-all duration-500" :style="{ width: `${percent}%` }" />
          </div>
        </div>

        <dl class="tabular mt-6 grid grid-cols-3 gap-3">
          <div class="rounded-xl bg-white/5 px-3 py-2.5">
            <dt class="flex items-center gap-1.5 text-xs text-pitch-300"><Shield class="size-3.5" aria-hidden="true" /> Equipos</dt>
            <dd class="font-display text-2xl font-bold">{{ stats.teams.value.length }}</dd>
          </div>
          <div class="rounded-xl bg-white/5 px-3 py-2.5">
            <dt class="flex items-center gap-1.5 text-xs text-pitch-300"><Users class="size-3.5" aria-hidden="true" /> Jugadores</dt>
            <dd class="font-display text-2xl font-bold">{{ stats.playersCount.value }}</dd>
          </div>
          <div class="rounded-xl bg-white/5 px-3 py-2.5">
            <dt class="flex items-center gap-1.5 text-xs text-pitch-300"><Goal class="size-3.5" aria-hidden="true" /> Goles</dt>
            <dd class="font-display text-2xl font-bold">{{ stats.totalGoals.value }}</dd>
          </div>
        </dl>

        <div class="mt-6 flex flex-wrap gap-2">
          <RouterLink :to="cta.to" class="btn btn-accent h-11 px-5">
            <component :is="cta.icon" class="size-4" aria-hidden="true" /> {{ cta.label }}
          </RouterLink>
          <RouterLink :to="{ name: 'admin-tournament', params: { id: t.id } }" class="btn h-11 border border-white/20 text-white hover:bg-white/10">
            Administrar torneo
          </RouterLink>
          <RouterLink :to="{ name: 'tournament', params: { id: t.id } }" class="btn h-11 text-pitch-200 hover:bg-white/10 hover:text-white">
            <ExternalLink class="size-4" aria-hidden="true" /> Página pública
          </RouterLink>
        </div>
      </div>

      <!-- Top 4 -->
      <div class="rounded-2xl bg-white/5 p-4">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-xs font-semibold tracking-wider text-pitch-300 uppercase">{{ stats.partial.value ? 'Seguimiento parcial' : 'Tabla' }}</h3>
          <RouterLink v-if="!stats.partial.value" :to="{ name: 'tournament-standings', params: { id: t.id } }" class="text-xs font-semibold text-lime-300 hover:text-lime-200">
            Completa →
          </RouterLink>
        </div>
        <p v-if="stats.partial.value" class="py-6 text-center text-sm text-pitch-300">
          {{ played }} {{ played === 1 ? 'partido registrado' : 'partidos registrados' }}. Sin tabla general: Cancha sigue a algunos equipos.
        </p>
        <ol v-else-if="top.length" class="space-y-1">
          <li v-for="row in top" :key="row.teamId" class="flex items-center gap-3 rounded-lg px-2 py-2 odd:bg-white/[0.03]">
            <span
              class="grid size-6 place-items-center rounded-md text-xs font-bold"
              :class="row.position === 1 ? 'bg-lime-400 text-pitch-950' : 'bg-white/10 text-pitch-100'"
            >
              {{ row.position }}
            </span>
            <TeamLogo :team="teams.get(row.teamId)" size="sm" />
            <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ teams.get(row.teamId)?.name }}</span>
            <span class="tabular text-xs text-pitch-300">{{ row.played }} PJ</span>
            <span class="tabular w-8 text-right font-display text-xl font-bold">{{ row.points }}</span>
          </li>
        </ol>
        <p v-else class="py-6 text-center text-sm text-pitch-300">Inscribe equipos para ver la tabla.</p>
        <p v-if="pending.length" class="mt-3 rounded-lg bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-200">
          {{ pending.length }} {{ pending.length === 1 ? 'partido espera' : 'partidos esperan' }} resultado
        </p>
      </div>
    </div>
  </section>
</template>
