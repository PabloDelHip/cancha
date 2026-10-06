<script setup lang="ts">
import { ArrowLeft, ExternalLink, UserCheck, UserPlus, Users } from 'lucide-vue-next'
import type { ID, Player, PlayerCandidate } from '@/types'
import { displayName } from '@/utils/players'
import { POSITION_LABELS } from '@/utils/labels'
import { plural } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Posibles duplicados al registrar un jugador (los encuentra el servidor). Quien registra decide:
 * elegir uno existente (y seguir con ese Player) o confirmar que ninguno es la persona. Nunca se
 * asume que son la misma: puede haber homónimos.
 */
defineProps<{
  candidates: PlayerCandidate[]
  /** Jugadores que ya están donde se quiere agregar (no se pueden elegir de nuevo). */
  takenIds?: Set<ID>
  takenLabel?: string
  busy?: boolean
}>()
const emit = defineEmits<{ choose: [player: Pick<Player, 'id' | 'firstName' | 'lastName'>]; createAnyway: []; back: [] }>()
</script>

<template>
  <section aria-labelledby="dup-title" class="space-y-4">
    <div class="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200" role="status">
      <Users class="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
      <div>
        <p id="dup-title" class="font-semibold">Encontramos jugadores que podrían ser la misma persona.</p>
        <p class="mt-0.5 text-amber-900">Revisa si alguno corresponde al jugador que intentas registrar. Puede haber personas con el mismo nombre.</p>
      </div>
    </div>

    <ul class="space-y-2" aria-label="Posibles coincidencias">
      <li v-for="c in candidates" :key="c.player.id" class="rounded-xl border border-zinc-200 p-3">
        <div class="flex items-start gap-3">
          <PlayerAvatar :player="c.player" size="md" decorative />
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span class="font-semibold break-words text-zinc-900">{{ displayName(c.player) }}</span>
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                :class="c.match === 'exact' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'"
              >
                {{ c.match === 'exact' ? 'Mismo nombre' : 'Nombre parecido' }}
              </span>
            </p>
            <p class="mt-0.5 text-xs text-zinc-500">
              {{ POSITION_LABELS[c.player.position] }}<template v-if="c.player.age !== null"> · {{ c.player.age }} años</template>
              · {{ c.appearances ? plural(c.appearances, 'partido jugado', 'partidos jugados') : 'Sin partidos registrados' }}
            </p>
            <ul v-if="c.teams.length" class="mt-2 flex flex-wrap gap-1.5" aria-label="Equipos">
              <li v-for="t in c.teams" :key="t.id" class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-zinc-100 py-0.5 pr-2 pl-0.5 text-xs font-medium text-zinc-700">
                <TeamLogo :team="t" size="xs" /><span class="truncate">{{ t.name }}</span>
              </li>
            </ul>
            <p v-if="c.tournaments.length" class="mt-1.5 text-xs text-zinc-500">
              <span class="font-medium text-zinc-600">Torneos:</span> {{ c.tournaments.map((t) => t.name).join(' · ') }}
            </p>
            <p v-if="!c.teams.length && !c.tournaments.length" class="mt-1.5 text-xs text-zinc-400">Sin equipos ni torneos todavía.</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-end gap-2">
          <RouterLink :to="{ name: 'player', params: { id: c.player.id } }" target="_blank" class="btn btn-ghost btn-sm text-zinc-600">
            <ExternalLink class="size-3.5" aria-hidden="true" /> Ver perfil
          </RouterLink>
          <span v-if="takenIds?.has(c.player.id)" class="text-xs font-semibold text-zinc-500">{{ takenLabel ?? 'Ya está agregado' }}</span>
          <AppButton v-else variant="secondary" size="sm" :disabled="busy" @click="emit('choose', c.player)">
            <UserCheck class="size-4" aria-hidden="true" /> Es este jugador
          </AppButton>
        </div>
      </li>
    </ul>

    <div class="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <AppButton variant="ghost" size="sm" :disabled="busy" @click="emit('back')"><ArrowLeft class="size-4" aria-hidden="true" /> Volver al formulario</AppButton>
      <AppButton :loading="busy" @click="emit('createAnyway')"><UserPlus class="size-4" aria-hidden="true" /> Ninguno es el jugador que quiero registrar</AppButton>
    </div>
  </section>
</template>
