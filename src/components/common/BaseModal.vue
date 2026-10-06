<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{ open: boolean; title: string; description?: string; size?: 'md' | 'lg'; role?: 'dialog' | 'alertdialog' }>(),
  { description: undefined, size: 'md', role: 'dialog' },
)
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
let previousFocus: HTMLElement | null = null

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
    return
  }
  // Mantiene el foco dentro del diálogo.
  if (event.key === 'Tab' && panel.value) {
    const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      await nextTick()
      const autofocus = panel.value?.querySelector<HTMLElement>('[autofocus], input, select, textarea')
      ;(autofocus ?? panel.value?.querySelector<HTMLElement>(FOCUSABLE))?.focus()
    } else {
      document.body.style.overflow = ''
      previousFocus?.focus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 flex items-end justify-center bg-zinc-950/50 backdrop-blur-[2px] sm:items-center sm:p-4"
        :class="role === 'alertdialog' ? 'z-[60]' : 'z-50'"
        @mousedown.self="emit('close')"
        @keydown="onKeydown"
      >
        <div
          ref="panel"
          :role="role"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          :class="size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'"
        >
          <header class="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 :id="titleId" class="text-lg font-semibold text-zinc-950">{{ title }}</h2>
              <p v-if="description" class="mt-0.5 text-sm text-zinc-500">{{ description }}</p>
            </div>
            <button type="button" class="btn btn-ghost btn-icon -mr-2 -mt-1 size-9" aria-label="Cerrar" @click="emit('close')">
              <X class="size-5" aria-hidden="true" />
            </button>
          </header>
          <div class="overflow-y-auto px-5 py-5"><slot /></div>
          <footer
            v-if="$slots.footer"
            class="flex flex-col-reverse gap-2 border-t border-zinc-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
