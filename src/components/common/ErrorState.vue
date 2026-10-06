<script setup lang="ts">
import { AlertTriangle, RotateCw } from 'lucide-vue-next'
import AppButton from './AppButton.vue'

defineProps<{ message: string; title?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div role="alert" class="card flex flex-col items-center px-6 py-12 text-center">
    <div class="mb-3 grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
      <AlertTriangle class="size-6" aria-hidden="true" />
    </div>
    <p class="font-semibold">{{ title ?? 'No pudimos cargar la información' }}</p>
    <p class="mt-1 max-w-sm text-sm text-zinc-500">{{ message }}</p>
    <AppButton variant="secondary" class="mt-5" @click="$emit('retry')">
      <RotateCw class="size-4" aria-hidden="true" /> Reintentar
    </AppButton>
  </div>
</template>
