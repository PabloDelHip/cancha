<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PlayerGoalkeeping, PlayerProfile } from '@/types'

/**
 * Evolución por año natural (fecha real de cada partido oficial; no hay "temporadas" inventadas).
 * Barras horizontales simples: legibles a 390px sin librerías de gráficos. Con `keeper` (portero),
 * las métricas son las del puesto: porterías en cero, goles recibidos y partidos.
 */
const props = defineProps<{ years: PlayerProfile['byYear']; keeper?: PlayerGoalkeeping['byYear'] | null }>()

type Row = { year: string; values: Record<string, number>; note: string }
const METRICS = computed(() =>
  props.keeper
    ? [
        { key: 'cleanSheets', label: 'En cero', color: 'bg-pitch-600' },
        { key: 'conceded', label: 'Recibidos', color: 'bg-red-500' },
        { key: 'appearances', label: 'Partidos', color: 'bg-zinc-800' },
      ]
    : [
        { key: 'goals', label: 'Goles', color: 'bg-pitch-600' },
        { key: 'appearances', label: 'Partidos', color: 'bg-zinc-800' },
        { key: 'assists', label: 'Asistencias', color: 'bg-sky-500' },
      ],
)
const rows = computed<Row[]>(() =>
  props.keeper
    ? props.keeper.map((y) => ({
        year: y.year,
        values: { cleanSheets: y.cleanSheets, conceded: y.conceded, appearances: y.appearances },
        note: `${y.appearances} PJ · ${y.cleanSheets} en cero · ${y.conceded} recibidos`,
      }))
    : props.years.map((y) => ({
        year: y.year,
        values: { goals: y.stats.goals, appearances: y.stats.appearances, assists: y.stats.assists },
        note: `${y.stats.appearances} PJ · ${y.stats.goals} G · ${y.stats.assists} A · ${y.competitions} ${y.competitions === 1 ? 'competición' : 'competiciones'}`,
      })),
)
const metric = ref(METRICS.value[0]!.key)
watch(METRICS, (m) => (metric.value = m[0]!.key))
const current = computed(() => METRICS.value.find((m) => m.key === metric.value) ?? METRICS.value[0]!)
const max = computed(() => Math.max(1, ...rows.value.map((y) => y.values[metric.value] ?? 0)))
</script>

<template>
  <div class="card p-4">
    <div role="radiogroup" aria-label="Métrica" class="mb-4 inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs font-semibold">
      <button
        v-for="m in METRICS"
        :key="m.key"
        type="button"
        role="radio"
        :aria-checked="metric === m.key"
        class="rounded-md px-2.5 py-1.5 transition"
        :class="metric === m.key ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-600'"
        @click="metric = m.key"
      >
        {{ m.label }}
      </button>
    </div>
    <ol class="space-y-3">
      <li v-for="y in rows" :key="y.year">
        <div class="flex items-center gap-3">
          <span class="w-11 shrink-0 font-display text-lg font-bold text-zinc-500">{{ y.year }}</span>
          <div class="h-6 min-w-0 flex-1 rounded-md bg-zinc-100">
            <div class="h-full rounded-md transition-[width] duration-300" :class="current.color" :style="{ width: `${((y.values[metric] ?? 0) / max) * 100}%` }" />
          </div>
          <span class="tabular w-8 shrink-0 text-right font-display text-xl font-bold">{{ y.values[metric] }}</span>
        </div>
        <p class="tabular mt-0.5 pl-14 text-xs text-zinc-500">{{ y.note }}</p>
      </li>
    </ol>
  </div>
</template>
