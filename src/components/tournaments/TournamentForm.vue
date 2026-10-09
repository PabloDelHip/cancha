<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Check, Search } from 'lucide-vue-next'
import type { KnockoutTiebreak, LeagueSummary, Team, Tournament, TournamentInput, TournamentSettings } from '@/types'
import { leagueService } from '@/services'
import { COMPETITION_SYSTEMS, DATA_COVERAGE, defaultSettings, KNOCKOUT_TIEBREAKS, MODALITY_LABELS, TIEBREAKERS } from '@/utils/labels'
import { bracketStartSummary, formatProblems, hasKnockout, hasRoundRobin, isPowerOfTwo, MAX_GROUPS, MAX_PLAYOFF_TEAMS } from '@/utils/formats'
import { USE_MOCKS } from '@/services/api'
import { useFormErrors } from '@/composables/useFormErrors'
import FormField from '@/components/common/FormField.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Datos del torneo + formato de competición + puntuación.
 * El estado (borrador / en curso / finalizado) NO se edita aquí: tiene acciones propias
 * en el workspace del torneo (iniciar, finalizar).
 */
const props = withDefaults(
  defineProps<{
    initial: Tournament | null
    formId: string
    /** Se puede cambiar sistema y puntuación (lo guarda la fuente de datos y el torneo no terminó). */
    settingsEditable?: boolean
    /** Explica por qué la puntuación no es editable. */
    settingsNote?: string
    /** Ya hay partidos finalizados: cambiar la puntuación recalcula la tabla. */
    hasResults?: boolean
    disabled?: boolean
    /** Equipos inscritos: candidatos a "en seguimiento" con cobertura parcial (6G). */
    teams?: Team[]
    /** Liga preseleccionada al crear (p. ej. desde "Mis ligas"). */
    defaultLeagueId?: string
  }>(),
  { settingsEditable: true, settingsNote: undefined, hasResults: false, disabled: false, teams: () => [], defaultLeagueId: undefined },
)
const emit = defineEmits<{ submit: [input: TournamentInput] }>()

const initialSettings = props.initial?.settings ?? defaultSettings()

// ─── Liga: todo torneo vive en una (elegir una mía o crear una nueva aquí mismo) ──
const NEW_LEAGUE = '__new__'
const leagues = ref<LeagueSummary[]>([])
const league = ref<string>(props.initial?.leagueId ?? props.defaultLeagueId ?? '')
const newLeagueName = ref('')
onMounted(async () => {
  if (USE_MOCKS) return
  try {
    leagues.value = await leagueService.mine()
  } catch {
    leagues.value = []
  }
  if (!league.value) league.value = leagues.value.length === 1 ? leagues.value[0]!.id : leagues.value.length ? '' : NEW_LEAGUE
})
const form = reactive({
  name: props.initial?.name ?? '',
  modality: props.initial?.modality ?? 'F7',
  category: props.initial?.category ?? 'Libre varonil',
  startDate: props.initial?.startDate ?? '',
  endDate: props.initial?.endDate ?? '',
  venue: props.initial?.venue ?? '',
  system: initialSettings.system,
  roundRobinLegs: initialSettings.roundRobinLegs,
  knockoutLegs: initialSettings.knockoutLegs,
  groupCount: initialSettings.groupCount ?? 4,
  qualifiersPerGroup: initialSettings.qualifiersPerGroup ?? 2,
  playoffTeams: initialSettings.playoffTeams ?? 4,
  win: initialSettings.points.win,
  draw: initialSettings.points.draw,
  loss: initialSettings.points.loss,
  // Penales en empates de liga: el ganador suma el extra (normalmente 1).
  shootout: !!initialSettings.points.shootoutWin,
  shootoutWin: initialSettings.points.shootoutWin ?? 1,
  knockoutTiebreak: initialSettings.knockoutTiebreak ?? 'penalties',
  finalOwnRule: !!initialSettings.finalTiebreak,
  finalTiebreak: initialSettings.finalTiebreak ?? ('penalties' as KnockoutTiebreak),
  reseed: initialSettings.reseed ?? false,
  dataCoverage: props.initial?.dataCoverage ?? 'full',
})

