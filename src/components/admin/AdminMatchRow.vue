<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CalendarClock, CalendarOff, ClipboardEdit, Eye, FileText, History, ImageDown, Lock, MapPin, Pencil, Siren, UserRound } from 'lucide-vue-next'
import ActionMenu, { type ActionItem } from '@/components/common/ActionMenu.vue'
import type { Match } from '@/types'
import { useHistoricalNamesStore } from '@/stores'
import { USE_MOCKS } from '@/services'
import { isPendingCapture } from '@/utils/matches'
import { matchStatusBadge } from '@/utils/labels'
import { formatMatchDay } from '@/utils/format'
import { canAnnounce } from '@/posters/data'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppButton from '@/components/common/AppButton.vue'

/** `can*`: permisos del usuario en el torneo (RBAC); el servidor los vuelve a validar. */
/** `context`: torneo y jornada, cuando la fila se muestra fuera de su torneo (Agenda). */
/** `allowPoster`: ofrece «Crear imagen» del partido (7B-B1) en los programados y pospuestos. */
const props = withDefaults(defineProps<{ match: Match; readOnly?: boolean; allowPostpone?: boolean; allowPoster?: boolean; canSchedule?: boolean; canAssign?: boolean; canCapture?: boolean; context?: string }>(), {
  readOnly: false,
  canSchedule: true,
  canAssign: true,
  canCapture: true,
  allowPostpone: false,
  allowPoster: false,
  context: undefined,
})
const emit = defineEmits<{ edit: []; postpone: []; reschedule: []; referees: []; history: []; incidents: []; poster: [] }>()

/** 10C: dentro de un torneo finalizado, los nombres con que se jugó. */
const names = useHistoricalNamesStore()
const home = computed(() => names.team(props.match.tournamentId, props.match.homeTeamId))
const away = computed(() => names.team(props.match.tournamentId, props.match.awayTeamId))
const pending = computed(() => !props.readOnly && props.canCapture && isPendingCapture(props.match))
const hasScore = computed(() => props.match.homeScore !== null && props.match.awayScore !== null)
const inactive = computed(() => props.match.status === 'cancelled' || props.match.status === 'postponed')
/**
 * Acciones secundarias con texto en el menú «Opciones» (antes, una fila de hasta 7 iconos sin nombre
 * que en móvil se cortaba). Mismas condiciones y permisos que antes; la principal queda a la vista.
 */
const actions = computed<ActionItem[]>(() => {
  const m = props.match
  const list: ActionItem[] = []
  if (!props.readOnly) {
    if (props.canSchedule) list.push({ key: 'edit', label: 'Editar partido', hint: 'Jornada, fecha, hora o estado', icon: Pencil, group: 'Programación' })
    if (props.canSchedule && props.allowPostpone && m.status === 'scheduled') list.push({ key: 'postpone', label: 'Posponer', hint: 'Queda pendiente de nueva fecha', icon: CalendarOff, group: 'Programación' })
    if (!USE_MOCKS && m.status !== 'cancelled')
      list.push({ key: 'sheet', label: m.sheetClosed ? 'Ficha técnica (cerrada)' : 'Ficha técnica', hint: 'Alineaciones, cambios y evidencias', icon: m.sheetClosed ? Lock : FileText, to: { name: 'admin-match-sheet', params: { id: m.id } }, group: 'Partido' })
    if (!USE_MOCKS && props.canAssign && m.status !== 'cancelled') list.push({ key: 'referees', label: 'Árbitros', hint: 'Asignar, ausencias y sustitutos', icon: UserRound, group: 'Partido' })
    if (!USE_MOCKS && m.status !== 'suspended') list.push({ key: 'incidents', label: 'Incidencias', hint: 'Registrar o revisar incidencias', icon: AlertTriangle, group: 'Partido' })
  }
  if (props.allowPoster && canAnnounce(m)) list.push({ key: 'poster', label: 'Crear imagen para redes', hint: 'Cartel del partido para compartir', icon: ImageDown, group: 'Otros' })
  if (!props.readOnly && !USE_MOCKS) list.push({ key: 'history', label: 'Historial de cambios', hint: 'Quién cambió qué y cuándo', icon: History, group: 'Otros' })
  return list
})
function onAction(key: string) {
  if (key === 'edit') emit('edit')
  else if (key === 'postpone') emit('postpone')
  else if (key === 'referees') emit('referees')
  else if (key === 'incidents') emit('incidents')
  else if (key === 'poster') emit('poster')
  else if (key === 'history') emit('history')
}
const matchName = computed(() => `${home.value?.name ?? 'Local'} contra ${away.value?.name ?? 'Visita'}`)

const winner = computed(() => {
  if (props.match.status !== 'finished' || !hasScore.value) return null
  const { homeScore: h, awayScore: a } = props.match
  return h! > a! ? 'home' : h! < a! ? 'away' : 'draw'
})
</script>

