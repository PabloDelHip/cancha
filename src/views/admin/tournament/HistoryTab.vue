<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { ChevronLeft, ChevronRight, History, Server, X } from 'lucide-vue-next'
import type { ID, RosterEventAction, RosterHistoryPage, Team } from '@/types'
import { getErrorMessage, ROSTER_HISTORY_REQUIRES_SERVER, rosterHistoryService, USE_MOCKS } from '@/services'
import { usePlayersStore, useTournamentsStore, useHistoricalNamesStore } from '@/stores'
import { fullName } from '@/utils/players'
import { formatDate, plural, toISODate } from '@/utils/format'
import { eventAuthor, eventSummary, eventTags, eventTitle, ROSTER_ACTION_FILTERS } from '@/utils/rosterHistory'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

/**
 * 3E — historial de plantillas del torneo: altas, cambios de equipo, bajas, reincorporaciones,
 * excepciones, dorsales, bloqueos y retiros, con motivo, autor y rol. Solo propietario y
 * administradores (la pestaña exige TEAMS y el servidor lo vuelve a validar). Los filtros viven en
 * la URL: los accesos desde Jugadores y desde la plantilla de un equipo llegan ya filtrados.
 */
const props = defineProps<{ id: string }>()
const PAGE_SIZE = 50

const route = useRoute()
const router = useRouter()
const players = usePlayersStore()
/** 10C: dentro de un torneo finalizado, los nombres con que se jugó. */
const names = useHistoricalNamesStore()
const tournaments = useTournamentsStore()

const param = (key: string) => (typeof route.query[key] === 'string' ? (route.query[key] as string) : '')
const filters = computed(() => ({
  playerId: param('playerId'),
  teamId: param('teamId'),
  action: param('action'),
  from: param('from'),
  to: param('to'),
  page: Math.max(1, Number(param('page')) || 1),
}))
const hasFilters = computed(() => Boolean(filters.value.playerId || filters.value.teamId || filters.value.action || filters.value.from || filters.value.to))
/** Cambiar un filtro vuelve a la primera página. */
function setFilter(patch: Record<string, string | number | undefined>) {
  const query: LocationQueryRaw = { ...route.query, page: undefined, ...patch }
  for (const k of Object.keys(query)) if (query[k] === '' || query[k] === undefined || (k === 'page' && query[k] === 1)) delete query[k]
  router.replace({ query })
}
const onInput = (key: string) => (e: Event) => setFilter({ [key]: (e.target as HTMLInputElement | HTMLSelectElement).value })

