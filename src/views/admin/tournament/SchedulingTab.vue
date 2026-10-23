<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, Building2, CalendarCheck2, CheckCircle2, Clock, Pencil, Save, Server, Users } from 'lucide-vue-next'
import type { SchedulingConflicts, SchedulingOverview, SoftRule, Venue } from '@/types'
import { getErrorMessage, SCHEDULING_REQUIRES_SERVER, schedulingService, USE_MOCKS, venueService, type SchedulingRulesInput } from '@/services'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useToast } from '@/composables/useToast'
import { SOFT_RULE_OPTIONS, teamRulesSummary, TIME_ZONES, timeZoneLabel, tournamentRulesSummary, WEEKDAY_SHORT } from '@/utils/scheduling'
import { formatDate, plural, toISODate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import WeekdayPicker from '@/components/admin/scheduling/WeekdayPicker.vue'
import ConstraintIssuesList from '@/components/admin/scheduling/ConstraintIssuesList.vue'
import TeamConstraintsDialog from '@/components/admin/scheduling/TeamConstraintsDialog.vue'

/**
 * Restricciones de calendario (6A): días y horario, límites, canchas y equipos. El servidor las
 * aplica al programar, reprogramar y generar partidos. Guardarlas nunca modifica partidos: los
 * programados que queden en conflicto se muestran aquí.
 */
const props = defineProps<{ id: string }>()
const { readOnly: finished, can, role } = useTournamentWorkspace(() => props.id)
const toast = useToast()
const readOnly = computed(() => finished.value || !can('SCHEDULE'))

const data = ref<SchedulingOverview | null>(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const venues = ref<Venue[] | null>(null)
const teamDialog = ref<SchedulingOverview['teams'][number] | null>(null)

const form = reactive({ days: [] as number[], startTime: '', endTime: '', duration: '' as string | number, fieldGap: '' as string | number, maxPerDay: '' as string | number, maxSimultaneous: '' as string | number, fieldAvailability: 'WARN' as 'WARN' | 'BLOCK', timeZone: '', softRules: [] as SoftRule[] })
function fill(o: SchedulingOverview) {
  const r = o.rules
  Object.assign(form, {
    days: [...r.days],
    startTime: r.startTime ?? '',
    // `24:00` (medianoche) se muestra como 00:00 en el selector de hora.
    endTime: r.endTime === '24:00' ? '00:00' : (r.endTime ?? ''),
    duration: o.durationConfigured ? o.durationMinutes : '',
    fieldGap: r.fieldGapMinutes ?? '',
    maxPerDay: r.maxMatchesPerDay ?? '',
    maxSimultaneous: r.maxSimultaneous ?? '',
    fieldAvailability: r.fieldAvailability,
    timeZone: r.timeZone ?? '',
    softRules: [...(r.softRules ?? [])],
  })
}
async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = ''
  try {
    data.value = await schedulingService.overview(props.id)
    fill(data.value)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
  // Canchas del propietario: solo quien asigna canchas las consulta (RBAC del servidor).
  if (can('ASSIGNMENTS')) venueService.forTournament(props.id).then((v) => (venues.value = v)).catch(() => (venues.value = []))
}
watch(() => props.id, load, { immediate: true })

const num = (v: string | number) => (String(v).trim() === '' ? null : Number(v))
const input = computed<SchedulingRulesInput>(() => ({
  days: [...form.days].sort((a, b) => a - b),
  startTime: form.startTime || null,
  endTime: form.endTime === '00:00' ? '24:00' : form.endTime || null,
  // Sin duración propia se conserva la de por defecto (no se envía).
  ...(num(form.duration) !== null || data.value?.durationConfigured ? { durationMinutes: num(form.duration) } : {}),
  fieldGapMinutes: num(form.fieldGap),
  maxMatchesPerDay: num(form.maxPerDay),
  maxSimultaneous: num(form.maxSimultaneous),
  fieldAvailability: form.fieldAvailability,
  timeZone: form.timeZone || null,
  softRules: [...form.softRules].sort(),
}))
const duration = computed(() => num(form.duration) ?? 60)
const dirty = computed(() => {
  const o = data.value
  if (!o) return false
  const r = o.rules
  const i = input.value
  return (
    JSON.stringify([i.days, i.startTime, i.endTime, i.fieldGapMinutes, i.maxMatchesPerDay, i.maxSimultaneous, i.fieldAvailability, i.timeZone, i.softRules]) !==
      JSON.stringify([r.days, r.startTime, r.endTime, r.fieldGapMinutes, r.maxMatchesPerDay, r.maxSimultaneous, r.fieldAvailability, r.timeZone, [...(r.softRules ?? [])].sort()]) ||
    (i.durationMinutes !== undefined && (i.durationMinutes ?? 60) !== o.durationMinutes) ||
    (o.durationConfigured && i.durationMinutes === null)
  )
})
/** Las mismas reglas que valida el servidor, para avisar antes de guardar. */
const formError = computed(() => {
  const { startTime, endTime } = input.value
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  const d = num(form.duration)
  if (d !== null && (d < 10 || d > 300)) return 'La duración debe estar entre 10 y 300 minutos.'
  if (startTime && endTime) {
    if (toMin(endTime) <= toMin(startTime)) return 'El horario debe terminar después de empezar (00:00 al final = medianoche).'
    if (toMin(endTime) - toMin(startTime) < duration.value) return `Un partido de ${duration.value} min no cabe entre las ${startTime} y las ${form.endTime}.`
  }
  return ''
})

// Vista previa: qué partidos programados quedarían en conflicto con lo que se está editando.
const preview = ref<SchedulingConflicts | null>(null)
const previewError = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0
watch(
  input,
  (i) => {
    clearTimeout(timer)
    preview.value = null
    previewError.value = ''
    if (!dirty.value || formError.value || readOnly.value) return
    const id = ++seq
    timer = setTimeout(async () => {
      try {
        const res = await schedulingService.preview(props.id, { tournament: i })
        if (id === seq) preview.value = res.conflicts
      } catch (e) {
        if (id === seq) previewError.value = getErrorMessage(e)
      }
    }, 400)
  },
  { deep: true },
)

async function save() {
  if (formError.value) return
  saving.value = true
  try {
    data.value = await schedulingService.update(props.id, input.value)
    fill(data.value)
    const n = data.value.conflicts.matches.filter((m) => m.errors.length).length
    toast.success(n ? `Restricciones guardadas. ${plural(n, 'partido programado queda', 'partidos programados quedan')} en conflicto: revísalos.` : 'Restricciones guardadas.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
function discard() {
  if (data.value) fill(data.value)
}

// ─── Presentación ───────────────────────────────────────────────────────────
const summary = computed(() => (data.value ? tournamentRulesSummary(data.value.rules, data.value.durationMinutes) : []))
const activeTeams = computed(() => (data.value?.teams ?? []).filter((t) => !t.withdrawn))
const conflicts = computed(() => data.value?.conflicts.matches ?? [])
const blocking = computed(() => conflicts.value.filter((m) => m.errors.length).length)
const teamNames = computed(() => Object.fromEntries((data.value?.teams ?? []).map((t) => [t.teamId, t.name])))
const fieldHours = (f: Venue['fields'][number]) =>
  f.availability.weekly.length ? f.availability.weekly.map((w) => `${WEEKDAY_SHORT[w.day]} ${w.from}–${w.to}`).join(' · ') : 'Sin restricción de horario'
const updated = computed(() => (data.value?.updatedAt ? `Actualizadas el ${formatDate(toISODate(new Date(data.value.updatedAt)))}${data.value.updatedBy ? ` por ${data.value.updatedBy}` : ''}` : 'Sin configurar todavía'))
</script>

<template>
  <div>
    <div class="mb-4">
      <h2 class="text-xl font-bold">Restricciones de calendario</h2>
      <p class="text-sm text-zinc-500">Días, horarios y límites que deben respetar los partidos al programarlos, moverlos o generar el calendario.</p>
    </div>

    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${SCHEDULING_REQUIRES_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else-if="data" class="space-y-6">
      <p v-if="readOnly" class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" role="status">
        {{ finished ? 'El torneo está finalizado: sus restricciones se consultan, pero ya no se modifican.' : 'Tu rol permite consultar las restricciones, no modificarlas.' }}
      </p>

      <!-- Conflictos de lo ya programado -->
      <section aria-labelledby="sch-conflicts" class="card p-4">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <h3 id="sch-conflicts" class="font-bold text-zinc-900">Partidos programados</h3>
          <StatusBadge v-if="blocking" :label="plural(blocking, 'en conflicto', 'en conflicto')" tone="red" />
          <StatusBadge v-else-if="conflicts.length" :label="plural(conflicts.length, 'con aviso', 'con aviso')" tone="amber" />
        </div>
        <p class="mb-3 text-xs text-zinc-500">
          Se revisan los {{ plural(data.conflicts.checked, 'partido programado', 'partidos programados') }} desde hoy ({{ formatDate(data.conflicts.today) }}, {{ timeZoneLabel(data.effectiveTimeZone) }}).
          Lo jugado no se revisa y nada se cambia solo: si alguno incumple, reprográmalo desde el calendario.
        </p>
        <ConstraintIssuesList v-if="conflicts.length" :issues="conflicts" :tournament-id="id" :team-names="teamNames" :limit="10" />
        <p v-else class="flex items-center gap-2 text-sm text-pitch-800"><CheckCircle2 class="size-4" aria-hidden="true" /> Ningún partido programado incumple las restricciones.</p>
        <RouterLink v-if="conflicts.length" :to="{ name: 'admin-tournament-schedule', params: { id } }" class="link mt-3 inline-block text-sm">Ir al calendario</RouterLink>
      </section>

      <!-- Torneo -->
      <section aria-labelledby="sch-tournament" class="card p-4">
        <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 id="sch-tournament" class="flex items-center gap-2 font-bold text-zinc-900"><CalendarCheck2 class="size-4 text-pitch-700" aria-hidden="true" /> Días y horarios del torneo</h3>
          <span class="text-xs text-zinc-500">{{ updated }}</span>
        </div>
        <p class="mb-4 text-xs text-zinc-500">{{ summary.join(' · ') }}. Son obligatorias, salvo las que marques como preferencia: esas solo avisan.</p>

        <form class="space-y-5" @submit.prevent="save">
          <fieldset :disabled="readOnly || saving" class="space-y-5">
            <WeekdayPicker v-model="form.days" legend="Días en que se programan partidos (ninguno = cualquier día)" />
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FormField id="sch-start" label="Primer inicio">
                <input id="sch-start" v-model="form.startTime" type="time" class="input" />
              </FormField>
              <FormField id="sch-end" label="Terminar antes de" hint="00:00 = medianoche">
                <input id="sch-end" v-model="form.endTime" type="time" class="input" />
              </FormField>
              <FormField id="sch-duration" label="Duración (min)" :hint="data.durationConfigured ? undefined : 'Por defecto, 60'">
                <input id="sch-duration" v-model="form.duration" type="number" min="10" max="300" step="5" inputmode="numeric" class="input" placeholder="60" />
              </FormField>
              <FormField id="sch-gap" label="Entre partidos en una cancha (min)" hint="Además del margen de la sede">
                <input id="sch-gap" v-model="form.fieldGap" type="number" min="0" max="240" step="5" inputmode="numeric" class="input" placeholder="Sin mínimo" />
              </FormField>
              <FormField id="sch-max-day" label="Máximo de partidos por día">
                <input id="sch-max-day" v-model="form.maxPerDay" type="number" min="1" max="50" step="1" inputmode="numeric" class="input" placeholder="Sin máximo" />
              </FormField>
              <FormField id="sch-max-sim" label="Máximo a la vez">
                <input id="sch-max-sim" v-model="form.maxSimultaneous" type="number" min="1" max="30" step="1" inputmode="numeric" class="input" placeholder="Sin máximo" />
              </FormField>
              <FormField id="sch-tz" label="Zona horaria" class="col-span-2">
                <select id="sch-tz" v-model="form.timeZone" class="input">
                  <option value="">La de las ligas ({{ timeZoneLabel('America/Cancun') }})</option>
                  <option v-for="z in TIME_ZONES" :key="z.value" :value="z.value">{{ z.label }}</option>
                  <option v-if="form.timeZone && !TIME_ZONES.some((z) => z.value === form.timeZone)" :value="form.timeZone">{{ form.timeZone }}</option>
                </select>
              </FormField>
            </div>
            <fieldset>
              <legend class="mb-1 text-sm font-medium text-zinc-700">Solo como preferencia</legend>
              <p class="mb-2 text-xs text-zinc-500">
                Marcadas, avisan pero no impiden programar; al generar el calendario se intentan cumplir. La separación entre partidos en una cancha y el máximo a la vez siempre son obligatorios.
              </p>
              <div class="flex flex-wrap gap-2">
                <label v-for="o in SOFT_RULE_OPTIONS" :key="o.value" class="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                  <input v-model="form.softRules" type="checkbox" :value="o.value" class="size-4 accent-amber-600" />
                  {{ o.label }}
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend class="mb-2 text-sm font-medium text-zinc-700">Disponibilidad de las canchas (Sedes)</legend>
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50">
                  <input v-model="form.fieldAvailability" type="radio" value="WARN" class="mt-0.5 accent-pitch-700" />
                  <span><strong class="block text-zinc-900">Solo avisar</strong><span class="text-zinc-600">Fuera del horario de la cancha se avisa y se puede guardar.</span></span>
                </label>
                <label class="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50">
                  <input v-model="form.fieldAvailability" type="radio" value="BLOCK" class="mt-0.5 accent-pitch-700" />
                  <span><strong class="block text-zinc-900">Obligatoria</strong><span class="text-zinc-600">No se programa fuera del horario o en días cerrados de la cancha.</span></span>
                </label>
              </div>
            </fieldset>
          </fieldset>

          <p v-if="formError" class="text-sm font-medium text-red-600" role="alert">{{ formError }}</p>
          <div v-if="dirty && !formError" class="rounded-xl border px-3 py-2.5 text-sm" :class="preview?.matches.some((m) => m.errors.length) ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-zinc-50'" aria-live="polite">
            <p v-if="previewError" class="text-red-700">{{ previewError }}</p>
            <template v-else-if="preview">
              <p v-if="!preview.matches.length" class="text-zinc-600">Con estos cambios, ningún partido programado queda en conflicto.</p>
              <template v-else>
                <p class="mb-2 font-semibold text-amber-900">
                  Con estos cambios, {{ plural(preview.matches.length, 'partido programado quedaría', 'partidos programados quedarían') }} en conflicto. Se puede guardar: no se modifican, solo se señalan.
                </p>
                <ConstraintIssuesList :issues="preview.matches" :tournament-id="id" :team-names="teamNames" :limit="5" />
              </template>
            </template>
            <p v-else class="text-zinc-500">Revisando los partidos programados…</p>
          </div>

          <div v-if="!readOnly" class="flex flex-wrap justify-end gap-2">
            <AppButton v-if="dirty" variant="ghost" :disabled="saving" @click="discard">Descartar</AppButton>
            <AppButton type="submit" :loading="saving" :disabled="!dirty || !!formError"><Save class="size-4" aria-hidden="true" /> Guardar restricciones</AppButton>
          </div>
        </form>
      </section>

      <!-- Equipos -->
      <section aria-labelledby="sch-teams">
        <h3 id="sch-teams" class="mb-1 flex items-center gap-2 font-bold text-zinc-900"><Users class="size-4 text-pitch-700" aria-hidden="true" /> Por equipo</h3>
        <p class="mb-3 text-xs text-zinc-500">Solo en este torneo: si el equipo juega otros torneos, allí no aplican. Cada equipo puede ser obligatoria o preferencia.</p>
        <ul v-if="activeTeams.length" class="card divide-y divide-zinc-100">
          <li v-for="t in activeTeams" :key="t.teamId" class="flex flex-wrap items-center gap-3 p-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate font-semibold text-zinc-900">{{ t.name }}</p>
                <StatusBadge v-if="t.configured && !t.rules.strict" label="Preferencia" tone="amber" />
              </div>
              <div v-if="teamRulesSummary(t.rules).length" class="mt-1 flex flex-wrap gap-1">
                <span v-for="c in teamRulesSummary(t.rules)" :key="c" class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">{{ c }}</span>
              </div>
              <p v-else class="text-xs text-zinc-500">Sin restricciones</p>
              <p v-if="t.rules.notes" class="mt-1 text-xs text-zinc-500">{{ t.rules.notes }}</p>
            </div>
            <AppButton v-if="!readOnly" variant="ghost" size="sm" @click="teamDialog = t">
              <Pencil class="size-3.5" aria-hidden="true" /> {{ t.configured ? 'Editar' : 'Configurar' }}
            </AppButton>
          </li>
        </ul>
        <EmptyState v-else :icon="Users" title="Sin equipos inscritos" description="Inscribe equipos para configurar sus restricciones." compact class="card" />
      </section>

      <!-- Canchas -->
      <section aria-labelledby="sch-fields">
        <h3 id="sch-fields" class="mb-1 flex items-center gap-2 font-bold text-zinc-900"><Building2 class="size-4 text-pitch-700" aria-hidden="true" /> Canchas</h3>
        <p class="mb-3 text-xs text-zinc-500">
          El horario de cada cancha y sus días cerrados se configuran en Sedes y valen para todos los torneos.
          Aquí decides si en este torneo son {{ data.rules.fieldAvailability === 'BLOCK' ? 'obligatorios (así está ahora)' : 'solo un aviso (así está ahora)' }}. Dos partidos nunca se cruzan en la misma cancha, de ningún torneo.
        </p>
        <p v-if="!can('ASSIGNMENTS')" class="card p-3 text-sm text-zinc-500">Tu rol no asigna canchas: no puedes consultar el catálogo de sedes.</p>
        <LoadingState v-else-if="venues === null" />
        <ul v-else-if="venues.length" class="space-y-2">
          <li v-for="v in venues" :key="v.id" class="card p-3">
            <p class="font-semibold text-zinc-900">{{ v.name }} <span class="text-xs font-normal text-zinc-500">· <Clock class="inline size-3" aria-hidden="true" /> {{ v.bufferMinutes }} min de margen</span></p>
            <ul class="mt-1 space-y-0.5 text-sm">
              <li v-for="f in v.fields" :key="f.id" class="flex flex-wrap gap-x-2 text-zinc-700">
                <span class="font-medium">{{ f.name }}</span>
                <span class="text-zinc-500">{{ fieldHours(f) }}</span>
                <span v-if="f.availability.closedDates.length" class="text-zinc-500">· {{ plural(f.availability.closedDates.length, 'día cerrado', 'días cerrados') }}</span>
                <StatusBadge v-if="!(v.active && f.active)" label="Desactivada" tone="neutral" />
              </li>
            </ul>
          </li>
        </ul>
        <EmptyState v-else :icon="Building2" title="Sin sedes registradas" description="Registra sedes y canchas para asignarlas a los partidos y evitar choques de horario." compact class="card">
          <AppButton v-if="role === 'OWNER'" :to="{ name: 'admin-venues' }" variant="secondary" size="sm">Ir a Sedes</AppButton>
        </EmptyState>
        <p v-if="role === 'OWNER' && venues?.length" class="mt-2 text-xs"><RouterLink :to="{ name: 'admin-venues' }" class="link">Editar horarios en Sedes</RouterLink></p>
      </section>

      <p class="flex items-start gap-2 text-xs text-zinc-500">
        <AlertTriangle class="mt-px size-3.5 shrink-0" aria-hidden="true" />
        El generador automático no elige fechas según estas restricciones: si su calendario incumple alguna obligatoria, no se crea y te dice qué partidos fallan, para que ajustes la fecha de inicio, la hora o las restricciones.
      </p>
    </div>

    <TeamConstraintsDialog :open="!!teamDialog" :tournament-id="id" :team="teamDialog" @close="teamDialog = null" @saved="(o) => ((data = o), fill(o))" />
  </div>
</template>
