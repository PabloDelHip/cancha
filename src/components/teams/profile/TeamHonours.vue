<script setup lang="ts">
import { computed } from 'vue'
import { Medal, Trophy } from 'lucide-vue-next'
import type { TeamHonor, TeamProfile } from '@/types'

/**
 * Palmarés del equipo (mismo lenguaje que el del jugador): solo resultados que el servidor verifica
 * con torneos finalizados. Títulos: liga completa con el primer lugar sin empate, o la final ganada
 * (el líder de la fase regular o de un grupo no es campeón). Finales perdidas, aparte.
 */
const props = defineProps<{ honors: TeamHonor[]; runnerUps: TeamProfile['runnerUps']; color: string }>()

const leagues = computed(() => props.honors.filter((h) => h.decidedBy !== 'final').length)
const cups = computed(() => props.honors.filter((h) => h.decidedBy === 'final').length)
</script>

<template>
  <section aria-labelledby="team-honors-title" class="relative overflow-hidden rounded-3xl bg-pitch-950 px-4 py-6 text-white sm:px-8 sm:py-8">
    <div class="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full blur-2xl" :style="{ background: `${color}33` }" aria-hidden="true" />
    <Trophy class="pointer-events-none absolute -right-6 -bottom-8 size-44 text-white/5" aria-hidden="true" />
    <div class="relative">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="team-honors-title" class="display text-3xl">Palmarés</h2>
          <p class="text-xs text-pitch-300">Solo resultados oficiales de torneos finalizados.</p>
        </div>
        <dl v-if="honors.length || runnerUps.length" class="tabular flex gap-5 text-center">
          <div>
            <dd class="font-display text-4xl leading-none font-bold text-lime-300">{{ honors.length }}</dd>
            <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">{{ honors.length === 1 ? 'Título' : 'Títulos' }}</dt>
          </div>
          <div v-if="leagues">
            <dd class="font-display text-4xl leading-none font-bold">{{ leagues }}</dd>
            <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">De liga</dt>
          </div>
          <div v-if="cups">
            <dd class="font-display text-4xl leading-none font-bold">{{ cups }}</dd>
            <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">Por final</dt>
          </div>
          <div v-if="runnerUps.length">
            <dd class="font-display text-4xl leading-none font-bold text-pitch-200">{{ runnerUps.length }}</dd>
            <dt class="text-[10px] font-semibold tracking-wider text-pitch-300 uppercase">{{ runnerUps.length === 1 ? 'Final perdida' : 'Finales perdidas' }}</dt>
          </div>
        </dl>
      </div>

      <ul v-if="honors.length" class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="h in honors" :key="h.tournament.id" class="flex min-w-0 items-center gap-3 rounded-2xl bg-lime-400 p-3 text-pitch-950 ring-1 ring-lime-300">
          <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-pitch-950 text-lime-400"><Trophy class="size-6" aria-hidden="true" /></span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold tracking-wider text-pitch-800 uppercase">{{ h.decidedBy === 'final' ? 'Campeón' : 'Campeón de liga' }} · {{ h.year }}</p>
            <RouterLink :to="{ name: 'tournament', params: { id: h.tournament.id } }" class="display block text-xl leading-tight break-words hover:underline">{{ h.tournament.name }}</RouterLink>
            <p class="text-xs text-pitch-800">{{ h.decidedBy === 'final' ? 'Ganó la final' : 'Primero en la tabla final' }}</p>
          </div>
        </li>
      </ul>
      <div v-else-if="!runnerUps.length" class="mt-4 flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-sm text-pitch-100 ring-1 ring-white/10">
        <Trophy class="mt-0.5 size-5 shrink-0 text-pitch-400" aria-hidden="true" />
        <p>
          Aún sin títulos registrados en Kisokar.
          <span class="block text-xs text-pitch-300">Aparecen al terminar un torneo: primer lugar de una liga completa, o la final ganada.</span>
        </p>
      </div>

      <ul v-if="runnerUps.length" class="mt-4 flex flex-wrap gap-2 text-sm">
        <li v-for="r in runnerUps" :key="r.tournament.id" class="inline-flex items-center gap-2 rounded-full bg-white/5 py-1 pr-3 pl-2 ring-1 ring-white/10">
          <Medal class="size-4 text-pitch-300" aria-hidden="true" />
          <span class="text-pitch-100">Finalista ·</span>
          <RouterLink :to="{ name: 'tournament', params: { id: r.tournament.id } }" class="font-semibold hover:underline">{{ r.tournament.name }}</RouterLink>
          <span class="text-pitch-300">{{ r.year }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
