<script setup lang="ts">
import { Check, ChevronDown, Info, LayoutGrid, ListOrdered, Swords, Trophy } from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import type { KnockoutTiebreak, LeagueSummary, Tournament, TournamentInput, TournamentSettings, UploadProgress } from '@/types'
import { leagueService } from '@/services'
import { COMPETITION_SYSTEMS, defaultSettings, KNOCKOUT_TIEBREAKS, MODALITY_LABELS, TIEBREAKERS } from '@/utils/labels'
import { bracketStartSummary, formatProblems, hasKnockout, hasRoundRobin, isPowerOfTwo, MAX_GROUPS, MAX_PLAYOFF_TEAMS } from '@/utils/formats'
import { USE_MOCKS } from '@/services/api'
import { useFormErrors } from '@/composables/useFormErrors'
import ImageUploader from '@/components/media/ImageUploader.vue'
import TournamentInformationFields from './TournamentInformationFields.vue'
import { defaultTournamentInformation } from '@/types/tournamentInformation'
import { informationProblems } from '@/utils/tournamentInformation'
import FormField from '@/components/common/FormField.vue'

/**
 * Datos del torneo + formato de competición + puntuación.
 * El estado (borrador / en curso / finalizado) NO se edita aquí: tiene acciones propias
 * en el workspace del torneo (iniciar, finalizar).
 *
 * `wizard` (alta de torneo): el mismo formulario en pasos (Datos → Formato → Fechas → Detalles
 * opcionales), con validación por paso. El modal pone los botones y usa `next()` / `back()`.
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
    uploadLogo?: (image: Blob, onProgress: UploadProgress) => Promise<unknown>
    removeLogo?: () => Promise<unknown>
    disabled?: boolean
    /** Liga preseleccionada al crear (p. ej. desde "Mis ligas"). */
    defaultLeagueId?: string
    /** En pasos (alta de torneo). */
    wizard?: boolean
  }>(),
  { settingsEditable: true, settingsNote: undefined, hasResults: false, disabled: false, uploadLogo: undefined, removeLogo: undefined, defaultLeagueId: undefined, wizard: false },
)
const emit = defineEmits<{ submit: [input: TournamentInput, image: Blob | null] }>()

// ─── Pasos (solo en modo wizard) ──────────────────────────────────────────────
const STEPS = [
  { title: 'Datos', description: 'Liga, nombre y categoría del torneo.' },
  { title: 'Formato', description: 'Cómo se juega y cómo se puntúa.' },
  { title: 'Fechas', description: 'Cuándo empieza y qué días se juega.' },
  { title: 'Detalles', description: 'Opcional: todo esto lo puedes completar después desde Configuración.' },
] as const
const OPTIONAL_SECTIONS = [
  { key: 'general', title: 'Presentación', hint: 'Logo, temporada, ciudad y descripción.' },
  { key: 'enrollment', title: 'Inscripciones y costos', hint: 'Fechas de inscripción, cupo y precios.' },
  { key: 'rules', title: 'Reglamento', hint: 'Las reglas que verán equipos y jugadores.' },
  { key: 'awards', title: 'Premios', hint: 'Qué se llevan campeón, subcampeón y destacados.' },
  { key: 'contact', title: 'Contacto', hint: 'Cómo comunicarse con la organización.' },
] as const
const step = defineModel<number>('step', { default: 0 })
/** La sección se ve: siempre en página completa; en wizard, solo la del paso actual. */
const shows = (i: number) => !props.wizard || step.value === i
const formEl = ref<HTMLFormElement | null>(null)
watch(step, async () => {
  await nextTick()
  formEl.value?.closest('.overflow-y-auto')?.scrollTo({ top: 0 })
})