<template>
  <li
    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 xl:grid-cols-[5.5rem_minmax(0,1fr)_7rem_auto]"
    :class="pending ? 'border-l-4 border-amber-400 bg-amber-50/50 pl-3' : match.status === 'cancelled' && 'opacity-60'"
  >
    <p v-if="context" class="col-span-2 -mb-1 truncate text-xs font-semibold text-pitch-800 xl:col-span-4">{{ context }}</p>
    <!-- Fecha (y estado en móvil) -->
    <div class="col-span-2 flex items-center justify-between xl:col-span-1 xl:block">
      <div>
        <p v-if="match.pendingSchedule" class="text-xs font-semibold text-amber-800">Sin fecha</p>
        <p v-else class="text-xs text-zinc-500" :class="inactive && 'line-through decoration-zinc-400'">
          {{ formatMatchDay(match.date) }} <span class="tabular font-semibold text-zinc-800 xl:block xl:text-sm">{{ match.time }}</span>
        </p>
        <p v-if="match.fieldId && match.venue" class="flex items-center gap-1 truncate text-[11px] text-zinc-500" :title="match.venue">
          <MapPin class="size-3 shrink-0" aria-hidden="true" /> <span class="truncate">{{ match.venue }}</span>
        </p>
        <p v-if="match.centralReferee" class="flex items-center gap-1 truncate text-[11px] text-zinc-500" :title="`Árbitro central: ${match.centralReferee}`">
          <UserRound class="size-3 shrink-0" aria-hidden="true" /> <span class="truncate">{{ match.centralReferee }}</span>
        </p>
      </div>
      <span class="xl:hidden">
        <StatusBadge v-if="pending && match.status === 'scheduled'" label="Por capturar" tone="amber" />
        <StatusBadge v-else v-bind="matchStatusBadge(match)" :pulse="match.status === 'live'" />
      </span>
    </div>

    <!-- Marcador (en móvil ocupa toda la fila y usa la abreviatura del club) -->
    <div class="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 xl:col-span-1">
      <div class="flex min-w-0 items-center justify-end gap-2 text-right">
        <span class="truncate text-sm font-semibold" :class="winner === 'away' ? 'text-zinc-400' : 'text-zinc-900'">
          <span class="sm:hidden">{{ home?.shortName }}</span><span class="hidden sm:inline">{{ home?.name }}</span>
        </span>
        <TeamLogo :team="home" size="sm" />
      </div>
      <div
        class="tabular min-w-16 rounded-lg px-2 py-1 text-center font-display font-bold"
        :class="match.status === 'live' ? 'bg-red-50 text-red-700' : hasScore ? 'bg-pitch-950 text-white' : 'bg-zinc-100 text-zinc-500'"
      >
        <span v-if="hasScore" class="text-lg">{{ match.homeScore }} – {{ match.awayScore }}</span>
        <span v-else class="text-sm">vs</span>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <TeamLogo :team="away" size="sm" />
        <span class="truncate text-sm font-semibold" :class="winner === 'home' ? 'text-zinc-400' : 'text-zinc-900'">
          <span class="sm:hidden">{{ away?.shortName }}</span><span class="hidden sm:inline">{{ away?.name }}</span>
        </span>
      </div>
    </div>

    <!-- Estado (escritorio) -->
    <div class="hidden justify-center xl:flex">
      <StatusBadge v-if="pending && match.status === 'scheduled'" label="Por capturar" tone="amber" />
      <StatusBadge v-else v-bind="matchStatusBadge(match)" :pulse="match.status === 'live'" />
    </div>

    <!-- Acciones: la principal con texto y el resto en «Opciones» -->
    <div class="col-span-2 flex flex-wrap items-center justify-end gap-2 xl:col-span-1 xl:flex-nowrap">
      <template v-if="!readOnly">
        <!-- Suspendido: pendiente de decisión (reanudar, reprogramar, cancelar…) en Incidencias. -->
        <AppButton v-if="match.status === 'suspended' && !USE_MOCKS" variant="accent" size="sm" title="Partido suspendido: decide qué pasa con él" @click="$emit('incidents')">
          <Siren class="size-3.5" aria-hidden="true" /> Decidir
        </AppButton>
        <AppButton v-else-if="canSchedule && match.status === 'postponed'" variant="secondary" size="sm" @click="$emit('reschedule')">
          <CalendarClock class="size-3.5" aria-hidden="true" /> {{ match.pendingSchedule ? 'Programar' : 'Reprogramar' }}
        </AppButton>
        <AppButton
          v-else-if="canCapture && match.status !== 'cancelled' && match.status !== 'postponed'"
          :to="{ name: 'admin-match-capture', params: { id: match.id } }"
          :variant="pending ? 'accent' : 'secondary'"
          size="sm"
        >
          <ClipboardEdit class="size-3.5" aria-hidden="true" />
          {{ match.status === 'finished' ? 'Resultado' : 'Capturar' }}
        </AppButton>
      </template>
      <template v-else>
        <AppButton v-if="!USE_MOCKS && match.status !== 'cancelled'" variant="ghost" size="sm" :to="{ name: 'admin-match-sheet', params: { id: match.id } }">
          <FileText class="size-3.5" aria-hidden="true" /> Ficha
        </AppButton>
        <AppButton variant="ghost" size="sm" :to="{ name: 'match', params: { id: match.id } }">
          <Eye class="size-3.5" aria-hidden="true" /> Ver
        </AppButton>
      </template>
      <ActionMenu v-if="actions.length" :items="actions" :aria-label="`Opciones de ${matchName}`" @select="onAction" />
    </div>
  </li>
</template>
