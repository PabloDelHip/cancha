<script setup lang="ts">
import { computed } from 'vue'
import type { TrackedTeamCard } from '@/types'
import { fullName } from '@/utils/players'
import { formatDate } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Tarjeta de un equipo en seguimiento (6G): solo SUS partidos registrados en este torneo. No es
 * una posición ni una clasificación. Sin partidos no se muestran ceros: "Aún sin partidos registrados".
 */
const props = defineProps<{ card: TrackedTeamCard }>()

const r = computed(() => props.card.record)
const FORM = { W: { l: 'G', c: 'bg-pitch-600 text-white', t: 'Ganado' }, D: { l: 'E', c: 'bg-zinc-300 text-zinc-800', t: 'Empate' }, L: { l: 'P', c: 'bg-red-500 text-white', t: 'Perdido' } } as const
const last = computed(() => props.card.lastMatch)
</script>

<template>
  <article class="card flex flex-col gap-4 p-4">
    <header class="flex items-center gap-3">
      <TeamLogo :team="card.team" size="md" />
      <div class="min-w-0 flex-1">
        <RouterLink :to="{ name: 'team', params: { id: card.team.id } }" class="block font-display text-xl leading-tight font-bold break-words text-zinc-950 hover:text-pitch-700">
          {{ card.team.name }}
        </RouterLink>
        <p class="text-xs text-zinc-500">
          {{ card.team.shortName }} · En seguimiento<template v-if="!card.squadSize"> · Plantilla pendiente</template>
        </p>
      </div>
      <ol v-if="card.form.length" class="flex shrink-0 gap-1" aria-label="Últimos resultados">
        <li v-for="(f, i) in card.form" :key="i" class="grid size-5 place-items-center rounded text-[10px] font-bold" :class="FORM[f].c" :title="FORM[f].t">
          {{ FORM[f].l }}<span class="sr-only">{{ FORM[f].t }}</span>
        </li>
      </ol>
    </header>

    <p v-if="!r.played" class="rounded-xl bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
      Aún sin partidos registrados.
      <template v-if="card.nextMatch"><br />Próximo: {{ formatDate(card.nextMatch.date) }} vs {{ (card.nextMatch.homeTeam?.id === card.team.id ? card.nextMatch.awayTeam : card.nextMatch.homeTeam)?.name }}</template>
    </p>

    <template v-else>
      <dl class="tabular grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-3 text-center">
        <div>
          <dt class="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Partidos</dt>
          <dd class="font-display text-2xl font-bold text-zinc-950">{{ r.played }}</dd>
        </div>
        <div>
          <dt class="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">G · E · P</dt>
          <dd class="font-display text-2xl font-bold text-zinc-950">{{ r.won }}·{{ r.drawn }}·{{ r.lost }}</dd>
        </div>
        <div>
          <dt class="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">GF · GC</dt>
          <dd class="font-display text-2xl font-bold text-zinc-950">{{ r.goalsFor }}·{{ r.goalsAgainst }}</dd>
        </div>
      </dl>

      <div v-if="last" class="text-sm">
        <p class="text-xs font-semibold text-zinc-500">Último resultado · {{ formatDate(last.date) }}</p>
        <RouterLink :to="{ name: 'match', params: { id: last.id } }" class="mt-0.5 flex items-center gap-2 font-semibold text-zinc-900 hover:text-pitch-700">
          <span class="min-w-0 truncate">{{ last.homeTeam?.name }}</span>
          <span class="tabular shrink-0 rounded-md bg-zinc-100 px-1.5">{{ last.homeScore }}–{{ last.awayScore }}</span>
          <span class="min-w-0 truncate">{{ last.awayTeam?.name }}</span>
        </RouterLink>
      </div>

      <dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div class="min-w-0">
          <dt class="text-xs font-semibold text-zinc-500">Goleador</dt>
          <dd v-if="card.topScorer" class="truncate">
            <RouterLink :to="{ name: 'player', params: { id: card.topScorer.player.id } }" class="font-semibold text-zinc-900 hover:text-pitch-700">{{ fullName(card.topScorer.player) }}</RouterLink>
            · <span class="tabular font-bold">{{ card.topScorer.goals }}</span>
          </dd>
          <dd v-else class="text-zinc-400">Sin goles registrados</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs font-semibold text-zinc-500">Asistencias</dt>
          <dd v-if="card.topAssist" class="truncate">
            <RouterLink :to="{ name: 'player', params: { id: card.topAssist.player.id } }" class="font-semibold text-zinc-900 hover:text-pitch-700">{{ fullName(card.topAssist.player) }}</RouterLink>
            · <span class="tabular font-bold">{{ card.topAssist.assists }}</span>
          </dd>
          <dd v-else class="text-zinc-400">Sin asistencias registradas</dd>
        </div>
      </dl>
    </template>
  </article>
</template>