const SYSTEM_ICONS = { league: ListOrdered, knockout: Swords, groups_knockout: LayoutGrid, league_playoffs: Trophy } as const
/** Opción seleccionable (modalidad, vueltas): contorno verde suave en vez de bloque negro. */
const segment =
  'flex h-10 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50 has-[:checked]:text-pitch-900 has-[:checked]:ring-1 has-[:checked]:ring-pitch-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500'

const information = ref(defaultTournamentInformation(props.initial?.information))
const registration = ref({ deadline: props.initial?.registration?.deadline ?? null, maxTeams: props.initial?.registration?.maxTeams ?? null })
const draftLogo = ref<Blob | null>(null)
const informationErrors = ref<string[]>([])
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
})

const { errors, set, clear, hasErrors, aria } = useFormErrors<'name' | 'category' | 'startDate' | 'endDate' | 'points' | 'format' | 'league'>()

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

function checkGeneral() {
  set('name', form.name.trim().length < 3 && 'Escribe un nombre de al menos 3 caracteres.')
  set(
    'league',
    !USE_MOCKS &&
      ((!league.value && 'Elige la liga del torneo.') || (league.value === NEW_LEAGUE && newLeagueName.value.trim().length < 3 && 'Escribe el nombre de la nueva liga (3 caracteres o más).')),
  )
  set('category', !form.category.trim() && 'La categoría es obligatoria.')
}
function checkDates() {
  set('startDate', !form.startDate && 'Indica la fecha de inicio.')
  set('endDate', form.endDate && form.startDate && form.endDate < form.startDate && 'Debe ser posterior a la fecha de inicio.')
}
function checkFormat() {
  set(
    'points',
    (![form.win, form.draw, form.loss].every(validPoints) && 'Usa números enteros entre 0 y 10.') ||
      (form.win <= form.draw && 'La victoria debe valer más que el empate.') ||
      (form.shootout && !(Number.isInteger(form.shootoutWin) && form.shootoutWin >= 1 && form.shootoutWin <= 10) && 'El punto extra por penales debe ser un entero entre 1 y 10.'),
  )
  set('format', props.settingsEditable && problems.value[0])
}
const STEP_CHECKS = [checkGeneral, checkFormat, checkDates, () => {}]

/** Wizard: valida el paso actual y avanza. */
function next() {
  clear()
  STEP_CHECKS[step.value]?.()
  if (hasErrors()) return
  step.value = Math.min(STEPS.length - 1, step.value + 1)
}
function back() {
  clear()
  step.value = Math.max(0, step.value - 1)
}
/** Desde el indicador de pasos solo se vuelve atrás (avanzar exige validar). */
function goTo(i: number) {
  if (i >= step.value) return
  clear()
  step.value = i
}
defineExpose({ next, back })

function onSubmit() {
  clear()
  checkGeneral()
  checkFormat()
  checkDates()
  informationErrors.value = informationProblems(information.value, registration.value)
  if (hasErrors() || informationErrors.value.length) {
    // En pasos, se lleva al organizador al primer paso con algo por corregir.
    if (props.wizard) {
      const e = errors
      step.value = e.name || e.league || e.category ? 0 : e.points || e.format ? 1 : e.startDate || e.endDate ? 2 : 3
    }
    return
  }
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
    dataCoverage: 'full',
    information: JSON.parse(JSON.stringify(information.value)),
    registration: { ...registration.value },
  }, draftLogo.value)
}
</script>

