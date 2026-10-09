<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Shuffle, Trash2 } from 'lucide-vue-next'
import type { BracketTieView, SlotSource, TournamentStructure } from '@/types'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import { formatDate } from '@/utils/format'

/**
 * Cuadro eliminatorio tipo Mundial: una columna por ronda y líneas que unen cada par de llaves con
 * la siguiente. Se dibuja COMPLETO desde el inicio (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6…): las rondas
 * futuras muestran su lugar vacío ("Ganador Cuartos 1") hasta que se decide. En móvil se desliza
 * de lado. Cada llave enlaza a su partido; tiempos extra y penales, en su pie. El campeón se
 * muestra aparte (TournamentAwards), una sola vez.
 */
const props = defineProps<{
  phase: Extract<TournamentStructure['phases'][number], { type: 'knockout' }>
  teams: TournamentStructure['teams']
  /** Panel del organizador: en un cuadro armado a mano, agregar y quitar cruces. */
  editable?: boolean
}>()
const emit = defineEmits<{ addTie: [round: number]; removeTie: [round: number, slot: number] }>()

const last = computed(() => props.phase.rounds.length - 1)
/** Llaves que tiene cada ronda (la final, 1). */
const capacity = (round: number) => 2 ** (props.phase.rounds.length - round - 1)
/** Cada ronda con sus lugares fijos: la llave real o un hueco por definir (cuadro a mano). */
const columns = computed(() =>
  props.phase.rounds.map((r) => ({
    ...r,
    slots: Array.from({ length: capacity(r.round) }, (_, slot) => ({ slot, tie: r.ties.find((t) => t.slot === slot) ?? null })),
  })),
)
/**
 * Rondas que arma el organizador: todas en un cuadro a mano; con reacomodo, de la segunda en
 * adelante (la primera sale de la siembra). Sin líneas que las unan: el cruce lo decide él.
 */
const byHand = (round: number) => props.phase.manual || (props.phase.reseed && round > 0)
const lines = computed(() => !props.phase.reseed)
/** Barra vertical que va del centro de la primera llave al de la última de una ronda de `n` llaves. */
const span = (n: number) => ({ top: `${50 / n}%`, bottom: `${50 / n}%` })
const lineColor = (round: number) => (roundDone(round) ? 'border-pitch-400' : 'border-zinc-300')
/** Ronda con todas sus llaves decididas (las líneas del reacomodo se pintan en verde). */
const roundDone = (round: number) => {
  const r = props.phase.rounds[round]
  return !!r && r.ties.length === capacity(round) && r.ties.every((t) => t.winnerTeamId)
}
/** Un cruce a mano se puede quitar mientras ninguno de sus partidos tenga resultado. */
const removable = (t: BracketTieView) => t.legs.every((l) => l.homeScore === null && l.status !== 'live' && l.status !== 'finished')
const seedOf = (teamId: string | null) => (teamId ? (props.phase.seeds.find((s) => s.teamId === teamId)?.seed ?? null) : null)

function sourceLabel(src: SlotSource) {
  if (src.type === 'team') return props.teams[src.teamId]?.name ?? 'Equipo'
  if (src.type === 'seed') return props.phase.seeds.find((s) => s.seed === src.seed)?.origin ?? `Siembra ${src.seed}`
  return `Ganador ${props.phase.rounds[src.round]?.name ?? 'ronda anterior'} ${src.slot + 1}`
}

function side(t: BracketTieView, which: 'home' | 'away') {
  const teamId = which === 'home' ? t.homeTeamId : t.awayTeamId
  const src = which === 'home' ? t.homeSource : t.awaySource
  const pen = t.legs.at(-1)?.penalties
  return {
    key: which,
    team: teamId ? props.teams[teamId] : null,
    label: t.bye && !teamId ? 'Pasa directo' : teamId ? (props.teams[teamId]?.name ?? 'Equipo') : sourceLabel(src),
    seed: seedOf(teamId) ?? (src.type === 'seed' ? src.seed : null),
    goals: t.aggregate ? (which === 'home' ? t.aggregate.home : t.aggregate.away) : null,
    pen: pen ? (which === 'home' ? pen.home : pen.away) : null,
    winner: !!teamId && t.winnerTeamId === teamId,
    loser: !!t.winnerTeamId && !!teamId && t.winnerTeamId !== teamId,
  }
}

