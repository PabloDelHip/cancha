<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PublicBottomNav from '@/components/layout/PublicBottomNav.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
/** Rutas con `meta.focused`: sin navegación inferior (p. ej. la inscripción por enlace). */
const focused = computed(() => route.meta.focused === true)
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
      Saltar al contenido
    </a>
    <AppHeader />
    <main id="main" class="flex-1 md:pb-0" :class="focused ? 'pb-0' : 'pb-20'">
      <RouterView />
    </main>
    <AppFooter class="md:mb-0" :class="!focused && 'mb-16'" />
    <!-- Flujos enfocados (inscripción por enlace) sin navegación inferior: su propia barra de acción va abajo. -->
    <PublicBottomNav v-if="!focused" />
  </div>
</template>
