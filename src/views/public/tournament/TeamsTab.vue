<script setup lang="ts">
import { computed } from 'vue'
import { Shield } from 'lucide-vue-next'
import { usePlayersStore } from '@/stores'
import { useTournamentStats } from '@/composables/useTournamentStats'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{ id: string }>()
const { teams, standings } = useTournamentStats(() => props.id)
const players = usePlayersStore()
const standingOf = computed(() => new Map(standings.value.map((s) => [s.teamId, s])))
</script>

<template>

  <section aria-label="Equipos">
    <ul v-if="teams.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="team in teams" :key="team.id">
        <RouterLink :to="{ name: 'team', params: { id: team.id } }" class="card group flex items-center gap-4 p-4 transition hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-900/5">
          <TeamLogo :team="team" size="lg" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold text-zinc-950 group-hover:text-pitch-700">{{ team.name }}</p>
            <p class="text-sm text-zinc-500">{{ players.rosterOf(team.id, id).length }} jugadores</p>
          </div>
          <div v-if="standingOf.get(team.id)" class="text-right">
            <p class="tabular font-display text-3xl leading-none font-bold">{{ standingOf.get(team.id)!.position }}º</p>
            <p class="text-xs text-zinc-500">{{ standingOf.get(team.id)!.points }} pts</p>
          </div>
        </RouterLink>
      </li>
    </ul>
    <EmptyState v-else :icon="Shield" title="Sin equipos inscritos" class="card" />
  </section>
</template>
