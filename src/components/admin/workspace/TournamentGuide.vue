<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ArrowRight, Check, Trophy } from 'lucide-vue-next'
import type { ID } from '@/types'
import { usePlayersStore, useRoundsStore } from '@/stores'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentLifecycle } from '@/composables/useTournamentLifecycle'
import { isPendingCapture } from '@/utils/matches'
import { formatMatchDay, plural } from '@/utils/format'

/**
 * Guía del organizador: deduce de los datos reales en qué paso está el torneo y ofrece la
 * siguiente acción. No guarda nada: avanza sola a medida que el torneo se completa.
 */
const props = defineProps<{ tournamentId: ID }>()

const players = usePlayersStore()
const rounds = useRoundsStore()
const stats = useTournamentStats(() => props.tournamentId)
const { start, askFinish } = useTournamentLifecycle()

const t = computed(() => stats.tournament.value!)
const teams = computed(() => stats.teams.value)
const emptyTeams = computed(() => teams.value.filter((team) => !players.rosterOf(team.id, props.tournamentId).length))

const total = computed(() => stats.matches.value.length)
const pendingCapture = computed(() => stats.matches.value.filter((m) => isPendingCapture(m)))
const nextOpen = computed(() => stats.matches.value.find((m) => m.status === 'scheduled' || m.status === 'live'))

type Action = { label: string; to?: RouteLocationRaw; run?: () => void }
interface Step {
  key: string
  title: string
  done: boolean
  message: string
  action?: Action
  secondary?: Action
}

const p = computed(() => ({ id: props.tournamentId }))
const steps = computed<Step[]>(() => [
  {
    key: 'teams',
    title: 'Equipos',
    done: teams.value.length >= 2,
    message: teams.value.length
      ? `Tienes ${plural(teams.value.length, 'equipo inscrito', 'equipos inscritos')}. Inscribe al menos dos para armar el calendario.`
      : 'Aún no tienes equipos inscritos. Busca equipos que ya existen en Cancha o crea uno nuevo.',
    action: { label: teams.value.length ? 'Inscribir otro equipo' : 'Inscribir primer equipo', to: { name: 'admin-tournament-teams', params: p.value, query: { new: '1' } } },
  },
  {
    key: 'players',
    title: 'Plantillas',
    done: teams.value.length >= 2 && emptyTeams.value.length === 0,
    message: `${plural(emptyTeams.value.length, 'equipo')} todavía sin jugadores. Registra o reutiliza jugadores y asígnales dorsal.`,
    action: emptyTeams.value[0]
      ? { label: `Armar plantilla de ${emptyTeams.value[0].name}`, to: { name: 'admin-tournament-team', params: { ...p.value, teamId: emptyTeams.value[0].id } } }
      : undefined,
    secondary: total.value ? undefined : { label: 'Generar calendario primero', to: { name: 'admin-tournament-schedule', params: p.value, query: { generate: '1' } } },
  },
  {
    key: 'schedule',
    title: 'Calendario',
    done: total.value > 0,
    message: `Tienes ${plural(teams.value.length, 'equipo')}. Ahora puedes generar el calendario: Cancha arma las jornadas por ti.`,
    action: { label: 'Generar calendario', to: { name: 'admin-tournament-schedule', params: p.value, query: { generate: '1' } } },
  },
  {
    key: 'start',
    title: 'Inicio',
    done: t.value.status !== 'draft',
    message: `Todo listo: ${plural(teams.value.length, 'equipo')} y ${plural(total.value, 'partido')}. Inicia el torneo para que aparezca "En curso".`,
    action: { label: 'Iniciar torneo', run: () => start(props.tournamentId) },
  },
  {
    key: 'results',
    title: 'Resultados',
    done: total.value > 0 && stats.openCount.value === 0,
    message: pendingCapture.value.length
      ? `${plural(pendingCapture.value.length, 'partido espera', 'partidos esperan')} resultado. Al capturarlo, la tabla y los goleadores se actualizan solos.`
      : nextOpen.value
        ? `${stats.playedCount.value} de ${total.value} partidos jugados. Siguiente: ${rounds.labelOf(props.tournamentId, nextOpen.value.round)}, ${formatMatchDay(nextOpen.value.date)}.`
        : `Quedan partidos pospuestos por reprogramar.`,
    action: pendingCapture.value[0]
      ? { label: 'Capturar resultado', to: { name: 'admin-match-capture', params: { id: pendingCapture.value[0].id } } }
      : { label: 'Ver calendario', to: { name: 'admin-tournament-schedule', params: p.value } },
  },
  {
    key: 'finish',
    title: 'Cierre',
    done: t.value.status === 'finished',
    message: 'Todos los partidos se jugaron. Cuando quieras, finaliza el torneo: quedará como historial.',
    action: { label: 'Finalizar torneo', run: () => askFinish(props.tournamentId) },
  },
])

