<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentStructure } from '@/types'
import StandingsTable from '@/components/tournaments/StandingsTable.vue'
import ChampionBanner from '@/components/tournaments/ChampionBanner.vue'
import { useTournamentChampion } from '@/composables/useTournamentChampion'
import GroupsView from './GroupsView.vue'
import BracketView from './BracketView.vue'

/**
 * La competición según su formato: tabla (liga), tablas por grupo, cuadro — o varias fases en
 * orden. Todo sale de GET /tournaments/:id/structure; aquí no se calcula nada deportivo.
 */
const props = defineProps<{ structure: TournamentStructure; editable?: boolean }>()
const emit = defineEmits<{ addTie: [phase: number, round: number]; removeTie: [phase: number, round: number, slot: number] }>()

/** Campeón oficial (una sola tarjeta, mismo diseño que el Resumen). */
const { champion, detail } = useTournamentChampion(() => props.structure)
const PHASE_TITLE = { league: 'Fase regular', groups: 'Fase de grupos', knockout: 'Eliminatorias' } as const
const multi = computed(() => props.structure.settings.system !== 'league' && props.structure.settings.system !== 'knockout')
</script>

<template>
  <div class="space-y-8">
    <ChampionBanner v-if="champion" :team="champion" :detail="detail" />

    <section v-for="p in structure.phases" :key="p.index" :aria-label="PHASE_TITLE[p.type]">
      <h2 v-if="multi" class="display mb-3 text-2xl">{{ PHASE_TITLE[p.type] }}</h2>
      <template v-if="p.type === 'league'">
        <div v-if="p.table.length" class="card overflow-hidden">
          <StandingsTable :standings="p.table" :qualify-count="p.qualification?.count ?? 0" />
        </div>
        <p v-if="p.qualification" class="mt-2 text-xs text-zinc-500">
          Los {{ p.qualification.count }} primeros pasan a playoffs (1º vs último clasificado, 2º vs penúltimo…).
        </p>
      </template>
      <GroupsView v-else-if="p.type === 'groups'" :phase="p" :teams="structure.teams" />
      <template v-else>
        <BracketView
          v-if="p.generated"
          :phase="p"
          :teams="structure.teams"
          :editable="editable && structure.status !== 'finished'"
          @add-tie="(round) => emit('addTie', p.index, round)"
          @remove-tie="(round, slot) => emit('removeTie', p.index, round, slot)"
        />
        <p v-else class="card px-4 py-6 text-center text-sm text-zinc-500">
          El cuadro se arma cuando termine la fase anterior (con los clasificados en orden) o cuando el organizador lo arme a mano.
        </p>
      </template>
    </section>
  </div>
</template>
