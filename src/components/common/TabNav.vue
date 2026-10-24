<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { ChevronDown } from 'lucide-vue-next'

/**
 * `exact: false` mantiene la pestaña activa en rutas hijas; `activeOn` la marca también en otras
 * rutas por nombre (p. ej. Equipos → plantilla, Finanzas → estado de cuenta, que son hermanas).
 *
 * Las pestañas que no caben en el ancho disponible pasan al menú «Más» (antes quedaban ocultas en
 * un scroll horizontal sin barra visible). La activa siempre queda a la vista.
 */
type Tab = { label: string; to: RouteLocationRaw; exact?: boolean; activeOn?: string[] }
const props = defineProps<{ tabs: Tab[]; label: string }>()
const route = useRoute()
const router = useRouter()
const onRoute = (names?: string[]) => Boolean(names?.includes(String(route.name ?? '')))

function active(tab: Tab) {
  if (onRoute(tab.activeOn)) return true
  const target = router.resolve(tab.to)
  if (tab.exact === false) return route.matched.some((r) => r.name === target.name) || route.path.startsWith(target.path)
  return route.name === target.name
}
const activeIndex = computed(() => props.tabs.findIndex(active))

// ─── Cuántas caben ────────────────────────────────────────────────────────────
const nav = ref<HTMLElement | null>(null)
const measure = ref<HTMLElement | null>(null)
const moreMeasure = ref<HTMLElement | null>(null)
/** null = caben todas; si no, cuántas pestañas (sin contar la activa) caben antes de «Más». */
const prefix = ref<number | null>(null)

function layout() {
  const box = nav.value
  const items = measure.value ? ([...measure.value.children] as HTMLElement[]) : []
  if (!box || items.length !== props.tabs.length) return
  const gap = 4
  const width = box.clientWidth
  const widths = items.map((el) => el.getBoundingClientRect().width + gap)
  if (widths.reduce((a, w) => a + w, 0) <= width) {
    prefix.value = null
    return
  }
  // Primero el lugar de «Más» y de la pestaña activa; después, en orden, las que quepan.
  const a = activeIndex.value
  let used = (moreMeasure.value?.getBoundingClientRect().width ?? 80) + gap + (a >= 0 ? widths[a]! : 0)
  let n = 0
  for (let i = 0; i < widths.length; i++) {
    if (i === a) continue
    if (used + widths[i]! > width) break
    used += widths[i]!
    n++
  }
  prefix.value = n
}

/** Visibles (en su orden original, siempre con la activa) y las del menú «Más». */
const visible = computed(() => {
  const all = props.tabs.map((t, i) => ({ t, i }))
  if (prefix.value === null) return all
  const a = activeIndex.value
  const lead = all.filter((x) => x.i !== a).slice(0, prefix.value)
  return [...lead, ...(a >= 0 ? [all[a]!] : [])].sort((x, y) => x.i - y.i)
})
const hidden = computed(() => {
  const shown = new Set(visible.value.map((x) => x.i))
  return props.tabs.map((t, i) => ({ t, i })).filter((x) => !shown.has(x.i))
})

let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(() => layout())
  if (nav.value) observer.observe(nav.value)
  if (measure.value) observer.observe(measure.value)
  layout()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('pointerdown', outside)
})
watch(
  () => [props.tabs.map((t) => t.label).join('|'), activeIndex.value],
  async () => {
    await nextTick()
    layout()
  },
)

// ─── Menú «Más» ───────────────────────────────────────────────────────────────
const open = ref(false)
const moreButton = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const menuId = `tabnav-more-${Math.random().toString(36).slice(2, 8)}`
const moreActive = computed(() => hidden.value.some((x) => x.i === activeIndex.value))

function outside(e: PointerEvent) {
  if (!menu.value?.contains(e.target as Node) && !moreButton.value?.contains(e.target as Node)) close(false)
}
async function toggle() {
  if (open.value) return close(true)
  open.value = true
  document.addEventListener('pointerdown', outside)
  await nextTick()
  menuItems()[0]?.focus()
}
function close(focusButton: boolean) {
  open.value = false
  document.removeEventListener('pointerdown', outside)
  if (focusButton) moreButton.value?.focus()
}
const menuItems = () => (menu.value ? ([...menu.value.querySelectorAll('a')] as HTMLElement[]) : [])
function onMenuKey(e: KeyboardEvent) {
  const items = menuItems()
  const i = items.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'Escape') {
    e.preventDefault()
    close(true)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    items[(i + 1) % items.length]?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    items[(i - 1 + items.length) % items.length]?.focus()
  } else if (e.key === 'Home') {
    e.preventDefault()
    items[0]?.focus()
  } else if (e.key === 'End') {
    e.preventDefault()
    items.at(-1)?.focus()
  } else if (e.key === 'Tab') close(false)
}
watch(() => route.fullPath, () => close(false))
</script>

<template>
  <nav ref="nav" :aria-label="label" class="relative border-b border-zinc-200">
    <!-- Medición (invisible y recortada: no ocupa lugar ni agrega scroll): ancho real de cada pestaña y de «Más». -->
    <div class="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden" aria-hidden="true">
      <div ref="measure" class="flex w-max gap-1 whitespace-nowrap">
        <span v-for="tab in tabs" :key="tab.label" class="inline-flex h-11 items-center px-3 text-sm font-semibold">{{ tab.label }}</span>
      </div>
      <span ref="moreMeasure" class="inline-flex h-11 w-max items-center gap-1 px-3 text-sm font-semibold">Más <ChevronDown class="size-4" /></span>
    </div>

    <ul class="flex gap-1">
      <li v-for="{ t: tab, i } in visible" :key="tab.label" class="shrink-0">
        <RouterLink v-slot="{ href, navigate }" :to="tab.to" custom>
          <a
            :href="href"
            class="-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors"
            :class="i === activeIndex ? 'border-pitch-900 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-900'"
            :aria-current="i === activeIndex ? 'page' : undefined"
            @click="navigate"
          >
            {{ tab.label }}
          </a>
        </RouterLink>
      </li>
      <li v-if="hidden.length" class="relative shrink-0">
        <button
          ref="moreButton"
          type="button"
          class="-mb-px inline-flex h-11 items-center gap-1 border-b-2 px-3 text-sm font-semibold transition-colors"
          :class="moreActive ? 'border-pitch-900 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-900'"
          aria-haspopup="true"
          :aria-expanded="open"
          :aria-controls="menuId"
          @click="toggle"
          @keydown.down.prevent="!open && toggle()"
        >
          Más <span class="sr-only">secciones ({{ hidden.length }})</span>
          <ChevronDown class="size-4 transition-transform" :class="open && 'rotate-180'" aria-hidden="true" />
        </button>
        <ul
          v-show="open"
          :id="menuId"
          ref="menu"
          class="absolute right-0 z-30 mt-1 max-h-[70vh] min-w-48 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
          @keydown="onMenuKey"
        >
          <li v-for="{ t: tab, i } in hidden" :key="tab.label">
            <RouterLink v-slot="{ href, navigate }" :to="tab.to" custom>
              <a
                :href="href"
                class="block px-4 py-2.5 text-sm font-semibold whitespace-nowrap hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
                :class="i === activeIndex ? 'text-pitch-800' : 'text-zinc-700'"
                :aria-current="i === activeIndex ? 'page' : undefined"
                @click="navigate"
              >
                {{ tab.label }}
              </a>
            </RouterLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