const current = computed(() => steps.value.find((s) => !s.done))
const champion = computed(() => (stats.playedCount.value ? stats.teams.value.find((team) => team.id === stats.standings.value[0]?.teamId) : undefined))
</script>

<template>
  <section aria-labelledby="guide-title" class="card overflow-hidden">
    <ol class="relative flex overflow-x-auto border-b border-zinc-100 bg-zinc-50/70 px-2 [scrollbar-width:none]" aria-label="Pasos del torneo">
      <li
        v-for="(step, i) in steps"
        :key="step.key"
        class="flex shrink-0 items-center gap-2 px-3 py-3 text-xs font-semibold"
        :class="step.done ? 'text-pitch-700' : step === current ? 'text-zinc-950' : 'text-zinc-400'"
        :aria-current="step === current ? 'step' : undefined"
      >
        <span
          class="grid size-6 place-items-center rounded-full text-[11px]"
          :class="step.done ? 'bg-pitch-600 text-white' : step === current ? 'bg-pitch-900 text-lime-400' : 'bg-zinc-200 text-zinc-500'"
        >
          <Check v-if="step.done" class="size-3.5" aria-hidden="true" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        {{ step.title }}
        <span class="sr-only">{{ step.done ? '(completado)' : '' }}</span>
      </li>
    </ol>

    <div v-if="current" class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="eyebrow text-pitch-700">Siguiente paso</p>
        <h2 id="guide-title" class="mt-1 text-lg font-bold text-zinc-950">{{ current.title }}</h2>
        <p class="mt-1 max-w-xl text-sm text-zinc-600">{{ current.message }}</p>
      </div>
      <div class="flex shrink-0 flex-wrap gap-2">
        <template v-for="a in [current.secondary, current.action].filter(Boolean) as Action[]" :key="a.label">
          <RouterLink v-if="a.to" :to="a.to" class="btn" :class="a === current.action ? 'btn-primary' : 'btn-ghost text-pitch-700'">
            {{ a.label }} <ArrowRight v-if="a === current.action" class="size-4" aria-hidden="true" />
          </RouterLink>
          <button v-else type="button" class="btn" :class="a.label === 'Finalizar torneo' ? 'btn-secondary' : 'btn-primary'" @click="a.run?.()">
            {{ a.label }}
          </button>
        </template>
      </div>
    </div>
    <div v-else class="flex items-center gap-3 p-5">
      <Trophy class="size-6 shrink-0 text-amber-500" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <h2 id="guide-title" class="font-bold text-zinc-950">Torneo finalizado</h2>
        <p class="text-sm text-zinc-600">
          <template v-if="champion">Campeón: <strong>{{ champion.name }}</strong>. </template>
          La tabla final y todos los resultados quedan como historial.
        </p>
      </div>
      <RouterLink :to="{ name: 'admin-tournament-standings', params: p }" class="btn btn-secondary shrink-0">Tabla final</RouterLink>
    </div>
  </section>
</template>
