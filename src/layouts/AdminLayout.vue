<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AdminHeader from '@/components/layout/AdminHeader.vue'
import PendingRegistrationPrompt from '@/components/admin/home/PendingRegistrationPrompt.vue'

const menuOpen = ref(false)
const route = useRoute()

watch(() => route.fullPath, () => (menuOpen.value = false))

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') menuOpen.value = false
}
</script>

<template>
  <div class="min-h-dvh bg-zinc-50" @keydown="onKeydown">
    <a href="#admin-main" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
      Saltar al contenido
    </a>
    <aside class="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
      <AdminSidebar />
    </aside>

    <!-- Menú lateral en móvil -->
    <Transition enter-active-class="transition-opacity duration-150" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
      <div v-if="menuOpen" class="fixed inset-0 z-50 bg-zinc-950/50 lg:hidden" @click="menuOpen = false" />
    </Transition>
    <Transition enter-active-class="transition-transform duration-200" enter-from-class="-translate-x-full" leave-active-class="transition-transform duration-150" leave-to-class="-translate-x-full">
      <aside v-if="menuOpen" id="admin-mobile-nav" class="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
        <AdminSidebar @navigate="menuOpen = false" />
      </aside>
    </Transition>

    <div class="lg:pl-60">
      <AdminHeader :menu-open="menuOpen" @toggle-menu="menuOpen = !menuOpen" />
      <main id="admin-main" class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <RouterView />
      </main>
    </div>
    <PendingRegistrationPrompt />
  </div>
</template>