// ─── Equipos en seguimiento (6G): solo al editar, solo entre inscritos ──────
const tracked = ref<Set<string>>(new Set(props.initial?.trackedTeamIds ?? []))
const teamQuery = ref('')
const SEARCH_FROM = 8
const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const sortedTeams = computed(() => [...props.teams].sort((a, b) => a.name.localeCompare(b.name)))
const shownTeams = computed(() => {
  const q = normalize(teamQuery.value.trim())
  return q ? sortedTeams.value.filter((t) => normalize(`${t.name} ${t.shortName}`).includes(q)) : sortedTeams.value
})
const trackedCount = computed(() => props.teams.filter((t) => tracked.value.has(t.id)).length)
function toggleTracked(id: string) {
  const next = new Set(tracked.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  tracked.value = next
}

const { errors, set, clear, hasErrors, aria } = useFormErrors<'name' | 'category' | 'startDate' | 'endDate' | 'points' | 'format' | 'tracked' | 'league'>()

/** "Pasa el mejor de la tabla" solo tiene sentido con fase regular (liga + playoffs). */
const tiebreakOptions = computed(() => KNOCKOUT_TIEBREAKS.filter((t) => t.value !== 'better_position' || form.system === 'league_playoffs'))
const validTiebreak = (t: KnockoutTiebreak) => (tiebreakOptions.value.some((o) => o.value === t) ? t : 'penalties')

const settings = computed<TournamentSettings>(() => ({
  system: form.system,
  points: { win: form.win, draw: form.draw, loss: form.loss, shootoutWin: form.shootout ? Number(form.shootoutWin) : null },
  roundRobinLegs: form.roundRobinLegs,
  knockoutLegs: form.knockoutLegs,
  knockoutTiebreak: validTiebreak(form.knockoutTiebreak),
  finalTiebreak: form.finalOwnRule ? validTiebreak(form.finalTiebreak) : null,
  reseed: form.reseed,
  groupCount: form.system === 'groups_knockout' ? Number(form.groupCount) : null,
  qualifiersPerGroup: form.system === 'groups_knockout' ? Number(form.qualifiersPerGroup) : null,
  playoffTeams: form.system === 'league_playoffs' ? Number(form.playoffTeams) : null,
}))
/** Problemas de la configuración, explicados antes de enviar (el servidor vuelve a validarlos). */
const problems = computed(() => formatProblems(settings.value))
/** Cómo quedará la competición, en una frase. */
const summary = computed(() => {
  const s = settings.value
  const rounds = (n: number) => ['Final', 'Semifinal', 'Cuartos', 'Octavos', 'Dieciseisavos'].slice(0, Math.log2(n)).reverse().join(' → ')
  if (s.system === 'groups_knockout' && !problems.value.length) {
    const q = s.groupCount! * s.qualifiersPerGroup!
    return `${s.groupCount} grupos; clasifican ${s.qualifiersPerGroup} por grupo → ${q} equipos: ${rounds(q)}.`
  }
  if (s.system === 'league_playoffs' && !problems.value.length) {
    const n = s.playoffTeams!
    return `Fase regular; los ${n} mejores de la tabla → ${isPowerOfTwo(n) ? '' : `${bracketStartSummary(n)} → `}${rounds(Math.max(2, 2 ** Math.floor(Math.log2(n))))}.`
  }
  if (s.system === 'knockout') return 'Cuadro con cabezas de serie; si los equipos no son potencia de 2, las mejores pasan con BYE.'
  return null
})
/** El modo demo (mock) solo simula ligas: los demás formatos los calcula el servidor. */
const availableInMock = (value: string) => !USE_MOCKS || value === 'league'

const validPoints = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 10

function onSubmit() {
  clear()
  set('name', form.name.trim().length < 3 && 'Escribe un nombre de al menos 3 caracteres.')
  set(
    'league',
    !USE_MOCKS &&
      ((!league.value && 'Elige la liga del torneo.') || (league.value === NEW_LEAGUE && newLeagueName.value.trim().length < 3 && 'Escribe el nombre de la nueva liga (3 caracteres o más).')),
  )
  set('category', !form.category.trim() && 'La categoría es obligatoria.')
  set('startDate', !form.startDate && 'Indica la fecha de inicio.')
  set('endDate', form.endDate && form.startDate && form.endDate < form.startDate && 'Debe ser posterior a la fecha de inicio.')
  set(
    'points',
    (![form.win, form.draw, form.loss].every(validPoints) && 'Usa números enteros entre 0 y 10.') ||
      (form.win <= form.draw && 'La victoria debe valer más que el empate.') ||
      (form.shootout && !(Number.isInteger(form.shootoutWin) && form.shootoutWin >= 1 && form.shootoutWin <= 10) && 'El punto extra por penales debe ser un entero entre 1 y 10.'),
  )
  set('format', props.settingsEditable && problems.value[0])
  set(
    'tracked',
    props.settingsEditable && !!props.initial && form.dataCoverage === 'partial' && props.teams.length > 0 && trackedCount.value === 0 &&
      'Selecciona al menos un equipo para seguimiento.',
  )
  if (hasErrors()) return
  emit('submit', {
    ...(USE_MOCKS ? {} : league.value === NEW_LEAGUE ? { newLeagueName: newLeagueName.value.trim() } : { leagueId: league.value }),
    name: form.name.trim(),
    modality: form.modality,
    category: form.category.trim(),
    startDate: form.startDate,
    endDate: form.endDate || null,
    venue: form.venue.trim() || null,
    status: props.initial?.status ?? 'draft',
    settings: props.settingsEditable ? settings.value : initialSettings,
    dataCoverage: props.settingsEditable ? form.dataCoverage : (props.initial?.dataCoverage ?? 'full'),
    // Al crear aún no hay inscritos; en FULL el servidor los vacía solo.
    ...(props.initial && props.settingsEditable && form.dataCoverage === 'partial'
      ? { trackedTeamIds: props.teams.filter((t) => tracked.value.has(t.id)).map((t) => t.id) }
      : {}),
  })
}
</script>

<template>
  <form :id="formId" class="space-y-8" novalidate @submit.prevent="onSubmit">
    <fieldset :disabled="disabled" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <legend class="mb-3 text-base font-bold text-zinc-900">Datos del torneo</legend>
      <FormField v-if="!USE_MOCKS" id="t-league" label="Liga" :error="errors.league" required hint="Los torneos de una liga comparten su historia: campeones, récords y estadísticas." class="sm:col-span-2">
        <select id="t-league" v-model="league" class="input" v-bind="aria('league', 't-league')">
          <option value="" disabled>Elige una liga</option>
          <option v-for="l in leagues" :key="l.id" :value="l.id">{{ l.name }}</option>
          <option :value="NEW_LEAGUE">＋ Nueva liga…</option>
        </select>
      </FormField>
      <FormField v-if="!USE_MOCKS && league === NEW_LEAGUE" id="t-new-league" label="Nombre de la nueva liga" required class="sm:col-span-2">
        <input id="t-new-league" v-model="newLeagueName" class="input" placeholder="Liga Fut 7 Cancún" maxlength="80" />
      </FormField>
      <FormField id="t-name" label="Nombre del torneo" :error="errors.name" required class="sm:col-span-2">
        <input id="t-name" v-model="form.name" class="input" placeholder="Liga Cancún Apertura 2027" v-bind="aria('name', 't-name')" autofocus />
      </FormField>

      <FormField id="t-category" label="Categoría" :error="errors.category" required hint="Ej. Libre varonil, Femenil, Sub-17">
        <input id="t-category" v-model="form.category" class="input" v-bind="aria('category', 't-category')" />
      </FormField>

      <fieldset>
        <legend class="mb-1.5 text-sm font-medium text-zinc-700">Modalidad</legend>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="(label, value) in MODALITY_LABELS"
            :key="value"
            class="flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-900 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
          >
            <input v-model="form.modality" type="radio" name="modality" :value="value" class="sr-only" />
            {{ label }}
          </label>
        </div>
      </fieldset>

      <FormField id="t-start" label="Fecha de inicio" :error="errors.startDate" required>
        <input id="t-start" v-model="form.startDate" type="date" class="input" v-bind="aria('startDate', 't-start')" />
      </FormField>

      <FormField id="t-end" label="Fecha de finalización" :error="errors.endDate" hint="Opcional">
        <input id="t-end" v-model="form.endDate" type="date" class="input" :min="form.startDate" v-bind="aria('endDate', 't-end')" />
      </FormField>

      <FormField id="t-venue" label="Sede principal" hint="Opcional" class="sm:col-span-2">
        <input id="t-venue" v-model="form.venue" class="input" placeholder="Unidad Deportiva Benito Juárez" />
      </FormField>
    </fieldset>

    <fieldset :disabled="disabled || !settingsEditable" class="space-y-4">
      <legend class="mb-3 text-base font-bold text-zinc-900">Formato</legend>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label
          v-for="s in COMPETITION_SYSTEMS"
          :key="s.value"
          class="relative flex flex-col gap-1 rounded-xl border p-3 text-sm transition"
          :class="
            !availableInMock(s.value)
              ? 'cursor-not-allowed border-dashed border-zinc-200 bg-zinc-50 text-zinc-400'
              : 'cursor-pointer has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500'
          "
        >
          <input v-model="form.system" type="radio" name="system" :value="s.value" :disabled="!availableInMock(s.value)" class="sr-only" />
          <span class="flex items-center justify-between gap-2 font-semibold" :class="availableInMock(s.value) && 'text-zinc-900'">
            {{ s.label }}
            <Check v-if="form.system === s.value" class="size-4 text-pitch-700" aria-hidden="true" />
            <span v-if="!availableInMock(s.value)" class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-500 uppercase">Requiere servidor</span>
          </span>
          <span class="text-xs" :class="availableInMock(s.value) ? 'text-zinc-500' : 'text-zinc-400'">{{ s.description }}</span>
        </label>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <fieldset v-if="form.system === 'groups_knockout'" class="grid grid-cols-2 gap-3 sm:col-span-2 sm:max-w-md">
          <legend class="sr-only">Grupos</legend>
          <FormField id="t-groups" label="Número de grupos">
            <input id="t-groups" v-model.number="form.groupCount" type="number" min="2" :max="MAX_GROUPS" inputmode="numeric" class="input text-center" />
          </FormField>
          <FormField id="t-qualifiers" label="Clasifican por grupo">
            <input id="t-qualifiers" v-model.number="form.qualifiersPerGroup" type="number" min="1" max="16" inputmode="numeric" class="input text-center" />
          </FormField>
        </fieldset>

        <FormField v-if="form.system === 'league_playoffs'" id="t-playoffs" label="Clasifican a playoffs" class="sm:max-w-xs">
          <input id="t-playoffs" v-model.number="form.playoffTeams" type="number" min="2" :max="MAX_PLAYOFF_TEAMS" inputmode="numeric" class="input text-center" />
        </FormField>

        <fieldset v-if="hasRoundRobin(form.system)">
          <legend class="mb-1.5 text-sm font-medium text-zinc-700">{{ form.system === 'groups_knockout' ? 'Partidos de grupo' : 'Liga' }}</legend>
          <div class="grid grid-cols-2 gap-2">
            <label v-for="o in [{ v: 1, l: 'Una vuelta' }, { v: 2, l: 'Ida y vuelta' }]" :key="o.v" class="flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-900 has-[:checked]:text-white">
              <input v-model="form.roundRobinLegs" type="radio" name="rr-legs" :value="o.v" class="sr-only" />
              {{ o.l }}
            </label>
          </div>
        </fieldset>

        <fieldset v-if="hasKnockout(form.system)">
          <legend class="mb-1.5 text-sm font-medium text-zinc-700">Eliminatorias</legend>
          <div class="grid grid-cols-2 gap-2">
            <label v-for="o in [{ v: 1, l: 'Partido único' }, { v: 2, l: 'Ida y vuelta' }]" :key="o.v" class="flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-900 has-[:checked]:text-white">
              <input v-model="form.knockoutLegs" type="radio" name="ko-legs" :value="o.v" class="sr-only" />
              {{ o.l }}
            </label>
          </div>
        </fieldset>
      </div>

      <p v-if="settingsEditable && problems.length" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alert">{{ problems[0] }}</p>
      <p v-else-if="summary" class="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">{{ summary }}</p>
      <div v-if="hasKnockout(form.system)" class="space-y-3 rounded-xl border border-zinc-200 p-3 sm:p-4">
        <fieldset>
          <legend class="mb-1.5 text-sm font-medium text-zinc-700">Cruces después de la primera ronda</legend>
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-sm has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50">
              <span class="flex items-center gap-2 font-semibold text-zinc-900"><input v-model="form.reseed" type="radio" name="reseed" :value="false" class="accent-pitch-700" /> Cuadro fijo</span>
              <span class="text-xs text-zinc-500">Tipo Mundial: el camino de cada equipo queda trazado desde el inicio y los cruces se arman solos.</span>
            </label>
            <label class="flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-sm has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50">
              <span class="flex items-center gap-2 font-semibold text-zinc-900"><input v-model="form.reseed" type="radio" name="reseed" :value="true" class="accent-pitch-700" /> Reacomodo</span>
              <span class="text-xs text-zinc-500">Liguilla: la 1ª ronda sale de la tabla (1 vs 8, 2 vs 7…) y las siguientes las armas tú (p. ej. el mejor contra el peor).</span>
            </label>
          </div>
        </fieldset>
        <FormField id="t-ko-tiebreak" label="Si una llave termina empatada" :hint="KNOCKOUT_TIEBREAKS.find((t) => t.value === validTiebreak(form.knockoutTiebreak))?.description">
          <select id="t-ko-tiebreak" v-model="form.knockoutTiebreak" class="input">
            <option v-for="t in tiebreakOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </FormField>
        <label class="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input v-model="form.finalOwnRule" type="checkbox" class="size-4 accent-pitch-700" />
          La final tiene otra regla
        </label>
        <FormField v-if="form.finalOwnRule" id="t-final-tiebreak" label="Si la final termina empatada">
          <select id="t-final-tiebreak" v-model="form.finalTiebreak" class="input">
            <option v-for="t in tiebreakOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </FormField>
        <p class="text-xs text-zinc-500">Penales y tiempos extra se capturan en el partido que cierra la llave. Nunca se elige un clasificado al azar.</p>
      </div>
      <p v-if="errors.format" class="sr-only" role="alert">{{ errors.format }}</p>
    </fieldset>

    <fieldset :disabled="disabled || !settingsEditable" class="space-y-3">
      <legend class="mb-3 text-base font-bold text-zinc-900">Cobertura de datos</legend>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label
          v-for="c in DATA_COVERAGE"
          :key="c.value"
          class="relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
        >
          <input v-model="form.dataCoverage" type="radio" name="data-coverage" :value="c.value" class="sr-only" />
          <span class="flex items-center justify-between gap-2 font-semibold text-zinc-900">
            {{ c.label }}
            <Check v-if="form.dataCoverage === c.value" class="size-4 text-pitch-700" aria-hidden="true" />
          </span>
          <span class="text-xs text-zinc-500">{{ c.description }}</span>
        </label>
      </div>
      <p v-if="form.dataCoverage === 'partial'" class="text-xs text-zinc-500">
        Con seguimiento parcial puedes programar a mano los partidos de tus equipos, en cualquier formato (incluidas las eliminatorias).
        <template v-if="form.system !== 'league'"> Si después registras partidos a mano, para volver a cobertura completa el formato tendrá que ser Liga.</template>
      </p>
      <div v-if="form.dataCoverage === 'partial'" class="space-y-3 rounded-xl border border-zinc-200 p-3 sm:p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-sm font-bold text-zinc-900">Equipos en seguimiento</h3>
          <span v-if="initial && teams.length" class="text-xs font-semibold" :class="trackedCount ? 'text-pitch-700' : 'text-zinc-500'">
            {{ trackedCount }} {{ trackedCount === 1 ? 'equipo seleccionado' : 'equipos seleccionados' }}
          </span>
        </div>
        <p class="text-xs text-zinc-500">Selecciona los equipos de los que Cancha registrará y mostrará seguimiento dentro de esta competición.</p>
        <p v-if="!initial" class="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">Podrás elegirlos después de crear el torneo e inscribir a sus equipos.</p>
        <p v-else-if="!teams.length" class="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">Inscribe los equipos del torneo y vuelve aquí para elegir los que sigue Cancha.</p>
        <template v-else>
          <div v-if="teams.length > SEARCH_FROM" class="relative">
            <label for="tracked-search" class="sr-only">Buscar equipo</label>
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <input id="tracked-search" v-model="teamQuery" type="search" class="input h-10 pl-9" placeholder="Buscar equipo…" autocomplete="off" />
          </div>
          <ul class="max-h-80 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200" aria-label="Equipos inscritos">
            <li v-for="t in shownTeams" :key="t.id">
              <label class="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 has-[:checked]:bg-pitch-50">
                <input type="checkbox" name="tracked-team" :value="t.id" :checked="tracked.has(t.id)" class="size-4 shrink-0 accent-pitch-700" @change="toggleTracked(t.id)" />
                <TeamLogo :team="t" size="sm" />
                <span class="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{{ t.name }}</span>
                <span class="shrink-0 text-xs text-zinc-500">{{ t.shortName }}</span>
              </label>
            </li>
            <li v-if="!shownTeams.length" class="px-3 py-4 text-center text-sm text-zinc-500">Ningún equipo coincide con “{{ teamQuery }}”.</li>
          </ul>
          <p v-if="errors.tracked" class="text-sm text-red-600" role="alert">{{ errors.tracked }}</p>
          <p class="text-xs text-zinc-500">Dejar de seguir a un equipo no borra sus partidos ni sus estadísticas.</p>
        </template>
      </div>
      <p v-if="initial && initial.dataCoverage !== form.dataCoverage" class="text-xs text-zinc-500">
        Cambiar la cobertura no borra partidos, resultados ni estadísticas: solo decide si se muestran la tabla y los goleadores generales.
      </p>
    </fieldset>

    <fieldset v-if="hasRoundRobin(form.system)" :disabled="disabled || !settingsEditable" class="space-y-3">
      <legend class="mb-3 text-base font-bold text-zinc-900">Puntuación y desempate</legend>
      <div class="grid grid-cols-3 gap-3 sm:max-w-md">
        <FormField id="t-win" label="Victoria">
          <input id="t-win" v-model.number="form.win" type="number" min="0" max="10" inputmode="numeric" class="input text-center" :aria-invalid="!!errors.points || undefined" />
        </FormField>
        <FormField id="t-draw" label="Empate">
          <input id="t-draw" v-model.number="form.draw" type="number" min="0" max="10" inputmode="numeric" class="input text-center" :aria-invalid="!!errors.points || undefined" />
        </FormField>
        <FormField id="t-loss" label="Derrota">
          <input id="t-loss" v-model.number="form.loss" type="number" min="0" max="10" inputmode="numeric" class="input text-center" :aria-invalid="!!errors.points || undefined" />
        </FormField>
      </div>
      <div class="space-y-2 sm:max-w-md">
        <label class="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input v-model="form.shootout" type="checkbox" class="size-4 accent-pitch-700" />
          Los empates se definen en penales
        </label>
        <div v-if="form.shootout" class="flex items-center gap-3">
          <FormField id="t-shootout" label="Punto extra al ganador" class="w-40">
            <input id="t-shootout" v-model.number="form.shootoutWin" type="number" min="1" max="10" inputmode="numeric" class="input text-center" :aria-invalid="!!errors.points || undefined" />
          </FormField>
          <p class="text-xs text-zinc-500">Empate: ambos suman {{ form.draw }}; quien gane los penales suma {{ form.draw + (Number(form.shootoutWin) || 0) }}.</p>
        </div>
      </div>
      <p v-if="errors.points" class="text-sm text-red-600" role="alert">{{ errors.points }}</p>
      <p v-if="settingsNote" class="text-xs text-zinc-500">{{ settingsNote }}</p>
      <p v-else-if="hasResults && settingsEditable" class="text-xs text-amber-700">
        Ya hay partidos finalizados: si cambias la puntuación, la tabla se recalcula.
      </p>
      <div class="rounded-xl bg-zinc-50 p-3 text-sm">
        <p class="font-semibold text-zinc-800">Orden de la tabla</p>
        <ol class="mt-1 list-inside list-decimal text-zinc-600">
          <li v-for="t in TIEBREAKERS" :key="t">{{ t }}</li>
        </ol>
        <p class="mt-1 text-xs text-zinc-500">Solo cuentan partidos finalizados. Pospuestos y cancelados no suman.</p>
      </div>
    </fieldset>
  </form>
</template>
