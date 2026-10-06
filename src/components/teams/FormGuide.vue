<script setup lang="ts">
import type { FormResult } from '@/types'

defineProps<{ form: FormResult[] }>()

const styles: Record<FormResult, { label: string; long: string; cls: string }> = {
  W: { label: 'G', long: 'Ganado', cls: 'bg-pitch-600 text-white' },
  D: { label: 'E', long: 'Empate', cls: 'bg-zinc-300 text-zinc-800' },
  L: { label: 'P', long: 'Perdido', cls: 'bg-red-500 text-white' },
}
</script>

<template>
  <ol class="flex gap-1" aria-label="Últimos resultados">
    <li
      v-for="(r, i) in form"
      :key="i"
      class="grid size-5 place-items-center rounded text-[10px] font-bold"
      :class="styles[r].cls"
      :title="styles[r].long"
    >
      <span aria-hidden="true">{{ styles[r].label }}</span>
      <span class="sr-only">{{ styles[r].long }}</span>
    </li>
  </ol>
</template>
