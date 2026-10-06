<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import Spinner from './Spinner.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
    size?: 'md' | 'sm'
    type?: 'button' | 'submit'
    to?: RouteLocationRaw
    loading?: boolean
    disabled?: boolean
    icon?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', to: undefined },
)

const classes = computed(() => [
  'btn',
  `btn-${props.variant}`,
  props.size === 'sm' && 'btn-sm',
  props.icon && 'btn-icon',
])
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes">
    <slot />
  </RouterLink>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <Spinner v-if="loading" :size="size === 'sm' ? 14 : 16" />
    <slot />
  </button>
</template>
