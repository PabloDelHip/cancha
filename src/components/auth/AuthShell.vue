<script setup lang="ts">
import { BarChart3, ShieldCheck, Trophy } from 'lucide-vue-next'
import BrandLogo from '@/components/layout/BrandLogo.vue'

defineProps<{ title: string; subtitle?: string }>()

const points = [
  { icon: Trophy, text: 'Crea tu torneo, equipos y calendario en minutos.' },
  { icon: BarChart3, text: 'Tabla, goleadores y estadísticas se calculan solas.' },
  { icon: ShieldCheck, text: 'Solo tú administras tus torneos.' },
]
</script>

<template>
  <div class="grid min-h-dvh bg-white lg:grid-cols-[1fr_1.1fr]">
    <!-- Panel de marca (escritorio) -->
    <aside class="relative hidden overflow-hidden bg-pitch-950 p-10 text-white lg:flex lg:flex-col">
      <svg class="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 600">
        <g fill="none" stroke="#fff" stroke-width="2">
          <rect x="20" y="20" width="360" height="560" />
          <line x1="20" y1="300" x2="380" y2="300" />
          <circle cx="200" cy="300" r="60" />
          <rect x="110" y="20" width="180" height="90" />
          <rect x="110" y="490" width="180" height="90" />
        </g>
      </svg>
      <RouterLink to="/" class="relative w-fit" aria-label="Cancha, ir al inicio"><BrandLogo /></RouterLink>
      <div class="relative mt-auto max-w-md">
        <h2 class="display text-5xl leading-[0.95]">
          Organiza el torneo.<br />
          <span class="text-lime-400">Construye su historia.</span>
        </h2>
        <ul class="mt-8 space-y-4">
          <li v-for="p in points" :key="p.text" class="flex items-start gap-3 text-pitch-100">
            <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-lime-400">
              <component :is="p.icon" class="size-4" aria-hidden="true" />
            </span>
            <span class="pt-1.5 text-sm">{{ p.text }}</span>
          </li>
        </ul>
      </div>
      <p class="relative mt-10 text-xs text-pitch-300">El área pública de torneos y jugadores no necesita cuenta.</p>
    </aside>

    <!-- Formulario -->
    <main class="flex flex-col px-5 py-8 sm:px-10">
      <div class="flex items-center justify-between lg:justify-end">
        <RouterLink to="/" class="lg:hidden" aria-label="Cancha, ir al inicio"><BrandLogo tone="dark" /></RouterLink>
        <RouterLink to="/" class="text-sm font-semibold text-zinc-500 hover:text-zinc-900">Ver torneos →</RouterLink>
      </div>
      <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <h1 class="display text-4xl text-zinc-950">{{ title }}</h1>
        <p v-if="subtitle" class="mt-2 text-sm text-zinc-500">{{ subtitle }}</p>
        <div class="mt-8"><slot /></div>
      </div>
    </main>
  </div>
</template>
