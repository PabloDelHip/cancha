<script setup lang="ts">
import { computed } from 'vue'
import { Cake } from 'lucide-vue-next'
import type { PlayerProfile, TeamRef } from '@/types'
import { POSITION_LABELS } from '@/utils/labels'
import PlayerAvatar from '../PlayerAvatar.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import ProfileStatusBadge from './ProfileStatusBadge.vue'

/**
 * Identidad del jugador: quién es, qué juega y con qué camiseta(s). Solo datos oficiales.
 *
 * Arquitectura preparada (sin datos inventados): portada, bio, ciudad, pie dominante, altura y
 * posición secundaria no existen todavía en Player; cuando el jugador pueda editarlos (Player
 * Account) entrarán en `#details` y la portada sustituirá al fondo de color. Las acciones
 * sociales (seguir…) irán en `#actions`. Hoy ambos slots están vacíos.
 */
const props = defineProps<{
  player: PlayerProfile['player']
  /** Participaciones en curso (calculadas por el servidor): puede jugar varias a la vez. */
  current: PlayerProfile['currentParticipations']
  /** Equipo más reciente (para el color cuando no juega ninguna competición en curso). */
  lastTeam?: TeamRef | null
}>()

const accent = computed(() => props.current[0]?.team?.colors.primary ?? props.lastTeam?.colors.primary ?? '#226643')
// El dorsal gigante solo tiene sentido si hay UN dorsal actual.
const shirt = computed(() => (props.current.length === 1 ? props.current[0]!.shirtNumber : null))
/** Camisetas actuales sin repetir equipo (mismo equipo en dos torneos = una camiseta). */
const shirts = computed(() => {
  const seen = new Map<string, { team: TeamRef; numbers: number[] }>()
  for (const c of props.current) {
    if (!c.team) continue
    const entry = seen.get(c.team.id) ?? { team: c.team, numbers: [] }
    if (c.shirtNumber && !entry.numbers.includes(c.shirtNumber)) entry.numbers.push(c.shirtNumber)
    seen.set(c.team.id, entry)
  }
  return [...seen.values()]
})
/** Varios equipos a la vez es normal en amateur: el hero muestra hasta 3 y el resto en "Actualmente". */
const MAX_CHIPS = 3
const visible = computed(() => shirts.value.slice(0, MAX_CHIPS))
const hidden = computed(() => shirts.value.length - visible.value.length)
</script>

<template>
  <section class="relative overflow-hidden bg-pitch-950 text-white">
    <div
      class="absolute inset-y-0 right-0 w-2/3 opacity-30"
      :style="{ background: `linear-gradient(110deg, transparent 20%, ${accent} 20.2%)` }"
      aria-hidden="true"
    />
    <span
      v-if="shirt"
      class="pointer-events-none absolute -right-2 -bottom-8 font-display text-[11rem] leading-none font-extrabold text-white/10 sm:right-8 sm:text-[16rem]"
      aria-hidden="true"
    >
      {{ shirt }}
    </span>

    <div class="relative mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12 sm:pb-24">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
        <PlayerAvatar :player="player" size="xl" :color="accent" class="ring-4 ring-lime-400 ring-offset-4 ring-offset-pitch-950" />
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-lime-400">
            {{ POSITION_LABELS[player.position] }}
            <span v-if="player.age !== null" class="inline-flex items-center gap-1 font-medium text-pitch-100">
              <Cake class="size-4" aria-hidden="true" /> {{ player.age }} años
            </span>
            <ProfileStatusBadge />
          </p>
          <h1 class="display mt-2 text-[2.75rem] leading-[0.92] break-words hyphens-auto sm:text-7xl">
            {{ player.firstName }}<br />
            {{ player.lastName }}
          </h1>
          <p v-if="player.nickname" class="mt-2 text-lg font-semibold text-lime-300 sm:text-xl">
            <span class="sr-only">Apodo: </span>“{{ player.nickname }}”
          </p>
          <slot name="details" />
          <!-- Dónde juega, de un vistazo (el detalle con torneo y números está en "Actualmente"). -->
          <ul v-if="shirts.length" class="mt-4 flex flex-wrap gap-2" aria-label="Equipos actuales">
            <li v-for="s in visible" :key="s.team.id">
              <RouterLink
                :to="{ name: 'team', params: { id: s.team.id } }"
                class="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/15"
              >
                <TeamLogo :team="s.team" size="sm" />
                <span class="truncate">{{ s.team.name }}</span>
                <span v-if="s.numbers.length" class="shrink-0 font-display text-base leading-none text-lime-300">#{{ s.numbers.join(' · #') }}</span>
              </RouterLink>
            </li>
            <li v-if="hidden">
              <a href="#actualmente" class="inline-flex h-full items-center rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-pitch-100 ring-1 ring-white/10 hover:bg-white/15">
                +{{ hidden }} {{ hidden === 1 ? 'equipo' : 'equipos' }}
              </a>
            </li>
          </ul>
        </div>
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>
