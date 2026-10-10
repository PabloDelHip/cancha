<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, ArrowDown, ArrowUp, CalendarRange, Hand, Lock, Wand2 } from 'lucide-vue-next'
import posthog from 'posthog-js'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import type { ID } from '@/types'
import { posthogLog } from '@/services/posthogLogs'
import { useMatchesStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/services'
import { generateRoundRobin, planMatches, type Legs } from '@/utils/schedule'
import { hasResult } from '@/utils/matches'
import { formatDate, plural, toISODate } from '@/utils/format'
import { dealGroups, firstRoundPairs, formatProblems, GROUP_KEYS, hasRoundRobin, manualBracketSizes, KNOCKOUT_ROUND_LABEL } from '@/utils/formats'
import { SYSTEM_LABELS } from '@/utils/labels'
import { hasAssignments } from '@/utils/matches'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

/**
 * Genera la primera fase del formato del torneo con los equipos inscritos: liga (todos contra
 * todos), fase regular de liga + playoffs, fase de grupos o primera ronda de la eliminatoria. Lo
 * genera el servidor en una transacción (POST /tournaments/:id/schedule); aquí solo se previsualiza.
 * Las fases siguientes se generan desde "Competición" cuando la anterior termina.
 * Regla segura (la aplica el backend): si ya hay partidos jugados o en juego NO se regenera;
 * si solo hay partidos sin resultado, se reemplazan tras una confirmación explícita.
 *
 * "Armar a mano" (formatos con fases): solo se crea la estructura —los grupos que elija el
 * organizador o un cuadro vacío— y él programa sus jornadas o arma cada cruce.
 */
const props = defineProps<{ open: boolean; tournamentId: ID }>()
const emit = defineEmits<{ close: []; generated: [firstRound: number] }>()

const tournaments = useTournamentsStore()
const teams = useTeamsStore()
const matches = useMatchesStore()
const toast = useToast()

const tournament = computed(() => tournaments.get(props.tournamentId))
const teamIds = computed(() =>
  [...tournaments.teamIdsOf(props.tournamentId)].sort((a, b) => teams.nameOf(a).localeCompare(teams.nameOf(b))),
)
const existing = computed(() => matches.ofTournament(props.tournamentId))
const played = computed(() => existing.value.filter(hasResult))
const replaceable = computed(() => existing.value.filter((m) => !hasResult(m)))

const options = reactive({
  legs: 1 as Legs,
  startDate: '',
  daysBetweenRounds: 7,
  firstKickoff: '18:00',
  minutesBetweenMatches: 90,
  venue: '',
})
/** Orden de siembra (eliminación directa): 1 = mejor cabeza de serie. Por defecto, alfabético. */
const seeding = ref<ID[]>([])
const confirmReplace = ref(false)
const saving = ref(false)
/** Automático (Kisokar arma los partidos) o a mano (el organizador). */
const mode = ref<'auto' | 'manual'>('auto')
const bracketSize = ref(2)
/** Grupo elegido para cada equipo (a mano). */
const groupOf = ref<Record<ID, string>>({})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const today = toISODate(new Date())
    const start = tournament.value?.startDate ?? today
    options.startDate = start < today && tournament.value?.status !== 'draft' ? today : start
    options.venue = tournament.value?.venue ?? ''
    options.legs = tournament.value?.settings.roundRobinLegs ?? 1
    seeding.value = [...teamIds.value]
    confirmReplace.value = false
    mode.value = 'auto'
    bracketSize.value = manualBracketSizes(teamIds.value.length).at(-1) ?? 2
    groupOf.value = Object.fromEntries(groups.value.flatMap((g) => g.teamIds.map((id) => [id, g.key])))
  },
)

const settings = computed(() => tournament.value?.settings)
const system = computed(() => settings.value?.system ?? 'league')
const problems = computed(() => (settings.value ? formatProblems(settings.value, teamIds.value.length) : []))
const knockoutLegs = computed(() => settings.value?.knockoutLegs ?? 1)

