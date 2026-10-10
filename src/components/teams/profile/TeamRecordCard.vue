<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
import type { FormResult, TeamProfile } from '@/types'
import { plural } from '@/utils/format'
import FormGuide from '@/components/teams/FormGuide.vue'

defineProps<{ record: TeamProfile['record']; form: FormResult[] }>()

const MAIN = [
  { key: 'played', label: 'Partidos', abbr: 'PJ' },
  { key: 'won', label: 'Ganados', abbr: 'PG' },
  { key: 'drawn', label: 'Empatados', abbr: 'PE' },
  { key: 'lost', label: 'Perdidos', abbr: 'PP' },
] as const
</script>

<template>
  <section aria-labelledby="record-title" class="card overflow-hidden">
    <h2 id="record-title" class="sr-only">Balance histórico</h2>
    <dl class="tabular grid grid-cols-4 divide-x divide-zinc-100">
      <div v-for="s in MAIN" :key="s.key" class="px-1 pt-5 pb-4 text-center">
        <dt class="eyebrow"><abbr :title="s.label" class="no-underline"><span class="sm:hidden">{{ s.abbr }}</span><span class="hidden sm:inline">{{ s.label }}</span></abbr></dt>
        <dd class="font-display text-4xl leading-none font-bold sm:text-6xl" :class="s.key === 'won' && 'text-pitch-700'">{{ record[s.key] }}</dd>
      </div>
    </dl>
    <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
      <dl class="tabular contents">
        <div class="flex items-center gap-1.5"><dt>Goles a favor</dt><dd class="font-semibold text-zinc-900">{{ record.goalsFor }}</dd></div>
        <div class="flex items-center gap-1.5"><dt>En contra</dt><dd class="font-semibold text-zinc-900">{{ record.goalsAgainst }}</dd></div>
        <div class="flex items-center gap-1.5">
          <dt>Diferencia</dt>
          <dd class="font-semibold text-zinc-900">{{ record.goalDifference > 0 ? '+' : '' }}{{ record.goalDifference }}</dd>
        </div>
      </dl>
      <div v-if="form.length" class="flex items-center gap-2">
        <span>Últimos {{ form.length }}</span>
        <FormGuide :form="form" />
      </div>
    </div>
    <p class="flex items-start justify-center gap-1.5 border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-center text-xs text-zinc-500">
      <ShieldCheck class="mt-px size-3.5 shrink-0 text-pitch-600" aria-hidden="true" />
      <span>
        Resultados oficiales de
        {{ record.competitions ? plural(record.competitions, 'competición', 'competiciones') : 'competiciones' }}
        en Kisokar · solo partidos finalizados
      </span>
    </p>
  </section>
</template>
