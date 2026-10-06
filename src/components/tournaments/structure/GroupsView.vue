<script setup lang="ts">
import type { TournamentStructure } from '@/types'
import StandingsTable from '@/components/tournaments/StandingsTable.vue'

/** Una tabla independiente por grupo: nunca una tabla global mezclada. */
defineProps<{ phase: Extract<TournamentStructure['phases'][number], { type: 'groups' }>; teams: TournamentStructure['teams'] }>()
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <section v-for="g in phase.groups" :key="g.key" class="card overflow-hidden" :aria-label="`Grupo ${g.key}`">
      <header class="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <h3 class="font-display text-xl font-bold">Grupo {{ g.key }}</h3>
        <span class="text-xs text-zinc-500">Clasifican {{ g.qualification.count }}</span>
      </header>
      <StandingsTable :standings="g.table" compact :qualify-count="g.qualification.count" />
      <p v-if="g.qualification.unresolved.length" class="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        Empate sin criterio deportivo entre
        {{ g.qualification.unresolved[0]!.teamIds.map((id) => teams[id]?.name ?? 'equipo').join(', ') }}: lo decide el organizador al generar la eliminatoria.
      </p>
    </section>
  </div>
</template>
