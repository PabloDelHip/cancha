<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

/** Navegación entre páginas de un listado financiero ("Movimientos 51–100 de 1 000"). */
const props = defineProps<{ page: number; pages: number; total: number; limit: number; busy?: boolean }>()
const emit = defineEmits<{ go: [page: number] }>()
const from = () => (props.page - 1) * props.limit + 1
const to = () => Math.min(props.page * props.limit, props.total)
</script>

<template>
  <nav class="flex items-center justify-between gap-2 text-sm" aria-label="Páginas">
    <p class="text-zinc-500">Movimientos {{ from() }}–{{ to() }} de {{ total.toLocaleString('es-MX') }}</p>
    <div class="flex items-center gap-1">
      <button type="button" class="inline-flex h-9 items-center gap-1 rounded-lg px-2 font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-40" :disabled="busy || page <= 1" @click="emit('go', page - 1)">
        <ChevronLeft class="size-4" aria-hidden="true" /> Anteriores
      </button>
      <span class="tabular px-1 text-zinc-600">{{ page }}/{{ pages }}</span>
      <button type="button" class="inline-flex h-9 items-center gap-1 rounded-lg px-2 font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-40" :disabled="busy || page >= pages" @click="emit('go', page + 1)">
        Siguientes <ChevronRight class="size-4" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>