/** Grupos tal como los armará el servidor (mismo reparto). */
const groups = computed(() =>
  system.value === 'groups_knockout' && !problems.value.length
    ? dealGroups(teamIds.value, settings.value!.groupCount!).map((ids, g) => ({ key: GROUP_KEYS[g]!, teamIds: ids }))
    : [],
)
/** Liga / fase regular: jornadas con todos los inscritos; grupos: una liga por grupo. */
const rounds = computed(() => (system.value === 'league' || system.value === 'league_playoffs' ? generateRoundRobin(teamIds.value, options.legs) : []))
const plan = computed(() =>
  options.startDate && rounds.value.length
    ? planMatches(props.tournamentId, rounds.value, { ...options, venue: options.venue.trim() || null })
    : [],
)
const lastDate = computed(() => plan.value[plan.value.length - 1]?.date)
const pairs = computed(() => (system.value === 'knockout' ? firstRoundPairs(seeding.value.length) : []))
const summary = computed(() => {
  if (system.value === 'knockout') {
    // Dos llaves vecinas con BYE: sus cabezas de serie ya se cruzan en la segunda ronda y ese
    // partido también se programa desde ahora.
    const played = pairs.value.filter(([, b]) => b !== null).length
    let early = 0
    for (let i = 0; i + 1 < pairs.value.length; i += 2) if (pairs.value[i]![1] === null && pairs.value[i + 1]![1] === null) early++
    return { rounds: knockoutLegs.value, matches: (played + early) * knockoutLegs.value, early: early * knockoutLegs.value }
  }
  if (system.value === 'groups_knockout') {
    const per = groups.value.map((g) => generateRoundRobin(g.teamIds, options.legs))
    return { rounds: Math.max(0, ...per.map((r) => r.length)), matches: per.flat().reduce((n, r) => n + r.pairs.length, 0), early: 0 }
  }
  return { rounds: rounds.value.length, matches: plan.value.length, early: 0 }
})
const perLeg = (legs: Legs) => {
  const sizes = system.value === 'groups_knockout' ? groups.value.map((g) => g.teamIds.length) : [teamIds.value.length]
  return {
    rounds: Math.max(0, ...sizes.map((n) => (n % 2 ? n : n - 1) * legs)),
    matches: sizes.reduce((sum, n) => sum + ((n * (n - 1)) / 2) * legs, 0),
  }
}
const nextPhase = computed(() => {
  const s = settings.value
  if (!s) return ''
  if (s.system === 'league_playoffs') return `Al terminar la fase regular, los ${s.playoffTeams} primeros jugarán los playoffs.`
  if (s.system === 'groups_knockout') return `Al terminar los grupos, pasan ${plural(s.qualifiersPerGroup ?? 0, 'equipo')} por grupo a la eliminatoria.`
  if (s.system === 'knockout') return 'Las rondas siguientes se programan solas al conocerse los ganadores de cada llave.'
  return ''
})

function move(i: number, delta: number) {
  const list = [...seeding.value]
  const j = i + delta
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j]!, list[i]!]
  seeding.value = list
}

const canManual = computed(() => system.value !== 'league')
const sizes = computed(() => manualBracketSizes(teamIds.value.length))
const manualGroups = computed(() =>
  GROUP_KEYS.slice(0, settings.value?.groupCount ?? 0).map((key) => ({ key, teamIds: teamIds.value.filter((id) => groupOf.value[id] === key) })),
)
const groupProblems = computed(() => {
  if (system.value !== 'groups_knockout') return []
  const q = settings.value?.qualifiersPerGroup ?? 1
  return manualGroups.value
    .filter((g) => g.teamIds.length < Math.max(2, q))
    .map((g) => `El grupo ${g.key} necesita al menos ${Math.max(2, q)} equipos (tiene ${g.teamIds.length})`)
})
const manualHint = computed(() => {
  if (system.value === 'knockout') return 'Se crea el cuadro vacío. Después, en Competición, agregas cada cruce de cada ronda con los equipos y la fecha que quieras. El campeón sale de la final.'
  if (system.value === 'groups_knockout') return 'Se crean los grupos, sin partidos. Programas tú las jornadas desde el calendario: cada partido cuenta en la tabla del grupo de sus equipos.'
  return 'Sin partidos: programas tú las jornadas de la fase regular desde el calendario y cuentan en la tabla. Los playoffs puedes armarlos después, también a mano.'
})

const blocked = computed(() => teamIds.value.length < 2 || played.value.length > 0 || problems.value.length > 0)
/** Partidos que se reemplazarían con cancha o árbitros asignados: confirmar libera esas asignaciones. */
const withAssignments = computed(() => replaceable.value.filter(hasAssignments).length)
const replaceOk = computed(() => replaceable.value.length === 0 || confirmReplace.value)
const canSubmit = computed(() =>
  mode.value === 'manual'
    ? !blocked.value && replaceOk.value && !groupProblems.value.length
    : !blocked.value && !!options.startDate && summary.value.matches > 0 && replaceOk.value,
)

