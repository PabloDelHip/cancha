<script setup lang="ts">
import { LayoutDashboard } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import BrandLogo from './BrandLogo.vue'
import { PUBLIC_NAV } from './nav'

// El área pública no inicializa la sesión (ni hace llamadas a /auth): usa un indicador local.
const auth = useAuthStore()
</script>

<template>
  <header class="sticky top-0 z-40 bg-pitch-950 text-white">
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
      <RouterLink to="/" aria-label="Cancha, ir al inicio" class="rounded-lg">
        <BrandLogo />
      </RouterLink>
      <nav aria-label="Principal" class="hidden md:block">
        <ul class="flex gap-1">
          <li v-for="item in PUBLIC_NAV" :key="item.label">
            <RouterLink
              :to="item.to"
              class="rounded-lg px-3 py-2 text-sm font-semibold text-pitch-200 transition-colors hover:bg-white/5 hover:text-white"
              :active-class="item.exact ? '' : '!text-white !bg-white/10'"
              :exact-active-class="'!text-white !bg-white/10'"
            >
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
      <RouterLink
        v-if="auth.mayHaveSession"
        :to="{ name: 'admin-dashboard' }"
        class="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        <LayoutDashboard class="size-4 text-lime-400" aria-hidden="true" />
        Mi panel
      </RouterLink>
      <div v-else class="ml-auto flex items-center gap-1 sm:gap-2">
        <RouterLink
          :to="{ name: 'login' }"
          class="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-pitch-200 transition-colors hover:bg-white/5 hover:text-white"
        >
          Iniciar sesión
        </RouterLink>
        <RouterLink
          :to="{ name: 'register', query: { intent: 'organizer', redirect: '/admin/leagues' } }"
          class="hidden h-9 items-center rounded-lg bg-lime-400 px-3 text-sm font-semibold text-pitch-950 transition-colors hover:bg-lime-300 sm:inline-flex"
        >
          Organiza tu torneo
        </RouterLink>
      </div>
    </div>
  </header>
</template>
