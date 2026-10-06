<script setup lang="ts">
import { Search, UserPlus } from 'lucide-vue-next'

/** Las dos formas de agregar un jugador: buscar uno que ya existe o registrar uno nuevo. */
const mode = defineModel<'search' | 'create'>({ required: true })
const options = [
  { value: 'search', label: 'Buscar en la plataforma', short: 'Buscar', icon: Search },
  { value: 'create', label: 'Registrar jugador nuevo', short: 'Registrar nuevo', icon: UserPlus },
] as const
</script>

<template>
  <div role="radiogroup" aria-label="Cómo agregar el jugador" class="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="mode === o.value"
      class="flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition"
      :class="mode === o.value ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'"
      @click="mode = o.value"
    >
      <component :is="o.icon" class="size-4 shrink-0" aria-hidden="true" />
      <span class="sm:hidden">{{ o.short }}</span><span class="max-sm:hidden">{{ o.label }}</span>
    </button>
  </div>
</template>
