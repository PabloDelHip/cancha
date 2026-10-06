<script setup lang="ts">
defineProps<{ label: string; id: string; error?: string | null; hint?: string; required?: boolean }>()
</script>

<template>
  <div>
    <label :for="id" class="mb-1.5 block text-sm font-medium text-zinc-700">
      {{ label }}<span v-if="required" class="text-red-600" aria-hidden="true"> *</span>
    </label>
    <slot />
    <p v-if="error" :id="`${id}-error`" class="mt-1 text-xs font-medium text-red-600">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="mt-1 text-xs text-zinc-500">{{ hint }}</p>
  </div>
</template>
