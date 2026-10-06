<script setup lang="ts">
import type { Component } from 'vue'
import { Inbox } from 'lucide-vue-next'
import EmptyIllustration from './EmptyIllustration.vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: Component
    compact?: boolean
    /** Usa la ilustración en lugar del icono (estados vacíos principales). */
    illustrated?: boolean
  }>(),
  {
    description: undefined,
    icon: () => Inbox,
  },
)
</script>

<template>
  <div class="flex flex-col items-center text-center" :class="compact ? 'px-4 py-8' : 'px-6 py-14'">
    <EmptyIllustration v-if="illustrated" class="mb-4" />
    <div v-else class="mb-3 grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-500">
      <component :is="icon" class="size-6" aria-hidden="true" />
    </div>
    <p class="font-semibold text-zinc-900" :class="illustrated && 'text-lg'">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-zinc-500">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap justify-center gap-2"><slot /></div>
  </div>
</template>
