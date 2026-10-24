<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { ChevronDown, MoreHorizontal } from 'lucide-vue-next'
import AppButton from './AppButton.vue'

/**
 * Menú de acciones con texto (en vez de una fila de iconos sueltos): un botón «Opciones» que abre la
 * lista. Se dibuja en <body> con posición fija, así ninguna lista con overflow lo recorta; se abre
 * hacia arriba si abajo no cabe. Teclado: flechas, Inicio/Fin, Escape (devuelve el foco) y Tab.
 * `group` separa bloques; un `to` navega y si no, se emite `select` con la `key`.
 */
export interface ActionItem {
  key: string
  label: string
  icon?: Component
  hint?: string
  to?: RouteLocationRaw
  group?: string
}
const props = withDefaults(defineProps<{ items: ActionItem[]; label?: string; ariaLabel?: string }>(), { label: 'Opciones', ariaLabel: undefined })
const emit = defineEmits<{ select: [key: string] }>()

const open = ref(false)
const button = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const style = ref<Record<string, string>>({})
const id = `action-menu-${Math.random().toString(36).slice(2, 8)}`
const route = useRoute()

const menuItems = () => (menu.value ? ([...menu.value.querySelectorAll('[role="menuitem"]')] as HTMLElement[]) : [])

function place() {
  const b = button.value?.getBoundingClientRect()
  const m = menu.value
  if (!b || !m) return
  const w = m.offsetWidth
  const h = m.offsetHeight
  const left = Math.min(Math.max(8, b.right - w), window.innerWidth - w - 8)
  const below = b.bottom + 4 + h <= window.innerHeight - 8
  const top = below ? b.bottom + 4 : Math.max(8, b.top - 4 - h)
  style.value = { left: `${left}px`, top: `${top}px` }
}

async function show() {
  open.value = true
  style.value = { left: '-9999px', top: '0px' }
  await nextTick()
  place()
  menuItems()[0]?.focus({ preventScroll: true })
  document.addEventListener('pointerdown', outside, true)
  window.addEventListener('scroll', follow, true)
  window.addEventListener('resize', follow)
}
function close(focus: boolean) {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', outside, true)
  window.removeEventListener('scroll', follow, true)
  window.removeEventListener('resize', follow)
  if (focus) button.value?.querySelector('button')?.focus()
}
/** Al desplazar o cambiar el tamaño, el menú acompaña a su botón; si el botón sale de la vista, se cierra. */
function follow(e?: Event) {
  if (e && menu.value?.contains(e.target as Node)) return
  const b = button.value?.getBoundingClientRect()
  if (!b || b.bottom < 0 || b.top > window.innerHeight) return close(false)
  place()
}
function outside(e: PointerEvent) {
  const t = e.target as Node
  if (!menu.value?.contains(t) && !button.value?.contains(t)) close(false)
}
const toggle = () => (open.value ? close(true) : show())

function onKey(e: KeyboardEvent) {
  const list = menuItems()
  const i = list.indexOf(document.activeElement as HTMLElement)
  const go = (n: number) => {
    e.preventDefault()
    list[(n + list.length) % list.length]?.focus({ preventScroll: true })
  }
  if (e.key === 'ArrowDown') go(i + 1)
  else if (e.key === 'ArrowUp') go(i - 1)
  else if (e.key === 'Home') go(0)
  else if (e.key === 'End') go(list.length - 1)
  else if (e.key === 'Escape') {
    e.preventDefault()
    close(true)
  } else if (e.key === 'Tab') close(false)
}
function choose(item: ActionItem) {
  close(!item.to)
  if (!item.to) emit('select', item.key)
}
const startsGroup = (i: number) => i > 0 && props.items[i]!.group !== props.items[i - 1]!.group

watch(() => route.fullPath, () => close(false))
onBeforeUnmount(() => close(false))
</script>

<template>
  <span ref="button" class="inline-flex">
    <AppButton
      variant="secondary"
      size="sm"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? id : undefined"
      :aria-label="ariaLabel"
      @click="toggle"
      @keydown.down.prevent="!open && show()"
    >
      <MoreHorizontal class="size-3.5" aria-hidden="true" />
      {{ label }}
      <ChevronDown class="size-3.5 transition-transform" :class="open && 'rotate-180'" aria-hidden="true" />
    </AppButton>
  </span>
  <Teleport to="body">
    <div
      v-if="open"
      :id="id"
      ref="menu"
      role="menu"
      :aria-label="ariaLabel ?? label"
      class="fixed z-50 max-h-[70vh] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl"
      :style="style"
      @keydown="onKey"
    >
      <template v-for="(item, i) in items" :key="item.key">
        <div v-if="startsGroup(i)" class="my-1 border-t border-zinc-100" role="separator" />
        <p v-if="item.group && (i === 0 || startsGroup(i))" class="px-3 pt-1.5 pb-0.5 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase" aria-hidden="true">{{ item.group }}</p>
        <RouterLink
          v-if="item.to"
          :to="item.to"
          role="menuitem"
          tabindex="-1"
          class="flex items-start gap-2.5 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 focus:bg-pitch-50 focus:outline-none"
          @click="choose(item)"
        >
          <component :is="item.icon" v-if="item.icon" class="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden="true" />
          <span class="min-w-0"><span class="block font-semibold">{{ item.label }}</span><span v-if="item.hint" class="block text-xs text-zinc-500">{{ item.hint }}</span></span>
        </RouterLink>
        <button
          v-else
          type="button"
          role="menuitem"
          tabindex="-1"
          class="flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 focus:bg-pitch-50 focus:outline-none"
          @click="choose(item)"
        >
          <component :is="item.icon" v-if="item.icon" class="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden="true" />
          <span class="min-w-0"><span class="block font-semibold">{{ item.label }}</span><span v-if="item.hint" class="block text-xs text-zinc-500">{{ item.hint }}</span></span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
