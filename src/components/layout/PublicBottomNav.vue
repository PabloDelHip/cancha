<script setup lang="ts">
import { PUBLIC_NAV } from './nav'
</script>

<template>
  <!-- Navegación inferior en móvil: los jugadores consultan desde el teléfono. -->
  <nav
    aria-label="Principal"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
  >
    <ul class="grid grid-cols-4">
      <li v-for="item in PUBLIC_NAV" :key="item.label">
        <RouterLink
          :to="item.to"
          class="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-zinc-500"
          :active-class="item.exact ? '' : '!text-pitch-900'"
          exact-active-class="!text-pitch-900"
        >
          <component :is="item.icon" class="size-5" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