async function buildManually() {
  saving.value = true
  try {
    await matches.generateSchedule(props.tournamentId, {
      ...options,
      venue: options.venue.trim() || null,
      replaceExisting: replaceable.value.length > 0 && confirmReplace.value,
      releaseAssignments: withAssignments.value > 0 && confirmReplace.value,
      manual: true,
      ...(system.value === 'knockout' ? { bracketSize: bracketSize.value } : {}),
      ...(system.value === 'groups_knockout' ? { groups: manualGroups.value.map((g) => g.teamIds) } : {}),
    })
    toast.success(system.value === 'knockout' ? 'Cuadro listo: agrega los cruces desde Competición.' : 'Listo: programa tus jornadas.')
    emit('generated', 1)
    emit('close')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function generate() {
  if (!canSubmit.value) return
  if (mode.value === 'manual') return buildManually()
  saving.value = true
  try {
    const created = await matches.generateSchedule(props.tournamentId, {
      ...options,
      venue: options.venue.trim() || null,
      replaceExisting: replaceable.value.length > 0 && confirmReplace.value,
      releaseAssignments: withAssignments.value > 0 && confirmReplace.value,
      ...(system.value === 'knockout' ? { seeding: seeding.value } : {}),
    })
    if (posthogConfigured) {
      posthog.capture('schedule_generated', {
        tournament_id: props.tournamentId,
        competition_system: system.value,
        team_count: teamIds.value.length,
        round_count: created.rounds.length,
        match_count: created.matches.length,
        replaced_existing_schedule: replaceable.value.length > 0,
      })
    }
    posthogLog.info('schedule generated', {
      competition_system: system.value,
      team_count: teamIds.value.length,
      round_count: created.rounds.length,
      match_count: created.matches.length,
      replaced_existing_schedule: replaceable.value.length > 0,
    })
    toast.success(`Calendario generado: ${plural(created.rounds.length, 'jornada')} y ${plural(created.matches.length, 'partido')}.`)
    emit('generated', 1)
    emit('close')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Generar calendario"
    :description="`${SYSTEM_LABELS[system]} con los equipos inscritos. Después puedes mover fechas, horarios o sedes.`"
    size="lg"
    @close="saving || emit('close')"
  >
    <div v-if="teamIds.length < 2" class="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
      Necesitas al menos dos equipos inscritos para generar el calendario.
    </div>

    <div v-else-if="played.length" class="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
      <Lock class="mt-0.5 size-5 shrink-0 text-zinc-500" aria-hidden="true" />
      <p>
        Este torneo ya tiene <strong>{{ plural(played.length, 'partido jugado o en juego', 'partidos jugados o en juego') }}</strong>.
        Para proteger esos resultados el calendario no se puede regenerar. Agrega jornadas y partidos manualmente desde el calendario.
      </p>
    </div>

    <div v-else-if="problems.length" class="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p class="font-semibold">La configuración del formato no es posible con {{ plural(teamIds.length, 'equipo inscrito', 'equipos inscritos') }}:</p>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="p in problems" :key="p">{{ p }}</li>
        </ul>
        <p class="mt-2">Ajusta el formato en Configuración o la lista de equipos.</p>
      </div>
    </div>

    <form v-else id="generate-form" class="space-y-5" @submit.prevent="generate">
      <fieldset v-if="canManual">
        <legend class="mb-2 text-sm font-medium text-zinc-700">¿Cómo quieres armarlo?</legend>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="o in [{ value: 'auto', icon: Wand2, title: 'Automático', text: 'Kisokar arma los partidos' }, { value: 'manual', icon: Hand, title: 'A mano', text: 'Tú armas jornadas y cruces' }] as const"
            :key="o.value"
            class="flex cursor-pointer flex-col rounded-xl border p-3 text-sm transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
          >
            <input v-model="mode" type="radio" name="gen-mode" :value="o.value" class="sr-only" />
            <span class="flex items-center gap-1.5 font-semibold"><component :is="o.icon" class="size-4" aria-hidden="true" /> {{ o.title }}</span>
            <span class="text-xs text-zinc-500">{{ o.text }}</span>
          </label>
        </div>
      </fieldset>

      <template v-if="mode === 'manual'">
        <p class="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">{{ manualHint }}</p>
        <FormField v-if="system === 'knockout'" id="gen-size" label="El cuadro empieza en">
          <select id="gen-size" v-model.number="bracketSize" class="input">
            <option v-for="n in sizes" :key="n" :value="n">{{ KNOCKOUT_ROUND_LABEL(n) }} ({{ n }} equipos)</option>
          </select>
        </FormField>
        <section v-if="system === 'groups_knockout'" aria-labelledby="mg-title">
          <p id="mg-title" class="mb-2 text-sm font-medium text-zinc-700">Grupos</p>
          <ul class="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
            <li v-for="id in teamIds" :key="id" class="flex items-center gap-2 px-3 py-1.5 text-sm">
              <label :for="`grp-${id}`" class="min-w-0 flex-1 truncate">{{ teams.nameOf(id) }}</label>
              <select :id="`grp-${id}`" v-model="groupOf[id]" class="input h-9 w-28">
                <option v-for="g in manualGroups" :key="g.key" :value="g.key">Grupo {{ g.key }}</option>
              </select>
            </li>
          </ul>
          <p class="mt-2 text-xs text-zinc-500">{{ manualGroups.map((g) => `${g.key}: ${g.teamIds.length}`).join(' · ') }}</p>
          <ul v-if="groupProblems.length" class="mt-2 space-y-0.5 text-sm text-amber-800" role="alert">
            <li v-for="p in groupProblems" :key="p">{{ p }}</li>
          </ul>
        </section>
      </template>

      <template v-else>
      <fieldset v-if="hasRoundRobin(system)">
        <legend class="mb-2 text-sm font-medium text-zinc-700">
          {{ system === 'groups_knockout' ? 'Fase de grupos' : system === 'league_playoffs' ? 'Fase regular' : 'Formato de liga' }} · {{ plural(teamIds.length, 'equipo') }}
        </legend>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="legs in ([1, 2] as const)"
            :key="legs"
            class="flex cursor-pointer flex-col rounded-xl border p-3 text-sm transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
          >
            <input v-model="options.legs" type="radio" name="legs" :value="legs" class="sr-only" />
            <span class="font-semibold">{{ legs === 1 ? 'Una vuelta' : 'Ida y vuelta' }}</span>
            <span class="text-xs text-zinc-500">{{ perLeg(legs).rounds }} jornadas · {{ perLeg(legs).matches }} partidos</span>
          </label>
        </div>
      </fieldset>

      <section v-else aria-labelledby="seed-title">
        <p id="seed-title" class="text-sm font-medium text-zinc-700">Cabezas de serie · {{ plural(seeding.length, 'equipo') }}</p>
        <p class="mb-2 text-xs text-zinc-500">
          El 1 es el mejor sembrado: cruza con el más bajo y, si faltan rivales, pasa directo (BYE). Ordena con las flechas.
        </p>
        <ol class="max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
          <li v-for="(id, i) in seeding" :key="id" class="flex items-center gap-2 px-3 py-1.5 text-sm">
            <span class="tabular w-6 text-right font-semibold text-zinc-500">{{ i + 1 }}</span>
            <span class="min-w-0 flex-1 truncate">{{ teams.nameOf(id) }}</span>
            <button type="button" class="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-30" :disabled="i === 0" :aria-label="`Subir a ${teams.nameOf(id)}`" @click="move(i, -1)">
              <ArrowUp class="size-4" aria-hidden="true" />
            </button>
            <button type="button" class="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-30" :disabled="i === seeding.length - 1" :aria-label="`Bajar a ${teams.nameOf(id)}`" @click="move(i, 1)">
              <ArrowDown class="size-4" aria-hidden="true" />
            </button>
          </li>
        </ol>
      </section>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FormField id="gen-start" :label="system === 'knockout' ? 'Primera ronda' : 'Jornada 1'" required class="col-span-2 sm:col-span-1">
          <input id="gen-start" v-model="options.startDate" type="date" class="input" required />
        </FormField>
        <FormField id="gen-every" :label="system === 'knockout' ? 'Una ronda cada' : 'Una jornada cada'" class="col-span-2 sm:col-span-1">
          <select id="gen-every" v-model.number="options.daysBetweenRounds" class="input">
            <option :value="7">Semana</option>
            <option :value="14">2 semanas</option>
            <option :value="3">3 días</option>
            <option :value="1">Día</option>
          </select>
        </FormField>
        <FormField id="gen-time" label="Primer partido">
          <input id="gen-time" v-model="options.firstKickoff" type="time" class="input" required />
        </FormField>
        <FormField id="gen-gap" label="Entre partidos">
          <select id="gen-gap" v-model.number="options.minutesBetweenMatches" class="input">
            <option :value="0">Misma hora</option>
            <option :value="60">1 h</option>
            <option :value="90">1 h 30</option>
            <option :value="120">2 h</option>
          </select>
        </FormField>
      </div>
      <FormField id="gen-venue" label="Cancha / sede" hint="Opcional; se puede cambiar partido por partido">
        <input id="gen-venue" v-model="options.venue" class="input" />
      </FormField>

      <div class="rounded-xl bg-zinc-50 p-4 text-sm">
        <p class="flex flex-wrap items-center gap-x-2 font-semibold text-zinc-900">
          <CalendarRange class="size-4 text-pitch-700" aria-hidden="true" />
          <template v-if="system === 'knockout'">{{ plural(summary.matches, 'partido') }} por programar</template>
          <template v-else>{{ plural(summary.rounds, 'jornada') }} · {{ plural(summary.matches, 'partido') }}</template>
          <template v-if="lastDate"> · {{ formatDate(options.startDate) }} – {{ formatDate(lastDate) }}</template>
        </p>
        <p v-if="system !== 'knockout' && system !== 'groups_knockout' && teamIds.length % 2" class="mt-1 text-zinc-600">Con número impar de equipos, cada jornada descansa uno.</p>
        <ul v-if="system === 'knockout'" class="mt-2 space-y-0.5 text-zinc-600">
          <li v-for="[a, b] in pairs" :key="a">
            <template v-if="b">{{ a }}. {{ teams.nameOf(seeding[a - 1]!) }} vs {{ b }}. {{ teams.nameOf(seeding[b - 1]!) }}</template>
            <span v-else class="text-zinc-500">{{ a }}. {{ teams.nameOf(seeding[a - 1]!) }} pasa directo (BYE)</span>
          </li>
        </ul>
        <div v-else-if="system === 'groups_knockout'" class="mt-2 grid gap-2 sm:grid-cols-2">
          <div v-for="g in groups" :key="g.key" class="rounded-lg bg-white p-2">
            <p class="text-xs font-semibold text-zinc-900">Grupo {{ g.key }}</p>
            <p class="text-xs text-zinc-600">{{ g.teamIds.map((id) => teams.nameOf(id)).join(' · ') }}</p>
          </div>
        </div>
        <ul v-else class="mt-2 space-y-0.5 text-zinc-600">
          <li v-for="p in rounds[0]?.pairs ?? []" :key="p.join()">
            J1 · {{ teams.nameOf(p[0]) }} vs {{ teams.nameOf(p[1]) }}
          </li>
          <li v-if="rounds[0]?.bye" class="text-zinc-500">J1 · Descansa {{ teams.nameOf(rounds[0].bye) }}</li>
        </ul>
        <p v-if="summary.early" class="mt-1 text-zinc-600">
          Incluye {{ plural(summary.early, 'partido') }} de la segunda ronda entre equipos que pasan directo.
        </p>
        <p v-if="nextPhase" class="mt-2 text-zinc-600">{{ nextPhase }}</p>
      </div>
      </template>

      <div v-if="replaceable.length" class="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div class="space-y-2">
          <p>
            Ya hay <strong>{{ plural(replaceable.length, 'partido programado', 'partidos programados') }}</strong> sin resultado.
            Se eliminarán y se reemplazarán {{ mode === 'manual' ? 'por la estructura vacía' : 'por el calendario nuevo' }}.
            <template v-if="withAssignments"> {{ withAssignments === 1 ? '1 tiene cancha o árbitros asignados: se liberarán' : `${withAssignments} tienen cancha o árbitros asignados: se liberarán` }}.</template>
          </p>
          <label class="flex cursor-pointer items-start gap-2 font-semibold">
            <input v-model="confirmReplace" type="checkbox" class="mt-0.5 size-4 accent-amber-600" />
            Reemplazar el calendario actual
          </label>
        </div>
      </div>
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">{{ blocked ? 'Cerrar' : 'Cancelar' }}</AppButton>
      <AppButton v-if="!blocked" type="submit" form="generate-form" :loading="saving" :disabled="!canSubmit">
        {{ mode === 'manual' ? (system === 'knockout' ? 'Crear cuadro vacío' : system === 'groups_knockout' ? 'Crear grupos' : 'Armar a mano') : `Generar ${plural(summary.matches, 'partido')}` }}
      </AppButton>
    </template>
  </BaseModal>
</template>
