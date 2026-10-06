<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ChevronDown } from 'lucide-vue-next'
import type { Player, TeamRef } from '@/types'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'

export interface RankingDetail {
  key: string
  label: string
  to?: RouteLocationRaw
  /** Ej. iconos de tarjeta a la derecha. */
  yellow?: number
  red?: number
}

export interface RankingRow {
  key: string
  name: string
  sub?: string
  to?: RouteLocationRaw
  team?: TeamRef | null
  player?: Pick<Player, 'firstName' | 'lastName' | 'photoUrl'>
  value: string
  /** Detalle desplegable de la fila (p. ej. en qué partidos vio tarjeta). */
  details?: RankingDetail[]
}

/**
 * Top N de un ranking (equipos o jugadores) con "Ver todos" para la lista completa. El primero se
 * destaca; empates de valor comparten posición (1, 2, 2, 4…).
 */
const props = withDefaults(
  defineProps<{
    title: string
    unit: string
    rows: RankingRow[]
    icon?: Component
    /** Color del acento (clases de Tailwind para el icono). */
    tone?: 'green' | 'lime' | 'amber' | 'red' | 'sky' | 'zinc'
    limit?: number
    empty?: string
    /** Texto de la fila de detalle desplegable ("Ver partidos"). */
    detailsLabel?: string
  }>(),
  { icon: undefined, tone: 'green', limit: 5, empty: 'Sin datos todavía', detailsLabel: 'Ver partidos' },
)

const expanded = ref(false)
const open = ref<Set<string>>(new Set())
const shown = computed(() => (expanded.value ? props.rows : props.rows.slice(0, props.limit)))
/** Posición compartida en empates de valor: 1, 2, 2, 4… */
const positions = computed(() => {
  const out: number[] = []
  props.rows.forEach((r, i) => out.push(i > 0 && props.rows[i - 1]!.value === r.value ? out[i - 1]! : i + 1))
  return out
})
const TONES = {
  green: 'bg-pitch-50 text-pitch-700',
  lime: 'bg-lime-100 text-lime-800',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  sky: 'bg-sky-50 text-sky-700',
  zinc: 'bg-zinc-100 text-zinc-700',
} as const

function toggle(key: string) {
  const next = new Set(open.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  open.value = next
}
</script>

<template>
  <section class="card flex flex-col overflow-hidden" :aria-label="title">
    <header class="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
      <span v-if="icon" class="grid size-9 shrink-0 place-items-center rounded-xl" :class="TONES[tone]">
        <component :is="icon" class="size-5" aria-hidden="true" />
      </span>
      <h3 class="min-w-0 flex-1 font-bold text-zinc-950">{{ title }}</h3>
      <span v-if="rows.length" class="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{{ unit }}</span>
    </header>

    <ol v-if="rows.length" class="flex-1 divide-y divide-zinc-100">
      <li v-for="(r, i) in shown" :key="r.key">
        <div class="flex items-center gap-3 px-4 py-2.5" :class="i === 0 && 'bg-gradient-to-r from-lime-50 to-transparent'">
          <span class="tabular w-5 shrink-0 text-center font-display text-lg font-bold" :class="positions[i] === 1 ? 'text-pitch-700' : 'text-zinc-400'">{{ positions[i] }}</span>
          <component :is="r.to ? 'RouterLink' : 'div'" :to="r.to" class="group flex min-w-0 flex-1 items-center gap-3">
            <PlayerAvatar v-if="r.player" :player="r.player" size="sm" decorative />
            <TeamLogo v-else :team="r.team" size="sm" />
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold text-zinc-900 group-hover:text-pitch-700">{{ r.name }}</span>
              <span v-if="r.sub" class="block truncate text-xs text-zinc-500">{{ r.sub }}</span>
            </span>
          </component>
          <span class="tabular shrink-0 font-display text-2xl leading-none font-bold" :class="i === 0 ? 'text-pitch-800' : 'text-zinc-950'">{{ r.value }}</span>
        </div>
        <template v-if="r.details?.length">
          <button
            type="button"
            class="mb-2 ml-12 inline-flex items-center gap-1 text-xs font-semibold text-pitch-700 hover:text-pitch-900"
            :aria-expanded="open.has(r.key)"
            @click="toggle(r.key)"
          >
            {{ detailsLabel }} ({{ r.details.length }})
            <ChevronDown class="size-3.5 transition" :class="open.has(r.key) && 'rotate-180'" aria-hidden="true" />
          </button>
          <ul v-if="open.has(r.key)" class="mx-4 mb-3 space-y-1 rounded-xl bg-zinc-50 p-2 text-xs">
            <li v-for="d in r.details" :key="d.key">
              <component :is="d.to ? 'RouterLink' : 'span'" :to="d.to" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-zinc-700 hover:bg-white hover:text-pitch-700">
                <span class="min-w-0 flex-1 truncate">{{ d.label }}</span>
                <span v-for="n in d.yellow ?? 0" :key="`y${n}`" class="h-3.5 w-2.5 rounded-[2px] bg-amber-400" aria-hidden="true" />
                <span v-for="n in d.red ?? 0" :key="`r${n}`" class="h-3.5 w-2.5 rounded-[2px] bg-red-600" aria-hidden="true" />
                <span class="sr-only">{{ d.yellow ? `${d.yellow} amarilla` : '' }} {{ d.red ? `${d.red} roja` : '' }}</span>
              </component>
            </li>
          </ul>
        </template>
      </li>
    </ol>
    <p v-else class="flex-1 px-4 py-6 text-center text-sm text-zinc-500">{{ empty }}</p>

    <button
      v-if="rows.length > limit"
      type="button"
      class="flex items-center justify-center gap-1 border-t border-zinc-100 py-2.5 text-sm font-semibold text-pitch-700 hover:bg-zinc-50"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Ver menos' : `Ver todos (${rows.length})` }}
      <ChevronDown class="size-4 transition" :class="expanded && 'rotate-180'" aria-hidden="true" />
    </button>
  </section>
</template>
