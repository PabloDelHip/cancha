<script setup lang="ts">
import { computed } from 'vue'
import { CalendarClock, CalendarOff, ClipboardEdit, Eye, Pencil } from 'lucide-vue-next'
import type { Match } from '@/types'
import { useTeamsStore } from '@/stores'
import { isPendingCapture } from '@/utils/matches'
import { MATCH_STATUS } from '@/utils/labels'
import { formatMatchDay } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppButton from '@/components/common/AppButton.vue'

const props = withDefaults(defineProps<{ match: Match; readOnly?: boolean; allowPostpone?: boolean }>(), {
  readOnly: false,
  allowPostpone: false,
})
defineEmits<{ edit: []; postpone: []; reschedule: [] }>()

const teams = useTeamsStore()
const home = computed(() => teams.get(props.match.homeTeamId))
const away = computed(() => teams.get(props.match.awayTeamId))
const pending = computed(() => !props.readOnly && isPendingCapture(props.match))
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
    <!-- Fecha (y estado en móvil) -->
    <div class="col-span-2 flex items-center justify-between md:col-span-1 md:block">
      <p class="text-xs text-zinc-500" :class="inactive && 'line-through decoration-zinc-400'">
        {{ formatMatchDay(match.date) }} <span class="tabular font-semibold text-zinc-800 md:block md:text-sm">{{ match.time }}</span>
      </p>
      <span class="md:hidden">
        <StatusBadge v-if="pending && match.status === 'scheduled'" label="Por capturar" tone="amber" />
        <StatusBadge v-else v-bind="MATCH_STATUS[match.status]" :pulse="match.status === 'live'" />
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
      <StatusBadge v-else v-bind="MATCH_STATUS[match.status]" :pulse="match.status === 'live'" />
    </div>

    <!-- Acciones -->
    <div class="col-span-2 flex justify-end gap-1 md:col-span-1">
      <template v-if="!readOnly">
        <AppButton
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
          v-if="allowPostpone && match.status === 'scheduled'"
          variant="ghost"
          size="sm"
          icon
          :aria-label="`Posponer ${home?.name} contra ${away?.name}`"
          title="Posponer"
          @click="$emit('postpone')"
        >
          <CalendarOff class="size-3.5" aria-hidden="true" />
        </AppButton>
        <AppButton v-if="match.status === 'postponed'" variant="secondary" size="sm" @click="$emit('reschedule')">
          <CalendarClock class="size-3.5" aria-hidden="true" /> Reprogramar
        </AppButton>
        <AppButton
          v-else-if="match.status !== 'cancelled'"
          :to="{ name: 'admin-match-capture', params: { id: match.id } }"
          :variant="pending ? 'accent' : 'secondary'"
          size="sm"
        >
          <ClipboardEdit class="size-3.5" aria-hidden="true" />
          {{ match.status === 'finished' ? 'Resultado' : 'Capturar' }}
        </AppButton>
      </template>
      <AppButton v-else variant="ghost" size="sm" :to="{ name: 'match', params: { id: match.id } }">
        <Eye class="size-3.5" aria-hidden="true" /> Ver
      </AppButton>
    </div>
  </li>
</template>
