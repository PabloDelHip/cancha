<script setup lang="ts">
import { LogOut, Menu } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { USE_MOCKS } from '@/services'
import { useToast } from '@/composables/useToast'
import { initials } from '@/utils/format'
import { userDisplayName } from '@/utils/users'
import BrandLogo from './BrandLogo.vue'

defineProps<{ menuOpen: boolean }>()
defineEmits<{ toggleMenu: [] }>()

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

async function logout() {
  await auth.logout()
  toast.info('Sesión cerrada.')
  await router.replace({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur sm:px-6">
    <button
      type="button"
      class="btn btn-ghost btn-icon -ml-2 lg:hidden"
      :aria-expanded="menuOpen"
      aria-controls="admin-mobile-nav"
      aria-label="Abrir menú"
      @click="$emit('toggleMenu')"
    >
      <Menu class="size-5" aria-hidden="true" />
    </button>
    <RouterLink :to="{ name: 'admin-dashboard' }" class="lg:hidden" aria-label="Ir al panel">
      <BrandLogo tone="dark" />
    </RouterLink>
    <span
      v-if="USE_MOCKS"
      class="hidden items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset sm:inline-flex"
    >
      Modo demo · datos locales
    </span>
    <div v-if="auth.user" class="ml-auto flex items-center gap-3">
      <div class="hidden text-right sm:block">
        <p class="text-sm font-semibold text-zinc-900">{{ userDisplayName(auth.user) }}</p>
        <p class="max-w-56 truncate text-xs text-zinc-500">{{ auth.user.email }}</p>
      </div>
      <span class="grid size-9 place-items-center rounded-full bg-pitch-900 text-sm font-bold text-lime-400" aria-hidden="true">
        {{ initials(userDisplayName(auth.user)) }}
      </span>
      <button type="button" class="btn btn-ghost btn-sm" :disabled="auth.loading" @click="logout">
        <LogOut class="size-4" aria-hidden="true" />
        <span class="hidden sm:inline">Salir</span>
        <span class="sr-only sm:hidden">Cerrar sesión</span>
      </button>
    </div>
  </header>
</template>
