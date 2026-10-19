<script setup lang="ts">
import { useRoute, type RouteLocationRaw } from 'vue-router'

/**
 * `exact: false` mantiene la pestaña activa en rutas hijas; `activeOn` la marca también en otras
 * rutas por nombre (p. ej. Equipos → plantilla, Finanzas → estado de cuenta, que son hermanas).
 */
defineProps<{ tabs: { label: string; to: RouteLocationRaw; exact?: boolean; activeOn?: string[] }[]; label: string }>()
const route = useRoute()
const onRoute = (names?: string[]) => Boolean(names?.includes(String(route.name ?? '')))
</script>

<template>
  <nav :aria-label="label" class="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
    <ul class="flex min-w-max gap-1 border-b border-zinc-200">
      <li v-for="tab in tabs" :key="tab.label">
        <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" :to="tab.to" custom>
          <a
            :href="href"
            class="-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm font-semibold transition-colors"
            :class="
              (tab.exact === false ? isActive : isExactActive) || onRoute(tab.activeOn)
                ? 'border-pitch-900 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            "
            :aria-current="(tab.exact === false ? isActive : isExactActive) || onRoute(tab.activeOn) ? 'page' : undefined"
            @click="navigate"
          >
            {{ tab.label }}
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
