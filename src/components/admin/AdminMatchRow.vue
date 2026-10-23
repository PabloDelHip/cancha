<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CalendarClock, CalendarOff, ClipboardEdit, Eye, FileText, History, Lock, MapPin, Pencil, Siren, UserRound } from 'lucide-vue-next'
import type { Match } from '@/types'
import { useTeamsStore } from '@/stores'
import { USE_MOCKS } from '@/services'
import { isPendingCapture } from '@/utils/matches'
import { matchStatusBadge } from '@/utils/labels'
import { formatMatchDay } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppButton from '@/components/common/AppButton.vue'

/** `can*`: permisos del usuario en el torneo (RBAC); el servidor los vuelve a validar. */
/** `context`: torneo y jornada, cuando la fila se muestra fuera de su torneo (Agenda). */
const props = withDefaults(defineProps<{ match: Match; readOnly?: boolean; allowPostpone?: boolean; canSchedule?: boolean; canAssign?: boolean; canCapture?: boolean; context?: string }>(), {
  readOnly: false,
  canSchedule: true,
  canAssign: true,
  canCapture: true,
  allowPostpone: false,
  context: undefined,
})
defineEmits<{ edit: []; postpone: []; reschedule: []; referees: []; history: []; incidents: [] }>()

const teams = useTeamsStore()
const home = computed(() => teams.get(props.match.homeTeamId))
const away = computed(() => teams.get(props.match.awayTeamId))
const pending = computed(() => !props.readOnly && props.canCapture && isPendingCapture(props.match))
const hasScore = computed(() => props.match.homeScore !== null && props.match.awayScore !== null)
const inactive = computed(() => props.match.status === 'cancelled' || props.match.status === 'postponed')
const winner = computed(() => {
  if (props.match.status !== 'finished' || !hasScore.value) return null
  const { homeScore: h, awayScore: a } = props.match
  return h! > a! ? 'home' : h! < a! ? 'away' : 'draw'
})
</script>

<template>
  <li
    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[5.5rem_minmax(0,1fr)_7rem_auto]"
    :class="pending ? 'border-l-4 border-amber-400 bg-amber-50/50 pl-3' : match.status === 'cancelled' && 'opacity-60'"
  >
    <p v-if="context" class="col-span-2 -mb-1 truncate text-xs font-semibold text-pitch-800 md:col-span-4">{{ context }}</p>
    <!-- Fecha (y estado en móvil) -->
    <div class="col-span-2 flex items-center justify-between md:col-span-1 md:block">
      <div>
        <p v-if="match.pendingSchedule" class="text-xs font-semibold text-amber-800">Sin fecha</p>
        <p v-else class="text-xs text-zinc-500" :class="inactive && 'line-through decoration-zinc-400'">
          {{ formatMatchDay(match.date) }} <span class="tabular font-semibold text-zinc-800 md:block md:text-sm">{{ match.time }}</span>
        </p>
        <p v-if="match.fieldId && match.venue" class="flex items-center gap-1 truncate text-[11px] text-zinc-500" :title="match.venue">
          <MapPin class="size-3 shrink-0" aria-hidden="true" /> <span class="truncate">{{ match.venue }}</span>
        </p>
        <p v-if="match.centralReferee" class="flex items-center gap-1 truncate text-[11px] text-zinc-500" :title="`Árbitro central: ${match.centralReferee}`">
          <UserRound class="size-3 shrink-0" aria-hidden="true" /> <span class="truncate">{{ match.centralReferee }}</span>
        </p>
      </div>
      <span class="md:hidden">
        <StatusBadge v-if="pending && match.status === 'scheduled'" label="Por capturar" tone="amber" />
        <StatusBadge v-else v-bind="matchStatusBadge(match)" :pulse="match.status === 'live'" />
      </span>
    </div>

    <!-- Marcador (en móvil ocupa toda la fila y usa la abreviatura del club) -->
    <div class="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:col-span-1">
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
    <div class="hidden justify-center md:flex">
      <StatusBadge v-if="pending && match.status === 'scheduled'" label="Por capturar" tone="amber" />
      <StatusBadge v-else v-bind="matchStatusBadge(match)" :pulse="match.status === 'live'" />
    </div>

    <!-- Acciones -->
    <div class="col-span-2 flex justify-end gap-1 md:col-span-1">
      <template v-if="!readOnly">
        <AppButton
          v-if="canSchedule"
          variant="ghost"
          size="sm"
          icon
          :aria-label="`Editar partido ${home?.name} contra ${away?.name}`"
          title="Editar jornada, fecha, hora o estado"
          @click="$emit('edit')"
        >
          <Pencil class="size-3.5" aria-hidden="true" />
        </AppButton>
        <AppButton
          v-if="!USE_MOCKS && match.status !== 'cancelled'"
          variant="ghost"
          size="sm"
          icon
          :to="{ name: 'admin-match-sheet', params: { id: match.id } }"
          :aria-label="`Ficha técnica de ${home?.name} contra ${away?.name}${match.sheetClosed ? ' (cerrada)' : ''}`"
          :title="match.sheetClosed ? 'Ficha técnica (cerrada)' : 'Ficha técnica'"
        >
          <Lock v-if="match.sheetClosed" class="size-3.5 text-pitch-700" aria-hidden="true" />
          <FileText v-else class="size-3.5" aria-hidden="true" />
        </AppButton>
        <AppButton
          v-if="!USE_MOCKS"
          variant="ghost"
          size="sm"
          icon
          :aria-label="`Historial de ${home?.name} contra ${away?.name}`"
          title="Historial"
          @click="$emit('history')"
        >
          <History class="size-3.5" aria-hidden="true" />
        </AppButton>
        <AppButton
          v-if="!USE_MOCKS && match.status !== 'suspended'"
          variant="ghost"
          size="sm"
          icon
          :aria-label="`Incidencias de ${home?.name} contra ${away?.name}`"
          title="Incidencias"
          @click="$emit('incidents')"
        >
          <AlertTriangle class="size-3.5" aria-hidden="true" />
        </AppButton>
        <AppButton
          v-if="!USE_MOCKS && canAssign && match.status !== 'cancelled'"
          variant="ghost"
          size="sm"
          icon
          :aria-label="`Árbitros de ${home?.name} contra ${away?.name}`"
          title="Árbitros"
          @click="$emit('referees')"
        >
          <UserRound class="size-3.5" aria-hidden="true" />
        </AppButton>
        <AppButton
          v-if="canSchedule && allowPostpone && match.status === 'scheduled'"
          variant="ghost"
          size="sm"
          icon
          :aria-label="`Posponer ${home?.name} contra ${away?.name}`"
          title="Posponer"
          @click="$emit('postpone')"
        >
          <CalendarOff class="size-3.5" aria-hidden="true" />
        </AppButton>
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
      <AppButton v-if="readOnly && !USE_MOCKS && match.status !== 'cancelled'" variant="ghost" size="sm" :to="{ name: 'admin-match-sheet', params: { id: match.id } }">
        <FileText class="size-3.5" aria-hidden="true" /> Ficha
      </AppButton>
      <AppButton v-if="readOnly" variant="ghost" size="sm" :to="{ name: 'match', params: { id: match.id } }">
        <Eye class="size-3.5" aria-hidden="true" /> Ver
      </AppButton>
    </div>
  </li>
</template>
