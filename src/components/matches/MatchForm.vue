<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { ID, Match, MatchInput, MatchStatus, Team } from '@/types'
import { useTournamentsStore, type RoundView } from '@/stores'
import { MATCH_STATUS } from '@/utils/labels'
import { useFormErrors } from '@/composables/useFormErrors'
import FormField from '@/components/common/FormField.vue'

/**
 * Programar o editar un partido de un torneo.
 * Jornada = organización deportiva. Fecha y hora = cuándo se juega realmente.
 */
const props = defineProps<{
  initial: Match | null
  tournamentId: ID
  teams: Team[]
  rounds: RoundView[]
  /** Jornada preseleccionada al crear. */
  defaultRound: number
  /** Estado inicial al abrir (p. ej. "reprogramar" un pospuesto → scheduled). */
  defaultStatus?: MatchStatus
  defaultVenue?: string | null
  formId: string
  /** Fase de grupos: un partido es entre equipos del mismo grupo (cuenta en la tabla de ese grupo). */
  groups?: { key: string; teamIds: ID[] }[]
}>()
const emit = defineEmits<{ submit: [input: MatchInput] }>()
/** Partido de un cruce de eliminatoria: equipos y jornada los fija el cuadro; solo cambia la programación. */
const structural = computed(() => !!props.initial?.stage?.tie)
const groupOf = computed(() => new Map((props.groups ?? []).flatMap((g) => g.teamIds.map((id) => [id, g.key] as const))))
/** Con grupos: el rival tiene que ser del grupo del local. */
const otherGroup = (id: ID) => !!props.groups?.length && !!form.homeTeamId && groupOf.value.get(id) !== groupOf.value.get(form.homeTeamId)

const nextNumber = computed(() => (props.rounds[props.rounds.length - 1]?.number ?? 0) + 1)
const form = reactive<MatchInput>({
  tournamentId: props.tournamentId,
  round: props.initial?.round ?? props.defaultRound,
  homeTeamId: props.initial?.homeTeamId ?? '',
  awayTeamId: props.initial?.awayTeamId ?? '',
  date: props.initial?.date ?? props.rounds.find((r) => r.number === props.defaultRound)?.date ?? '',
  time: props.initial?.time ?? '19:00',
  venue: props.initial?.venue ?? props.defaultVenue ?? '',
  status: props.defaultStatus ?? props.initial?.status ?? 'scheduled',
})

const hasResult = computed(() => props.initial?.homeScore != null || props.initial?.status === 'finished')
/** Reprogramar un pospuesto sin cambiar su fecha: las suspensiones no sabrían cuándo se jugó. */
const keepsPostponedDate = computed(
  () => props.initial?.status === 'postponed' && form.status !== 'postponed' && form.status !== 'cancelled' && form.date === props.initial.date && form.time === props.initial.time,
)
const roundOptions = computed(() => {
  const list = props.rounds.map((r) => ({ value: r.number, label: r.label }))
  if (!list.some((o) => o.value === nextNumber.value)) list.push({ value: nextNumber.value, label: `Nueva: Jornada ${nextNumber.value}` })
  if (!list.some((o) => o.value === form.round)) list.push({ value: form.round, label: `Jornada ${form.round}` })
  return list.sort((a, b) => a.value - b.value)
})
/**
 * Estados elegibles a mano. "Finalizado" solo se alcanza capturando el resultado; "En juego"
 * solo con el torneo iniciado (en borrador se programa, no se juega: lo impone el servidor).
 */
const tournaments = useTournamentsStore()
const statusOptions = computed(() =>
  (['scheduled', 'live', 'postponed', 'cancelled'] as const).filter(
    (s) => s !== 'live' || tournaments.get(props.tournamentId)?.status !== 'draft' || form.status === 'live',
  ),
)

/** Equipos que ya juegan otro partido en la jornada elegida. */
const busyInRound = computed(() => {
  const round = props.rounds.find((r) => r.number === form.round)
  const busy = new Set<ID>()
  for (const m of round?.matches ?? []) {
    if (m.id === props.initial?.id || m.status === 'cancelled') continue
    busy.add(m.homeTeamId)
    busy.add(m.awayTeamId)
  }
  return busy
})
const nameOf = (id: ID) => props.teams.find((t) => t.id === id)?.name ?? 'El equipo'

const { errors, set, clear, hasErrors, aria } = useFormErrors<'round' | 'homeTeamId' | 'awayTeamId' | 'date' | 'time'>()

