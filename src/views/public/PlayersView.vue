<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, Users } from 'lucide-vue-next'
import type { PlayerPosition } from '@/types'
import { useMatchesStore, usePlayersStore, useTeamsStore } from '@/stores'
import { useLeagueData } from '@/composables/useLeagueData'
import { fullName, matchesPlayerSearch } from '@/utils/players'
import { POSITION_LABELS, POSITION_ORDER } from '@/utils/labels'
import { isPlayed } from '@/utils/stats'
import PageHeader from '@/components/common/PageHeader.vue'
import PlayerRow from '@/components/players/PlayerRow.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const { loading, error, reload } = useLeagueData()
const players = usePlayersStore()
const teams = useTeamsStore()
const matches = useMatchesStore()

const query = ref('')
const position = ref<PlayerPosition | ''>('')

const goals = computed(() => {
  const map = new Map<string, number>()
  for (const s of matches.stats) {
    const m = matches.get(s.matchId)
    if (m && isPlayed(m)) map.set(s.playerId, (map.get(s.playerId) ?? 0) + s.goals)
  }
  return map
})

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const results = computed(() => {
  const q = normalize(query.value.trim())
  return players.items
    .filter((p) => !position.value || p.position === position.value)
    .filter((p) => !q || matchesPlayerSearch(p, query.value)) // nombre, apellidos o apodo
    .map((player) => {
      // Puede jugar a la vez en varias competiciones: se listan todos sus equipos actuales.
      const current = players.currentParticipations(player.id)
      const currentTeams = [...new Set(current.map((m) => m.teamId))].map((id) => teams.get(id)).filter((t) => t !== undefined)
      return {
        player,
        // Dorsal y color solo si hay UN contexto actual (no se elige un "equipo principal").
        membership: current.length === 1 ? current[0] : undefined,
        team: currentTeams.length === 1 ? currentTeams[0] : undefined,
        teamsLabel: currentTeams.map((t) => t.name).join(' · ') || 'Sin competiciones en curso',
        goals: goals.value.get(player.id) ?? 0,
      }
    })
    .sort((a, b) => b.goals - a.goals || fullName(a.player).localeCompare(fullName(b.player)))
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title="Jugadores" subtitle="Cada jugador tiene un perfil que se construye con sus partidos." />

    <div class="mb-4 grid gap-2 sm:grid-cols-[1fr_12rem]">
      <label class="relative block">
        <span class="sr-only">Buscar jugador por nombre</span>
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
        <input v-model="query" type="search" class="input h-11 pl-9" placeholder="Buscar por nombre o apodo…" autocomplete="off" />
      </label>
      <label>
        <span class="sr-only">Filtrar por posición</span>
        <select v-model="position" class="input h-11">
          <option value="">Todas las posiciones</option>
          <option v-for="p in POSITION_ORDER" :key="p" :value="p">{{ POSITION_LABELS[p] }}</option>
        </select>
      </label>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />
    <template v-else>
      <p class="mb-2 text-sm text-zinc-500" aria-live="polite">{{ results.length }} jugadores</p>
      <div v-if="results.length" class="card divide-y divide-zinc-100 overflow-hidden">
        <PlayerRow
          v-for="r in results"
          :key="r.player.id"
          :player="r.player"
          :shirt-number="r.membership?.shirtNumber"
          :team="r.team"
          :subtitle="`${POSITION_LABELS[r.player.position]} · ${r.teamsLabel}`"
        >
          <span v-if="r.goals" class="tabular text-right text-sm font-semibold text-zinc-700">
            {{ r.goals }}
            <span class="block text-[10px] font-normal tracking-wide text-zinc-500 uppercase">goles</span>
          </span>
        </PlayerRow>
      </div>
      <EmptyState v-else :icon="Users" title="Sin resultados" description="No encontramos jugadores con ese criterio." class="card" />
    </template>
  </div>
</template>
