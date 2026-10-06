<script setup lang="ts">
import { computed } from 'vue'
import { Medal, Target, Trophy } from 'lucide-vue-next'
import type { PlayerHonor } from '@/types'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Palmarés: SOLO resultados oficiales de torneos finalizados que el servidor puede verificar.
 * - Campeón: su equipo ganó el torneo según el formato (liga completa sin empate arriba, o la final)
 *   y él jugó al menos un partido oficial con ese equipo en ese torneo.
 * - Goleador: máximo de goles oficiales del torneo (compartido si hay empate).
 * - Finalista: su equipo perdió la final.
 */
const props = defineProps<{ honors: PlayerHonor[] }>()

/** Logros PROPIOS del jugador (hoy: goleador del torneo). */
const individual = computed(() => props.honors.filter((h) => h.type === 'top_scorer'))
/** Logros con su equipo: títulos y finales. */
const titles = computed(() => props.honors.filter((h) => h.type === 'champion'))
const finals = computed(() => props.honors.filter((h) => h.type === 'runner_up'))
const total = computed(() => individual.value.length + titles.value.length)

const TITLE = {
  champion: { icon: Trophy, label: 'Campeón' },
  top_scorer: { icon: Target, label: 'Goleador' },
  runner_up: { icon: Medal, label: 'Finalista' },
} as const

function detail(h: PlayerHonor) {
  if (h.type === 'top_scorer') return `${h.goals} ${h.goals === 1 ? 'gol' : 'goles'}${h.shared ? ' · compartido' : ''}`
  if (h.type === 'champion') return h.decidedBy === 'final' ? 'Ganó la final' : 'Primero en la tabla final'
  return 'Perdió la final'
}
</script>

<template>
  <section aria-labelledby="honors-title" class="relative overflow-hidden rounded-3xl bg-pitch-950 px-4 py-6 text-white sm:px-8 sm:py-8">
    <div class="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-lime-400/10 blur-2xl" aria-hidden="true" />
    <div class="relative">
      <div class="flex items-baseline justify-between gap-3">
        <h2 id="honors-title" class="display text-3xl">Palmarés</h2>
        <p v-if="total" class="text-sm text-pitch-200">{{ total }} {{ total === 1 ? 'distinción' : 'distinciones' }}</p>
      </div>

      <div class="mt-5 grid gap-6 lg:grid-cols-2">
        <!-- Individual -->
        <section aria-labelledby="honors-individual">
          <h3 id="honors-individual" class="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-lime-300 uppercase">
            <Target class="size-4" aria-hidden="true" /> Palmarés individual
            <span v-if="individual.length" class="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px]">{{ individual.length }}</span>
          </h3>
          <ul v-if="individual.length" class="grid gap-3">
            <li v-for="h in individual" :key="`ind-${h.tournament.id}`" class="flex min-w-0 items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-lime-400/15 text-lime-300"><Target class="size-6" aria-hidden="true" /></span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold tracking-wider text-lime-300 uppercase">{{ TITLE[h.type].label }} · {{ h.year }}</p>
                <RouterLink :to="{ name: 'tournament', params: { id: h.tournament.id } }" class="display block text-xl leading-tight break-words hover:underline">{{ h.tournament.name }}</RouterLink>
                <p class="text-xs text-pitch-200">{{ detail(h) }}</p>
              </div>
            </li>
          </ul>
          <p v-else class="rounded-2xl bg-white/5 p-4 text-sm text-pitch-200 ring-1 ring-white/10">
            Sin logros individuales todavía.
            <span class="block text-xs text-pitch-300">Por ejemplo, terminar un torneo como su máximo goleador.</span>
          </p>
        </section>

        <!-- Con sus equipos -->
        <section aria-labelledby="honors-team">
          <h3 id="honors-team" class="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-lime-300 uppercase">
            <Trophy class="size-4" aria-hidden="true" /> Con sus equipos
            <span v-if="titles.length" class="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px]">{{ titles.length }}</span>
          </h3>
          <ul v-if="titles.length" class="grid gap-3">
            <li v-for="h in titles" :key="`team-${h.tournament.id}-${h.team?.id}`" class="flex min-w-0 items-center gap-3 rounded-2xl bg-lime-400 p-3 text-pitch-950 ring-1 ring-lime-300">
              <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-pitch-950 text-lime-400"><Trophy class="size-6" aria-hidden="true" /></span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold tracking-wider text-pitch-800 uppercase">{{ TITLE[h.type].label }} · {{ h.year }}</p>
                <RouterLink :to="{ name: 'tournament', params: { id: h.tournament.id } }" class="display block text-xl leading-tight break-words hover:underline">{{ h.tournament.name }}</RouterLink>
                <p class="flex min-w-0 items-center gap-1.5 text-xs text-pitch-800">
                  <TeamLogo v-if="h.team" :team="h.team" size="xs" class="shrink-0" />
                  <span class="min-w-0 truncate">{{ h.team ? `${h.team.name} · ` : '' }}{{ detail(h) }}</span>
                </p>
              </div>
            </li>
          </ul>
          <p v-else-if="!finals.length" class="rounded-2xl bg-white/5 p-4 text-sm text-pitch-200 ring-1 ring-white/10">
            Sin títulos con sus equipos todavía.
            <span class="block text-xs text-pitch-300">Cuentan al terminar un torneo: campeón o finalista.</span>
          </p>
          <ul v-if="finals.length" class="mt-3 flex flex-wrap gap-2 text-sm">
            <li v-for="h in finals" :key="`fin-${h.tournament.id}-${h.team?.id}`" class="inline-flex items-center gap-2 rounded-full bg-white/5 py-1 pr-3 pl-2 ring-1 ring-white/10">
              <Medal class="size-4 text-pitch-300" aria-hidden="true" />
              <span class="text-pitch-100">Finalista ·</span>
              <RouterLink :to="{ name: 'tournament', params: { id: h.tournament.id } }" class="font-semibold hover:underline">{{ h.tournament.name }}</RouterLink>
              <span class="text-pitch-300">{{ h.year }}</span>
            </li>
          </ul>
        </section>
      </div>
      <p class="mt-5 text-xs text-pitch-300">Solo resultados oficiales de torneos finalizados. Un título con su equipo cuenta si jugó al menos un partido con el equipo campeón.</p>
    </div>
  </section>
</template>
