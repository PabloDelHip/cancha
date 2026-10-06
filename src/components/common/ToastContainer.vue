<script setup lang="ts">
import { CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
const icons = { success: CheckCircle2, error: XCircle, info: Info }
const colors = { success: 'text-lime-400', error: 'text-red-400', info: 'text-sky-300' }
</script>

<template>
  <div
    aria-live="polite"
    class="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :role="toast.kind === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-sm text-white shadow-xl"
      >
        <component :is="icons[toast.kind]" class="mt-0.5 size-5 shrink-0" :class="colors[toast.kind]" aria-hidden="true" />
        <p class="flex-1">{{ toast.message }}</p>
        <button type="button" class="-mr-1 rounded p-0.5 text-zinc-400 hover:text-white" aria-label="Cerrar aviso" @click="dismiss(toast.id)">
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