const page = ref<RosterHistoryPage | null>(null)
const loading = ref(false)
const error = ref('')
async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = ''
  try {
    const f = filters.value
    const actions = ROSTER_ACTION_FILTERS.find((x) => x.value === f.action)?.actions as RosterEventAction[] | undefined
    page.value = await rosterHistoryService.list(props.id, {
      playerId: f.playerId || undefined,
      teamId: f.teamId || undefined,
      action: actions,
      from: f.from || undefined,
      to: f.to || undefined,
      page: f.page,
      limit: PAGE_SIZE,
    })
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch([() => props.id, filters], load, { immediate: true, deep: true })

// Opciones: quienes participaron en el torneo (también dados de baja) y sus equipos; si el filtro
// llega por URL con alguien que ya no figura (p. ej. de un equipo quitado), se agrega con su nombre.
const playerOptions = computed(() => {
  const ids = new Set(players.memberships.filter((m) => m.tournamentId === props.id).map((m) => m.playerId))
  const list = [...ids].map((id) => ({ id, name: names.player(props.id, id) ? fullName(names.player(props.id, id)!) : (page.value?.refs.players[id] ?? 'Jugador') }))
  if (filters.value.playerId && !ids.has(filters.value.playerId)) list.push({ id: filters.value.playerId, name: page.value?.refs.players[filters.value.playerId] ?? 'Jugador seleccionado' })
  return list.sort((a, b) => a.name.localeCompare(b.name))
})
const teamOptions = computed(() => {
  const list = tournaments
    .teamIdsOf(props.id)
    .map((teamId) => names.team(props.id, teamId))
    .filter((t): t is Team => Boolean(t))
    .map((t) => ({ id: t.id, name: t.name }))
  if (filters.value.teamId && !list.some((t) => t.id === filters.value.teamId)) list.push({ id: filters.value.teamId, name: page.value?.refs.teams[filters.value.teamId] ?? 'Equipo seleccionado' })
  return list.sort((a, b) => a.name.localeCompare(b.name))
})

const refs = computed(() => page.value?.refs ?? { players: {}, teams: {}, users: {} })
const playerName = (id: ID | null) => (id ? (refs.value.players[id] ?? 'Jugador eliminado') : null)
const when = (at: string | null, date: string) =>
  at ? `${formatDate(toISODate(new Date(at)))} · ${new Date(at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : formatDate(date)
const TONE: Partial<Record<RosterEventAction, 'red' | 'amber' | 'green' | 'blue'>> = {
  BLOCKED: 'red',
  UNREGISTERED: 'amber',
  TEAM_WITHDRAWN: 'red',
  TEAM_REMOVED: 'amber',
  EXCEPTION: 'blue',
  TRANSFER_ANNULLED: 'amber',
}
</script>

<template>
  <div>
    <div class="mb-4">
      <h2 class="text-xl font-bold">Historial de plantillas</h2>
      <p class="text-sm text-zinc-500">
        Altas, cambios de equipo, bajas, excepciones, bloqueos y retiros, con su motivo y quién los hizo. Solo lo ven el propietario y los administradores.
      </p>
    </div>

    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="ROSTER_HISTORY_REQUIRES_SERVER" class="card" />

    <template v-else>
      <form class="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filtros del historial" @submit.prevent>
        <label class="block text-sm">
          <span class="mb-1 block font-semibold text-zinc-700">Jugador</span>
          <select class="input" :value="filters.playerId" @change="onInput('playerId')($event)">
            <option value="">Todos</option>
            <option v-for="p in playerOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <label class="block text-sm">
          <span class="mb-1 block font-semibold text-zinc-700">Equipo</span>
          <select class="input" :value="filters.teamId" @change="onInput('teamId')($event)">
            <option value="">Todos</option>
            <option v-for="t in teamOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
        <label class="block text-sm">
          <span class="mb-1 block font-semibold text-zinc-700">Acción</span>
          <select class="input" :value="filters.action" @change="onInput('action')($event)">
            <option value="">Todas</option>
            <option v-for="a in ROSTER_ACTION_FILTERS" :key="a.value" :value="a.value">{{ a.label }}</option>
          </select>
        </label>
        <label class="block text-sm">
          <span class="mb-1 block font-semibold text-zinc-700">Desde</span>
          <input type="date" class="input" :value="filters.from" :max="filters.to || undefined" @change="onInput('from')($event)" />
        </label>
        <label class="block text-sm">
          <span class="mb-1 block font-semibold text-zinc-700">Hasta</span>
          <input type="date" class="input" :value="filters.to" :min="filters.from || undefined" @change="onInput('to')($event)" />
        </label>
        <div v-if="hasFilters" class="sm:col-span-2 lg:col-span-5">
          <AppButton variant="ghost" size="sm" @click="router.replace({ query: {} })"><X class="size-4" aria-hidden="true" /> Quitar filtros</AppButton>
        </div>
      </form>

      <LoadingState v-if="loading && !page" />
      <ErrorState v-else-if="error" :message="error" @retry="load" />
      <template v-else-if="page">
        <p class="mb-2 text-xs text-zinc-500" role="status">
          {{ page.meta.total ? plural(page.meta.total, 'movimiento') : 'Sin movimientos' }}<template v-if="hasFilters"> con estos filtros</template>
        </p>
        <ol v-if="page.data.length" class="card divide-y divide-zinc-100" :class="loading ? 'opacity-60' : ''">
          <li v-for="e in page.data" :key="e.id" class="px-4 py-3 text-sm">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <StatusBadge :label="eventTitle(e)" :tone="TONE[e.action] ?? 'neutral'" />
              <span v-if="e.playerId" class="font-semibold text-zinc-900">{{ playerName(e.playerId) }}</span>
              <StatusBadge v-for="tag in eventTags(e)" :key="tag" :label="tag" />
              <span class="ml-auto text-xs text-zinc-500">{{ when(e.at, e.date) }}</span>
            </div>
            <p class="mt-1 text-zinc-700">{{ eventSummary(e, refs) }}</p>
            <p v-if="e.reason" class="mt-0.5 text-xs text-zinc-600">“{{ e.reason }}”</p>
            <p class="mt-0.5 text-xs text-zinc-500">{{ eventAuthor(e, refs) }}</p>
          </li>
        </ol>
        <EmptyState
          v-else
          :icon="History"
          :title="hasFilters ? 'Nada con estos filtros' : 'Sin movimientos todavía'"
          :description="hasFilters ? 'Prueba con otro jugador, equipo, acción o periodo.' : 'Aquí aparecerán las altas, bajas y cambios de la plantilla.'"
          class="card"
          compact
        />
        <nav v-if="page.meta.totalPages > 1" class="mt-3 flex items-center justify-between gap-2 text-sm" aria-label="Páginas del historial">
          <AppButton variant="secondary" size="sm" :disabled="page.meta.page <= 1" @click="setFilter({ page: page.meta.page - 1 })">
            <ChevronLeft class="size-4" aria-hidden="true" /> Más recientes
          </AppButton>
          <span class="text-zinc-500">Página {{ page.meta.page }} de {{ page.meta.totalPages }}</span>
          <AppButton variant="secondary" size="sm" :disabled="page.meta.page >= page.meta.totalPages" @click="setFilter({ page: page.meta.page + 1 })">
            Anteriores <ChevronRight class="size-4" aria-hidden="true" />
          </AppButton>
        </nav>
      </template>
    </template>
  </div>
</template>