<template>
  <form :id="formId" ref="formEl" :class="wizard ? 'min-h-[28rem] space-y-6' : 'space-y-8'" novalidate @submit.prevent="onSubmit">
    <!-- Indicador de pasos (alta de torneo) -->
    <nav v-if="wizard" aria-label="Pasos para crear el torneo" class="-mt-1 space-y-4">
      <ol class="flex items-center">
        <li v-for="(s, i) in STEPS" :key="s.title" class="flex items-center" :class="i < STEPS.length - 1 && 'flex-1'">
          <button
            type="button"
            class="group flex items-center gap-2 rounded-full pr-1 text-sm font-semibold outline-pitch-500 focus-visible:outline-2"
            :class="i < step ? 'cursor-pointer text-pitch-800' : i === step ? 'cursor-default text-zinc-900' : 'cursor-default text-zinc-400'"
            :aria-current="i === step ? 'step' : undefined"
            :disabled="i > step"
            @click="goTo(i)"
          >
            <span
              class="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition"
              :class="i < step ? 'bg-pitch-600 text-white group-hover:bg-pitch-700' : i === step ? 'bg-pitch-900 text-white ring-4 ring-pitch-100' : 'border border-zinc-300 bg-white text-zinc-400'"
            >
              <Check v-if="i < step" class="size-4" aria-hidden="true" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="hidden sm:inline">{{ s.title }}</span>
          </button>
          <span v-if="i < STEPS.length - 1" class="mx-2 h-0.5 flex-1 rounded-full transition" :class="i < step ? 'bg-pitch-500' : 'bg-zinc-200'" aria-hidden="true" />
        </li>
      </ol>
      <div>
        <p class="text-xs font-semibold tracking-wide text-pitch-700 uppercase">Paso {{ step + 1 }} de {{ STEPS.length }}</p>
        <h3 class="text-lg font-bold text-zinc-950">{{ STEPS[step]!.title }}</h3>
        <p class="text-sm text-zinc-500">{{ STEPS[step]!.description }}</p>
      </div>
    </nav>

    <!-- 1. Datos -->
    <fieldset v-show="shows(0)" :disabled="disabled" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <legend :class="wizard ? 'sr-only' : 'mb-3 text-base font-bold text-zinc-900'">1. Información general</legend>
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
          <label v-for="(label, value) in MODALITY_LABELS" :key="value" :class="segment">
            <input v-model="form.modality" type="radio" name="modality" :value="value" class="sr-only" />
            {{ label }}
          </label>
        </div>
      </fieldset>

      <FormField id="t-venue" label="Sede principal" hint="Opcional" class="sm:col-span-2">
        <input id="t-venue" v-model="form.venue" class="input" placeholder="Unidad Deportiva Benito Juárez" />
      </FormField>
      <template v-if="!wizard">
        <TournamentInformationFields v-model="information" v-model:registration="registration" section="general" :league-city="leagues.find((l) => l.id === league)?.city" />
        <ImageUploader v-model:draft="draftLogo" class="sm:col-span-2" shape="square" :size="512" :current-url="initial?.logoUrl" title="Logo del torneo" :upload="uploadLogo" :remove="removeLogo" :disabled="disabled">
          <template #fallback><Trophy class="size-10 text-pitch-500" aria-hidden="true" /></template>
        </ImageUploader>
      </template>
    </fieldset>

    <!-- 2. Formato y puntuación -->
    <div v-show="shows(1)" class="space-y-6">
    <fieldset :disabled="disabled || !settingsEditable" class="space-y-4">
      <legend :class="wizard ? 'mb-2 text-sm font-semibold text-zinc-900' : 'mb-3 text-base font-bold text-zinc-900'">{{ wizard ? 'Sistema de competición' : '2. Formato de competición' }}</legend>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label
          v-for="s in COMPETITION_SYSTEMS"
          :key="s.value"
          class="relative flex gap-3 rounded-xl border p-3 text-sm transition"
          :class="
            !availableInMock(s.value)
              ? 'cursor-not-allowed border-dashed border-zinc-200 bg-zinc-50 text-zinc-400'
              : 'cursor-pointer border-zinc-200 hover:border-zinc-300 has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50 has-[:checked]:ring-1 has-[:checked]:ring-pitch-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500'
          "
        >
          <input v-model="form.system" type="radio" name="system" :value="s.value" :disabled="!availableInMock(s.value)" class="sr-only" />
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-lg transition"
            :class="form.system === s.value ? 'bg-pitch-600 text-white' : 'bg-zinc-100 text-zinc-500'"
            aria-hidden="true"
          >
            <component :is="SYSTEM_ICONS[s.value]" class="size-5" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="flex items-center justify-between gap-2 font-semibold" :class="availableInMock(s.value) && 'text-zinc-900'">
              {{ s.label }}
              <Check v-if="form.system === s.value" class="size-4 text-pitch-700" aria-hidden="true" />
              <span v-if="!availableInMock(s.value)" class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-500 uppercase">Requiere servidor</span>
            </span>
            <span class="text-xs" :class="availableInMock(s.value) ? 'text-zinc-500' : 'text-zinc-400'">{{ s.description }}</span>
          </span>
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

        <FormField v-if="form.system === 'league_playoffs'" id="t-playoffs" label="Clasifican a playoffs" hint="Cualquier número: si no es 2, 4, 8 o 16, los mejores pasan directo." class="sm:col-span-2 sm:max-w-xs">
          <input id="t-playoffs" v-model.number="form.playoffTeams" type="number" min="2" :max="MAX_PLAYOFF_TEAMS" inputmode="numeric" class="input text-center" />
        </FormField>

        <fieldset v-if="hasRoundRobin(form.system)">
          <legend class="mb-1.5 text-sm font-medium text-zinc-700">{{ form.system === 'groups_knockout' ? 'Partidos de grupo' : 'Liga' }}</legend>
          <div class="grid grid-cols-2 gap-2">
            <label v-for="o in [{ v: 1, l: 'Una vuelta' }, { v: 2, l: 'Ida y vuelta' }]" :key="o.v" :class="segment">
              <input v-model="form.roundRobinLegs" type="radio" name="rr-legs" :value="o.v" class="sr-only" />
              {{ o.l }}
            </label>
          </div>
        </fieldset>

        <fieldset v-if="hasKnockout(form.system)">
          <legend class="mb-1.5 text-sm font-medium text-zinc-700">Eliminatorias</legend>
          <div class="grid grid-cols-2 gap-2">
            <label v-for="o in [{ v: 1, l: 'Partido único' }, { v: 2, l: 'Ida y vuelta' }]" :key="o.v" :class="segment">
              <input v-model="form.knockoutLegs" type="radio" name="ko-legs" :value="o.v" class="sr-only" />
              {{ o.l }}
            </label>
          </div>
        </fieldset>
      </div>

      <p v-if="settingsEditable && problems.length" class="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alert">
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {{ problems[0] }}
      </p>
      <p v-else-if="summary" class="flex gap-2 rounded-xl border border-pitch-100 bg-pitch-50/60 p-3 text-sm text-pitch-900">
        <Info class="mt-0.5 size-4 shrink-0 text-pitch-600" aria-hidden="true" /> <span><span class="font-semibold">Así quedará:</span> {{ summary }}</span>
      </p>
      <div v-if="hasKnockout(form.system)" class="space-y-3 rounded-xl border border-zinc-200 p-3 sm:p-4">
        <fieldset>
          <legend class="mb-1.5 text-sm font-medium text-zinc-700">Cruces después de la primera ronda</legend>
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-zinc-200 p-3 text-sm has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50">
              <span class="flex items-center gap-2 font-semibold text-zinc-900"><input v-model="form.reseed" type="radio" name="reseed" :value="false" class="accent-pitch-700" /> Cuadro fijo</span>
              <span class="text-xs text-zinc-500">Tipo Mundial: el camino de cada equipo queda trazado desde el inicio y los cruces se arman solos.</span>
            </label>
            <label class="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-zinc-200 p-3 text-sm has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50">
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

    <fieldset v-if="hasRoundRobin(form.system)" :disabled="disabled || !settingsEditable" class="space-y-3" :class="wizard && 'border-t border-zinc-100 pt-5'">
      <legend :class="wizard ? 'mb-2 text-sm font-semibold text-zinc-900' : 'mb-3 text-base font-bold text-zinc-900'">Puntuación y desempate</legend>
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
      <details class="group rounded-xl bg-zinc-50 p-3 text-sm">
        <summary class="flex cursor-pointer list-none items-center justify-between font-semibold text-zinc-800">
          ¿Cómo se ordena la tabla?
          <ChevronDown class="size-4 text-zinc-400 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ol class="mt-2 list-inside list-decimal text-zinc-600">
          <li v-for="t in TIEBREAKERS" :key="t">{{ t }}</li>
        </ol>
        <p class="mt-1 text-xs text-zinc-500">Solo cuentan partidos finalizados. Pospuestos y cancelados no suman.</p>
      </details>
    </fieldset>
    </div>

    <!-- 3. Fechas -->
    <fieldset v-show="shows(2)" :disabled="disabled" class="space-y-4">
      <legend :class="wizard ? 'sr-only' : 'mb-3 text-base font-bold text-zinc-900'">3. Calendario y horarios</legend>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="t-start" label="Fecha de inicio" :error="errors.startDate" required>
          <input id="t-start" v-model="form.startDate" type="date" class="input" v-bind="aria('startDate', 't-start')" />
        </FormField>
        <FormField id="t-end" label="Fecha de finalización" :error="errors.endDate" hint="Opcional">
          <input id="t-end" v-model="form.endDate" type="date" class="input" :min="form.startDate" v-bind="aria('endDate', 't-end')" />
        </FormField>
      </div>
      <TournamentInformationFields v-model="information" v-model:registration="registration" section="schedule" />
    </fieldset>

    <!-- 4. Detalles opcionales: en wizard, plegables para no abrumar -->
    <div v-if="wizard" v-show="shows(3)" class="space-y-2">
      <details v-for="sec in OPTIONAL_SECTIONS" :key="sec.key" class="group rounded-xl border border-zinc-200 bg-white open:border-pitch-200 open:bg-pitch-50/30">
        <summary class="flex cursor-pointer list-none items-center gap-3 p-3 sm:px-4">
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-zinc-900">{{ sec.title }}</span>
            <span class="block text-xs text-zinc-500">{{ sec.hint }}</span>
          </span>
          <ChevronDown class="size-4 shrink-0 text-zinc-400 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <fieldset :disabled="disabled" class="space-y-4 border-t border-zinc-100 p-3 sm:p-4">
          <legend class="sr-only">{{ sec.title }}</legend>
          <template v-if="sec.key === 'general'">
            <ImageUploader v-model:draft="draftLogo" shape="square" :size="512" :current-url="initial?.logoUrl" title="Logo del torneo" :upload="uploadLogo" :remove="removeLogo" :disabled="disabled">
              <template #fallback><Trophy class="size-10 text-pitch-500" aria-hidden="true" /></template>
            </ImageUploader>
            <TournamentInformationFields v-model="information" v-model:registration="registration" section="general" :league-city="leagues.find((l) => l.id === league)?.city" />
          </template>
          <TournamentInformationFields v-else v-model="information" v-model:registration="registration" :section="sec.key" />
        </fieldset>
      </details>
    </div>
    <template v-else>
      <fieldset v-for="(sec, i) in OPTIONAL_SECTIONS.slice(1)" :key="sec.key" :disabled="disabled" class="space-y-4">
        <legend class="mb-3 text-base font-bold text-zinc-900">{{ i + 4 }}. {{ sec.title }}</legend>
        <TournamentInformationFields v-model="information" v-model:registration="registration" :section="sec.key" />
      </fieldset>
    </template>

    <div v-if="informationErrors.length" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
      <p class="font-semibold">Revisa la información del torneo:</p>
      <ul class="mt-1 list-inside list-disc"><li v-for="message in informationErrors" :key="message">{{ message }}</li></ul>
    </div>
  </form>
</template>
