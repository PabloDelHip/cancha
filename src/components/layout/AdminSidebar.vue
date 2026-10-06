<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { computed } from 'vue'
import { useAuthStore, useHomeStore, useTournamentsStore } from '@/stores'
import { initials } from '@/utils/format'
import { userDisplayName } from '@/utils/users'
import BrandLogo from './BrandLogo.vue'
import { ADMIN_NAV } from './nav'

defineEmits<{ navigate: [] }>()

const auth = useAuthStore()
const tournaments = useTournamentsStore()
const home = useHomeStore()
void home.ensure().catch(() => {})
/** El menú muestra solo lo que la cuenta puede usar (nunca User.role). */
const nav = computed(() => ADMIN_NAV.filter((item) => !item.organizerOnly || home.canOrganize))
/** Acceso directo al workspace de los torneos en curso y en preparación. */
const workspaces = computed(() => tournaments.mine.filter((t) => t.status !== 'finished').slice(0, 6))
const dot = { active: 'bg-lime-400', draft: 'bg-zinc-400', finished: 'bg-sky-400' } as const
</script>

<template>
  <div class="flex h-full flex-col bg-pitch-950 px-3 py-5 text-white">
    <RouterLink :to="{ name: 'admin-dashboard' }" class="mb-8 px-2" @click="$emit('navigate')">
      <BrandLogo tagline="Panel" />
    </RouterLink>

    <p class="mb-2 px-3 text-[11px] font-semibold tracking-wider text-pitch-400 uppercase">Gestión</p>
    <nav aria-label="Navegación del panel" class="flex-1">
      <ul class="space-y-1">
        <li v-for="item in nav" :key="item.label">
          <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" :to="item.to" custom>
            <a
              :href="href"
              class="relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors"
              :class="
                (item.exact ? isExactActive : isActive)
                  ? 'bg-white/10 text-white'
                  : 'text-pitch-200 hover:bg-white/5 hover:text-white'
              "
              :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : undefined"
              @click="(e) => { navigate(e); $emit('navigate') }"
            >
              <span
                v-if="item.exact ? isExactActive : isActive"
                class="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-lime-400"
                aria-hidden="true"
              />
              <component
                :is="item.icon"
                class="size-4.5"
                :class="(item.exact ? isExactActive : isActive) && 'text-lime-400'"
                aria-hidden="true"
              />
              {{ item.label }}
            </a>
          </RouterLink>
        </li>
      </ul>

      <template v-if="workspaces.length">
        <p class="mt-6 mb-2 px-3 text-[11px] font-semibold tracking-wider text-pitch-400 uppercase">Administrando</p>
        <ul class="space-y-0.5">
          <li v-for="t in workspaces" :key="t.id">
            <RouterLink v-slot="{ href, navigate, isActive }" :to="{ name: 'admin-tournament', params: { id: t.id } }" custom>
              <a
                :href="href"
                class="flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] leading-tight font-medium transition-colors"
                :class="isActive ? 'bg-white/10 text-white' : 'text-pitch-200 hover:bg-white/5 hover:text-white'"
                :aria-current="isActive ? 'page' : undefined"
                @click="(e) => { navigate(e); $emit('navigate') }"
              >
                <span class="size-2 shrink-0 rounded-full" :class="dot[t.status]" aria-hidden="true" />
                <span class="line-clamp-2">{{ t.name }}</span>
              </a>
            </RouterLink>
          </li>
        </ul>
      </template>
    </nav>

    <RouterLink
      to="/"
      class="mb-3 flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-pitch-300 hover:bg-white/5 hover:text-white"
      @click="$emit('navigate')"
    >
      <ExternalLink class="size-4" aria-hidden="true" /> Ver sitio público
    </RouterLink>

    <div v-if="auth.user" class="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
      <span class="grid size-8 shrink-0 place-items-center rounded-full bg-lime-400 text-xs font-bold text-pitch-950" aria-hidden="true">
        {{ initials(userDisplayName(auth.user)) }}
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm font-semibold">{{ userDisplayName(auth.user) }}</span>
        <span class="block truncate text-xs text-pitch-300">{{ auth.user.email }}</span>
      </span>
    </div>
  </div>
</template>
