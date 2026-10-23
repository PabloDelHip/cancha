<script setup lang="ts">
import { WEEK_ORDER, WEEKDAY_SHORT, WEEKDAY_LONG } from '@/utils/scheduling'

/** Días de la semana (0 = domingo), de lunes a domingo. */
defineProps<{ legend: string; disabled?: boolean; tone?: 'pitch' | 'red' }>()
const days = defineModel<number[]>({ required: true })
</script>

<template>
  <fieldset :disabled="disabled">
    <legend class="mb-2 text-sm font-medium text-zinc-700">{{ legend }}</legend>
    <div class="flex flex-wrap gap-1.5">
      <label
        v-for="d in WEEK_ORDER"
        :key="d"
        class="flex h-9 min-w-12 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 text-sm font-semibold text-zinc-700 transition select-none hover:border-zinc-300 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-pitch-500/30"
        :class="tone === 'red' ? 'has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-800' : 'has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50 has-[:checked]:text-pitch-900'"
        :title="WEEKDAY_LONG[d]"
      >
        <input v-model="days" type="checkbox" :value="d" class="sr-only" :aria-label="WEEKDAY_LONG[d]" />
        {{ WEEKDAY_SHORT[d] }}
      </label>
    </div>
  </fieldset>
</template>
