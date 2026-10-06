<script setup lang="ts">
import { computed } from 'vue'
import { ShieldCheck, Trophy } from 'lucide-vue-next'
import type { FormResult, KeeperLine, PlayerProfile } from '@/types'
import CardIcon from '../CardIcon.vue'
import FormGuide from '@/components/teams/FormGuide.vue'

/**
 * Carrera en Cancha: el resumen inmediato de toda su trayectoria registrada. Todo lo calcula el
 * servidor con partidos oficiales FINISHED; aquí solo se formatea. Nada es editable.
 */
/** `keeper`: perfil de PORTERO; sus cifras principales son las del puesto (goles y asistencias, aparte). */
const props = defineProps<{ career: PlayerProfile['career']; form: FormResult[]; keeper?: KeeperLine | null }>()

const rate = (n: number | null) => (n === null ? '—' : n.toFixed(2))
const reach = computed(() => [
  { label: props.career.competitions === 1 ? 'competición' : 'competiciones', value: props.career.competitions },
  // Equipos con los que ya jugó partidos oficiales (puede estar inscrito en más: ver "Actualmente").
  { label: props.career.teams === 1 ? 'equipo con partidos' : 'equipos con partidos', value: props.career.teams },
])
</script>

<template>
  <section aria-labelledby="career-title" class="card overflow-hidden shadow-sm">
    <h2 id="career-title" class="sr-only">Carrera en Cancha</h2>
    <dl v-if="keeper" class="tabular grid grid-cols-3 divide-x divide-zinc-100">
      <div class="px-2 pt-5 pb-4 text-center">
        <dt class="eyebrow">Partidos</dt>
        <dd class="font-display text-5xl leading-none font-bold sm:text-6xl">{{ keeper.appearances }}</dd>
      </div>
      <div class="px-2 pt-5 pb-4 text-center">
        <dt class="eyebrow">En cero</dt>
        <dd class="font-display text-5xl leading-none font-bold text-pitch-700 sm:text-6xl">{{ keeper.cleanSheets }}</dd>
        <dd v-if="keeper.cleanSheetRate !== null" class="mt-1 text-xs font-semibold text-zinc-500">{{ keeper.cleanSheetRate }}% de sus partidos</dd>
      </div>
      <div class="px-2 pt-5 pb-4 text-center">
        <dt class="eyebrow">Goles recibidos</dt>
        <dd class="font-display text-5xl leading-none font-bold sm:text-6xl">{{ keeper.conceded }}</dd>
        <dd v-if="keeper.concededPerMatch !== null" class="mt-1 text-xs font-semibold text-zinc-500">{{ rate(keeper.concededPerMatch) }} por partido</dd>
      </div>
    </dl>
    <dl v-else class="tabular grid grid-cols-3 divide-x divide-zinc-100">
      <div class="px-2 pt-5 pb-4 text-center">
        <dt class="eyebrow">Partidos</dt>
        <dd class="font-display text-5xl leading-none font-bold sm:text-6xl">{{ career.appearances }}</dd>
      </div>
      <div class="px-2 pt-5 pb-4 text-center">
        <dt class="eyebrow">Goles</dt>
        <dd class="font-display text-5xl leading-none font-bold text-pitch-700 sm:text-6xl">{{ career.goals }}</dd>
      </div>
      <div class="px-2 pt-5 pb-4 text-center">
        <dt class="eyebrow">Asistencias</dt>
        <dd class="font-display text-5xl leading-none font-bold sm:text-6xl">{{ career.assists }}</dd>
      </div>
    </dl>

    <!-- Alcance de la carrera: competiciones, equipos y títulos oficiales -->
    <dl class="tabular flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-zinc-100 bg-zinc-50/70 px-4 py-2.5 text-sm">
      <div v-for="r in reach" :key="r.label" class="flex items-baseline gap-1.5">
        <dd class="font-display text-xl leading-none font-bold text-zinc-900">{{ r.value }}</dd>
        <dt class="text-zinc-600">{{ r.label }}</dt>
      </div>
      <div class="flex items-baseline gap-1.5" :class="career.titles ? 'text-lime-700' : 'text-zinc-500'">
        <Trophy class="size-4 self-center" aria-hidden="true" />
        <dd class="font-display text-xl leading-none font-bold" :class="career.titles ? 'text-lime-700' : 'text-zinc-900'">{{ career.titles }}</dd>
        <dt>{{ career.titles === 1 ? 'título' : 'títulos' }}</dt>
      </div>
    </dl>

    <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
      <dl class="tabular contents">
        <div class="flex items-center gap-1.5"><CardIcon color="yellow" /><dt class="sr-only">Amarillas</dt><dd class="font-semibold text-zinc-900">{{ career.yellowCards }}</dd></div>
        <div class="flex items-center gap-1.5"><CardIcon color="red" /><dt class="sr-only">Rojas</dt><dd class="font-semibold text-zinc-900">{{ career.redCards }}</dd></div>
        <template v-if="keeper">
          <!-- Un portero también puede marcar o asistir: se muestra si lo hizo. -->
          <div v-if="career.goals" class="flex items-center gap-1.5"><dt>Goles</dt><dd class="font-semibold text-zinc-900">{{ career.goals }}</dd></div>
          <div v-if="career.assists" class="flex items-center gap-1.5"><dt>Asistencias</dt><dd class="font-semibold text-zinc-900">{{ career.assists }}</dd></div>
        </template>
        <template v-else>
          <div class="flex items-center gap-1.5"><dt><abbr title="Goles por partido" class="no-underline">G/PJ</abbr></dt><dd class="font-semibold text-zinc-900">{{ rate(career.goalsPerMatch) }}</dd></div>
          <div class="flex items-center gap-1.5"><dt><abbr title="Asistencias por partido" class="no-underline">A/PJ</abbr></dt><dd class="font-semibold text-zinc-900">{{ rate(career.assistsPerMatch) }}</dd></div>
        </template>
      </dl>
      <div v-if="form.length" class="flex items-center gap-2">
        <span>Últimos {{ form.length }}</span>
        <FormGuide :form="form" />
      </div>
    </div>
    <p class="flex items-start justify-center gap-1.5 border-t border-zinc-100 px-4 py-2.5 text-center text-xs text-zinc-500">
      <ShieldCheck class="mt-px size-3.5 shrink-0 text-pitch-600" aria-hidden="true" />
      <span>Carrera en Cancha · datos oficiales, solo partidos finalizados</span>
    </p>
  </section>
</template>