function footer(t: BracketTieView): string {
  const l = t.legs.at(-1)
  if (t.decidedBy === 'bye') return 'Avanza sin jugar'
  if (t.decidedBy === 'position') return 'Igualada: pasa por mejor posición'
  if (t.status === 'needs_penalties') return 'Igualada: faltan penales'
  if (t.status === 'decided') return [l?.extraTime && 'Tiempos extra', l?.penalties && `Penales ${l.penalties.home}-${l.penalties.away}`].filter(Boolean).join(' · ') || 'Finalizado'
  if (t.status === 'playing') return 'En juego'
  const next = t.legs.find((x) => x.homeScore === null)
  return next?.date ? `${formatDate(next.date)}${next.time ? ` · ${next.time}` : ''}` : t.status === 'waiting' ? 'Por definir' : 'Por programar'
}
const matchOf = (t: BracketTieView) => t.legs.find((l) => l.matchId)?.matchId ?? null
</script>

<template>
  <p v-if="phase.reseed" class="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
    <strong>Reacomodo:</strong> la primera ronda sale de la tabla; los cruces de las siguientes los arma el organizador al terminar cada ronda.
  </p>
  <p class="mb-2 text-xs text-zinc-500 lg:hidden" aria-hidden="true">Desliza para ver todo el cuadro →</p>
  <div class="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="group" aria-label="Cuadro eliminatorio">
    <div class="flex min-w-max" :class="lines ? 'gap-10' : 'gap-16'">
      <!-- Una columna por ronda -->
      <section v-for="c in columns" :key="c.round" class="flex w-56 flex-col sm:w-60" :aria-label="c.name">
        <h3 class="mb-3 rounded-full bg-pitch-950 px-3 py-1 text-center text-[11px] font-bold tracking-wider text-lime-300 uppercase">{{ c.name }}</h3>
        <ol class="relative flex flex-1 flex-col" :style="{ minHeight: `${capacity(0) * 7.25}rem` }">
          <!--
            Reacomodo: las llaves de la ronda se juntan en una barra (izquierda), de su centro sale UNA
            línea al nodo y sigue hasta otra barra (derecha) que se divide hacia los cruces de la siguiente.
          -->
          <template v-if="!lines && c.round < last">
            <span class="absolute -right-4 border-r-2" :class="lineColor(c.round)" :style="span(c.slots.length)" aria-hidden="true" />
            <span class="absolute top-1/2 -right-12 w-8 border-t-2" :class="lineColor(c.round)" aria-hidden="true" />
            <span class="absolute -right-12 border-r-2" :class="lineColor(c.round)" :style="span(capacity(c.round + 1))" aria-hidden="true" />
            <span
              class="absolute top-1/2 -right-8 z-20 grid size-6 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-white"
              :class="roundDone(c.round) ? 'border-pitch-500 text-pitch-700' : 'border-zinc-300 text-zinc-400'"
              :title="`Reacomodo tras ${c.name}`"
              aria-hidden="true"
            >
              <Shuffle class="size-3" />
            </span>
          </template>
          <li v-for="s in c.slots" :key="s.slot" class="relative flex flex-1 items-center py-2">
            <!-- Líneas: entrada desde la ronda anterior y salida hacia la siguiente (el par se une con la vertical) -->
            <template v-if="lines">
            <span v-if="c.round > 0" class="absolute top-1/2 -left-5 w-5 border-t-2" :class="s.tie?.homeTeamId || s.tie?.awayTeamId ? 'border-pitch-400' : 'border-zinc-300'" aria-hidden="true" />
            <template v-if="c.round < last">
              <span class="absolute top-1/2 -right-5 w-5 border-t-2" :class="s.tie?.winnerTeamId ? 'border-pitch-400' : 'border-zinc-300'" aria-hidden="true" />
              <span
                class="absolute -right-5 h-1/2 border-r-2"
                :class="[s.slot % 2 === 0 ? 'top-1/2' : 'top-0', s.tie?.winnerTeamId ? 'border-pitch-400' : 'border-zinc-300']"
                aria-hidden="true"
              />
            </template>
            </template>
            <template v-else>
              <span v-if="c.round > 0" class="absolute top-1/2 -left-4 w-4 border-t-2" :class="s.tie ? 'border-pitch-400' : 'border-zinc-300'" aria-hidden="true" />
              <span v-if="c.round < last" class="absolute top-1/2 -right-4 w-4 border-t-2" :class="lineColor(c.round)" aria-hidden="true" />
            </template>

            <!-- Llave -->
            <article v-if="s.tie" class="relative z-10 w-full overflow-hidden rounded-xl border bg-white shadow-sm" :class="s.tie.status === 'needs_penalties' ? 'border-amber-300' : 'border-zinc-200'">
              <div
                v-for="x in [side(s.tie, 'home'), side(s.tie, 'away')]"
                :key="x.key"
                class="flex h-9 items-center gap-2 border-b border-zinc-100 pr-2.5 last:border-0"
                :class="x.winner ? 'bg-gradient-to-r from-lime-100 to-white' : ''"
              >
                <span class="tabular grid h-full w-6 shrink-0 place-items-center text-[10px] font-bold" :class="x.winner ? 'bg-lime-400 text-pitch-950' : 'bg-zinc-100 text-zinc-500'">{{ x.seed ?? '' }}</span>
                <TeamLogo v-if="x.team" :team="x.team" size="xs" />
                <span v-else class="size-5 shrink-0 rounded-full border border-dashed border-zinc-300" aria-hidden="true" />
                <RouterLink v-if="x.team" :to="{ name: 'team', params: { id: x.team.id } }" class="min-w-0 flex-1 truncate text-[13px] hover:text-pitch-700" :class="x.winner ? 'font-bold text-zinc-950' : x.loser ? 'text-zinc-400' : 'font-medium text-zinc-800'">
                  {{ x.label }}
                </RouterLink>
                <span v-else class="min-w-0 flex-1 truncate text-xs text-zinc-400 italic">{{ x.label }}</span>
                <span v-if="x.pen !== null" class="tabular text-[10px] font-semibold text-zinc-400">({{ x.pen }})</span>
                <span v-if="x.goals !== null" class="tabular w-5 text-right font-display text-lg font-bold" :class="x.loser ? 'text-zinc-400' : 'text-zinc-950'">{{ x.goals }}</span>
              </div>
              <div class="flex items-center justify-between gap-2 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
                <span class="truncate" :class="s.tie.status === 'needs_penalties' && 'text-amber-700'">
                  {{ footer(s.tie) }}<template v-if="phase.legs === 2 && s.tie.aggregate"> · global</template>
                </span>
                <button
                  v-if="editable && byHand(c.round) && removable(s.tie)"
                  type="button"
                  class="inline-flex shrink-0 items-center gap-0.5 text-red-700 hover:text-red-800"
                  :aria-label="`Quitar cruce de ${c.name}`"
                  @click="emit('removeTie', c.round, s.tie.slot)"
                >
                  <Trash2 class="size-3" aria-hidden="true" /> Quitar
                </button>
                <RouterLink v-else-if="matchOf(s.tie)" :to="{ name: 'match', params: { id: matchOf(s.tie)! } }" class="shrink-0 text-pitch-700 hover:text-pitch-900">
                  Ver partido →
                </RouterLink>
              </div>
            </article>

            <!-- Lugar vacío (cuadro armado a mano, aún sin cruce) -->
            <button
              v-else-if="editable && byHand(c.round)"
              type="button"
              class="relative z-10 flex h-[4.75rem] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 bg-white text-sm font-semibold text-zinc-500 hover:border-pitch-400 hover:text-pitch-700"
              @click="emit('addTie', c.round)"
            >
              <Plus class="size-4" aria-hidden="true" /> Agregar cruce
            </button>
            <div v-else class="relative z-10 flex h-[4.75rem] w-full flex-col justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-white/70 px-3 text-xs text-zinc-400 italic">
              <span>Por definir</span>
              <span>Por definir</span>
            </div>
          </li>
        </ol>
      </section>

    </div>
  </div>
</template>
