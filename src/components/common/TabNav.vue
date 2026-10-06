<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/** `exact: false` mantiene la pestaña activa en rutas hijas (p. ej. Equipos → plantilla). */
defineProps<{ tabs: { label: string; to: RouteLocationRaw; exact?: boolean }[]; label: string }>()
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
              (tab.exact === false ? isActive : isExactActive)
                ? 'border-pitch-900 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            "
            :aria-current="(tab.exact === false ? isActive : isExactActive) ? 'page' : undefined"
            @click="navigate"
          >
            {{ tab.label }}
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
