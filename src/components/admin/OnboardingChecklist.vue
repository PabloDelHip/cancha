<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { useTournamentsStore } from '@/stores'

/**
 * Bienvenida para organizadores sin torneos: explica el recorrido completo. En cuanto existe
 * un torneo, la guía vive dentro de su workspace (TournamentGuide) y este bloque desaparece.
 */
const tournaments = useTournamentsStore()

const steps = [
  { title: 'Crea tu torneo', text: 'Nombre, categoría, fechas y puntuación.' },
  { title: 'Inscribe equipos', text: 'Reutiliza equipos que ya existen en Cancha o crea nuevos.' },
  { title: 'Arma las plantillas', text: 'Busca jugadores existentes o regístralos; no necesitan cuenta.' },
  { title: 'Genera el calendario', text: 'Liga a una o dos vueltas, con jornadas automáticas.' },
  { title: 'Captura resultados', text: 'La tabla, los goleadores y los perfiles se actualizan solos.' },
]
</script>

<template>
  <section v-if="!tournaments.mine.length" aria-labelledby="onboarding-title" class="card overflow-hidden">
    <div class="flex flex-col gap-4 border-b border-zinc-100 bg-pitch-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="eyebrow text-pitch-700">Primeros pasos</p>
        <h2 id="onboarding-title" class="mt-1 text-xl font-bold text-zinc-950">Pon en marcha tu primer torneo</h2>
        <p class="mt-1 text-sm text-zinc-600">Cinco pasos y tu liga tendrá calendario, tabla, goleadores y perfiles públicos.</p>
      </div>
      <RouterLink :to="{ name: 'admin-tournaments', query: { new: '1' } }" class="btn btn-primary shrink-0">
        <Plus class="size-4" aria-hidden="true" /> Crear mi primer torneo
      </RouterLink>
    </div>
    <ol class="grid divide-y divide-zinc-100 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
      <li v-for="(step, i) in steps" :key="step.title" class="flex gap-3 p-4 sm:flex-col sm:gap-2">
        <span
          class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold"
          :class="i === 0 ? 'bg-pitch-900 text-lime-400' : 'bg-zinc-100 text-zinc-500'"
          aria-hidden="true"
        >
          {{ i + 1 }}
        </span>
        <div>
          <p class="text-sm font-semibold text-zinc-900">{{ step.title }}</p>
          <p class="text-xs text-zinc-500">{{ step.text }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>