function onSubmit() {
  clear()
  set('round', (!Number.isInteger(form.round) || form.round < 1) && 'Elige una jornada.')
  set(
    'homeTeamId',
    !form.homeTeamId
      ? 'Selecciona el equipo local.'
      : busyInRound.value.has(form.homeTeamId) && `${nameOf(form.homeTeamId)} ya juega en esta jornada.`,
  )
  set(
    'awayTeamId',
    !form.awayTeamId
      ? 'Selecciona el equipo visitante.'
      : form.awayTeamId === form.homeTeamId
        ? 'Debe ser distinto al local.'
        : otherGroup(form.awayTeamId)
          ? `${nameOf(form.awayTeamId)} está en otro grupo.`
          : busyInRound.value.has(form.awayTeamId) && `${nameOf(form.awayTeamId)} ya juega en esta jornada.`,
  )
  set('date', !form.date && 'Indica la fecha.')
  set('time', !/^\d{2}:\d{2}$/.test(form.time) && 'Indica la hora.')
  if (hasErrors()) return
  emit('submit', { ...form, venue: form.venue?.trim() || null })
}
</script>

<template>
  <form :id="formId" class="grid grid-cols-1 gap-4 sm:grid-cols-2" novalidate @submit.prevent="onSubmit">
    <FormField id="m-round" label="Jornada" :error="errors.round" required hint="Organización deportiva del torneo" class="sm:col-span-2">
      <select id="m-round" v-model.number="form.round" :disabled="structural" class="input" v-bind="aria('round', 'm-round')">
        <option v-for="o in roundOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </FormField>

    <FormField id="m-home" label="Local" :error="errors.homeTeamId" required>
      <select id="m-home" v-model="form.homeTeamId" class="input" :disabled="structural || hasResult || !teams.length" v-bind="aria('homeTeamId', 'm-home')">
        <option value="" disabled>{{ teams.length ? 'Selecciona…' : 'El torneo no tiene equipos' }}</option>
        <option v-for="t in teams" :key="t.id" :value="t.id" :disabled="t.id === form.awayTeamId">
          {{ t.name }}{{ groups?.length ? ` · Grupo ${groupOf.get(t.id) ?? '—'}` : '' }}{{ busyInRound.has(t.id) ? ' (ya juega esta jornada)' : '' }}
        </option>
      </select>
    </FormField>
    <FormField id="m-away" label="Visitante" :error="errors.awayTeamId" required>
      <select id="m-away" v-model="form.awayTeamId" class="input" :disabled="structural || hasResult || !teams.length" v-bind="aria('awayTeamId', 'm-away')">
        <option value="" disabled>{{ teams.length ? 'Selecciona…' : 'El torneo no tiene equipos' }}</option>
        <option v-for="t in teams" :key="t.id" :value="t.id" :disabled="t.id === form.homeTeamId || otherGroup(t.id)">
          {{ t.name }}{{ groups?.length ? ` · Grupo ${groupOf.get(t.id) ?? '—'}` : '' }}{{ busyInRound.has(t.id) ? ' (ya juega esta jornada)' : '' }}
        </option>
      </select>
    </FormField>
    <p v-if="hasResult" class="-mt-2 text-xs text-zinc-500 sm:col-span-2">El partido ya tiene resultado: los equipos no se pueden cambiar.</p>

    <fieldset class="grid grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-3 sm:col-span-2 sm:grid-cols-3">
      <legend class="sr-only">Programación</legend>
      <p class="col-span-2 text-xs font-semibold text-zinc-500 sm:col-span-3">Cuándo y dónde se juega</p>
      <FormField id="m-date" label="Fecha" :error="errors.date" required>
        <input id="m-date" v-model="form.date" type="date" class="input" v-bind="aria('date', 'm-date')" />
      </FormField>
      <FormField id="m-time" label="Hora" :error="errors.time" required>
        <input id="m-time" v-model="form.time" type="time" class="input" v-bind="aria('time', 'm-time')" />
      </FormField>
      <FormField id="m-venue" label="Cancha / sede" hint="Opcional" class="col-span-2 sm:col-span-1">
        <input id="m-venue" v-model="form.venue" class="input" />
      </FormField>
    </fieldset>

    <FormField v-if="initial && !hasResult" id="m-status" label="Estado" class="sm:col-span-2">
      <select id="m-status" v-model="form.status" class="input">
        <option v-for="s in statusOptions" :key="s" :value="s">{{ MATCH_STATUS[s].label }}</option>
      </select>
    </FormField>
    <p v-if="form.status === 'postponed'" class="-mt-2 text-xs text-amber-700 sm:col-span-2">
      Un partido pospuesto conserva su jornada y sus equipos. Cuando tengas nueva fecha, cámbiala y vuelve a "Programado".
    </p>
    <p v-else-if="keepsPostponedDate" class="-mt-2 text-xs text-amber-700 sm:col-span-2" role="status">
      Conserva la fecha con la que se pospuso. Si se jugará (o se jugó) en otra fecha, cámbiala: mientras tanto este partido no cuenta para cumplir suspensiones.
    </p>
    <p v-else-if="form.status === 'cancelled'" class="-mt-2 text-xs text-zinc-500 sm:col-span-2">
      Un partido cancelado no se jugará y no cuenta en la tabla.
    </p>
  </form>
</template>
