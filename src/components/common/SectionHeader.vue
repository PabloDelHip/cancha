<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{ title: string; linkLabel?: string; to?: RouteLocationRaw }>()
</script>

<template>
  <div class="mb-3 flex items-end justify-between gap-4">
    <h2 class="display text-xl text-zinc-950 sm:text-2xl">{{ title }}</h2>
    <RouterLink v-if="to" :to="to" class="inline-flex items-center gap-1 text-sm font-semibold text-pitch-700 hover:text-pitch-900">
      {{ linkLabel ?? 'Ver todo' }} <ArrowRight class="size-4" aria-hidden="true" />
    </RouterLink>
  </div>
</template>
