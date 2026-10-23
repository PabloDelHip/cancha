<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Trash2, X } from 'lucide-vue-next'
import type { SchedulingConflicts, SchedulingOverview, TeamSchedulingRules } from '@/types'
import { getErrorMessage, schedulingService } from '@/services'
import { useToast } from '@/composables/useToast'
import { emptyTeamRules, WEEK_ORDER, WEEKDAY_LONG } from '@/utils/scheduling'
import { formatDate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import FormField from '@/components/common/FormField.vue'
import WeekdayPicker from './WeekdayPicker.vue'
import ConstraintIssuesList from './ConstraintIssuesList.vue'

/**
 * Restricciones de un equipo en ESTE torneo (no afectan otros torneos en los que juegue). Antes de
 * guardar se revisa qué partidos ya programados quedarían en conflicto (no se modifican).
 */
const props = defineProps<{ open: boolean; tournamentId: string; team: { teamId: string; name: string; rules: TeamSchedulingRules } | null }>()
const emit = defineEmits<{ close: []; saved: [overview: SchedulingOverview] }>()
const toast = useToast()

const form = reactive({ ...emptyTeamRules(), unavailableTimes: [] as { day: number | null; from: string; to: string }[], rest: '' as string | number, maxPerDay: '' as string | number })
const newDate = ref('')
const saving = ref(false)
const preview = ref<SchedulingConflicts | null>(null)
const previewError = ref('')

watch(
  () => [props.open, props.team] as const,
  ([open, team]) => {
    if (!open || !team) return
    const r = team.rules
    Object.assign(form, {
      ...r,
      unavailableDays: [...r.unavailableDays],
      unavailableDates: [...r.unavailableDates],
      // `24:00` se muestra como 00:00 (medianoche) en el selector de hora.
      unavailableTimes: r.unavailableTimes.map((t) => ({ ...t, to: t.to === '24:00' ? '00:00' : t.to })),
      rest: r.minRestHours ?? '',
      maxPerDay: r.maxMatchesPerDay ?? '',
    })
    newDate.value = ''
    preview.value = null
  },
  { immediate: true },
)

const num = (v: string | number) => (String(v).trim() === '' ? null : Number(v))
const rules = computed<TeamSchedulingRules>(() => ({
  unavailableDays: [...form.unavailableDays],
  unavailableDates: [...form.unavailableDates].sort(),
  unavailableTimes: form.unavailableTimes.map((t) => ({ day: t.day, from: t.from, to: t.to === '00:00' ? '24:00' : t.to })),
  minRestHours: num(form.rest),
  maxMatchesPerDay: num(form.maxPerDay),
  strict: form.strict,
  notes: form.notes?.trim() || null,
}))
const rangeError = computed(() => rules.value.unavailableTimes.some((t) => !t.from || !t.to || t.to <= t.from) ? 'Cada rango debe terminar después de empezar (00:00 al final = medianoche).' : '')

function addDate() {
  if (newDate.value && !form.unavailableDates.includes(newDate.value)) form.unavailableDates.push(newDate.value)
  newDate.value = ''
}
const addRange = () => form.unavailableTimes.push({ day: null, from: '14:00', to: '18:00' })

// Vista previa (con pausa) de los partidos programados que quedarían en conflicto.
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0
watch(
  rules,
  (r) => {
    clearTimeout(timer)
    previewError.value = ''
    if (!props.open || !props.team || rangeError.value) return
    const id = ++seq
    timer = setTimeout(async () => {
      try {
        const res = await schedulingService.preview(props.tournamentId, { team: { teamId: props.team!.teamId, rules: r } })
        if (id === seq) preview.value = res.conflicts
      } catch (e) {
        if (id === seq) previewError.value = getErrorMessage(e)
      }
    }, 350)
  },
  { deep: true },
)
const affected = computed(() => (preview.value?.matches ?? []).filter((m) => [m.homeTeamId, m.awayTeamId].includes(props.team?.teamId ?? '')))

async function save(next = rules.value) {
  if (!props.team || rangeError.value) return
  saving.value = true
  try {
    emit('saved', await schedulingService.updateTeam(props.tournamentId, props.team.teamId, next))
    toast.success(`Restricciones de ${props.team.name} guardadas.`)
    emit('close')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" :title="team ? `Restricciones de ${team.name}` : 'Restricciones'" description="Solo en este torneo. Lo ya programado no se modifica: se te avisa si queda en conflicto." size="lg" @close="saving || emit('close')">
    <form v-if="team" id="team-constraints" class="space-y-5" @submit.prevent="save()">
      <fieldset>
        <legend class="mb-2 text-sm font-medium text-zinc-700">Tipo de restricción</legend>
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50">
            <input v-model="form.strict" type="radio" :value="true" class="mt-0.5 accent-pitch-700" />
            <span><strong class="block text-zinc-900">Obligatoria</strong><span class="text-zinc-600">No se puede programar un partido que la incumpla.</span></span>
          </label>
          <label class="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
            <input v-model="form.strict" type="radio" :value="false" class="mt-0.5 accent-amber-600" />
            <span><strong class="block text-zinc-900">Preferencia</strong><span class="text-zinc-600">Se avisa, pero se puede programar.</span></span>
          </label>
        </div>
      </fieldset>

      <WeekdayPicker v-model="form.unavailableDays" legend="Días en que no puede jugar" tone="red" />

      <div>
        <p class="mb-2 text-sm font-medium text-zinc-700">Fechas en que no puede jugar</p>
        <div class="flex gap-2">
          <label for="tc-date" class="sr-only">Fecha</label>
          <input id="tc-date" v-model="newDate" type="date" class="input max-w-48" @keydown.enter.prevent="addDate" />
          <AppButton variant="secondary" :disabled="!newDate" @click="addDate"><Plus class="size-4" aria-hidden="true" /> Agregar</AppButton>
        </div>
        <ul v-if="form.unavailableDates.length" class="mt-2 flex flex-wrap gap-1.5">
          <li v-for="d in [...form.unavailableDates].sort()" :key="d" class="inline-flex items-center gap-1 rounded-full bg-red-50 py-1 pr-1 pl-3 text-xs font-semibold text-red-800">
            {{ formatDate(d) }}
            <button type="button" class="grid size-5 place-items-center rounded-full hover:bg-red-100" :aria-label="`Quitar ${formatDate(d)}`" @click="form.unavailableDates = form.unavailableDates.filter((x) => x !== d)">
              <X class="size-3" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-zinc-700">Horarios en que no puede jugar</p>
          <AppButton variant="ghost" size="sm" @click="addRange"><Plus class="size-3.5" aria-hidden="true" /> Rango</AppButton>
        </div>
        <ul v-if="form.unavailableTimes.length" class="space-y-2">
          <li v-for="(t, i) in form.unavailableTimes" :key="i" class="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-zinc-200 p-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
            <div class="col-span-2 sm:col-span-1">
              <label :for="`tc-day-${i}`" class="mb-1 block text-xs text-zinc-500">Día</label>
              <select :id="`tc-day-${i}`" v-model="t.day" class="input">
                <option :value="null">Todos los días</option>
                <option v-for="d in WEEK_ORDER" :key="d" :value="d">{{ WEEKDAY_LONG[d] }}</option>
              </select>
            </div>
            <div class="col-span-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:contents">
              <div>
                <label :for="`tc-from-${i}`" class="mb-1 block text-xs text-zinc-500">Desde</label>
                <input :id="`tc-from-${i}`" v-model="t.from" type="time" class="input" />
              </div>
              <div>
                <label :for="`tc-to-${i}`" class="mb-1 block text-xs text-zinc-500">Hasta</label>
                <input :id="`tc-to-${i}`" v-model="t.to" type="time" class="input" />
              </div>
              <AppButton variant="ghost" class="text-red-700" :aria-label="`Quitar rango ${i + 1}`" @click="form.unavailableTimes.splice(i, 1)"><Trash2 class="size-4" aria-hidden="true" /></AppButton>
            </div>
          </li>
        </ul>
        <p v-else class="text-xs text-zinc-500">Sin horarios bloqueados.</p>
        <p v-if="rangeError" class="mt-1 text-xs font-medium text-red-600">{{ rangeError }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField id="tc-rest" label="Descanso mínimo entre partidos (horas)" hint="Del final de un partido al inicio del siguiente.">
          <input id="tc-rest" v-model="form.rest" type="number" min="0" max="336" step="1" inputmode="numeric" class="input" placeholder="Sin mínimo" />
        </FormField>
        <FormField id="tc-max" label="Máximo de partidos por día">
          <input id="tc-max" v-model="form.maxPerDay" type="number" min="1" max="10" step="1" inputmode="numeric" class="input" placeholder="Sin máximo" />
        </FormField>
      </div>
      <FormField id="tc-notes" label="Notas (internas)">
        <textarea id="tc-notes" v-model="form.notes" rows="2" maxlength="300" class="input h-auto py-2" placeholder="Ej. sus jugadores trabajan los sábados por la mañana" />
      </FormField>

      <div class="rounded-xl border px-3 py-2.5 text-sm" :class="affected.length ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-zinc-50'" aria-live="polite">
        <p v-if="previewError" class="text-red-700">{{ previewError }}</p>
        <template v-else-if="preview">
          <p v-if="!affected.length" class="text-zinc-600">Ningún partido programado de {{ team.name }} quedaría en conflicto.</p>
          <template v-else>
            <p class="mb-2 font-semibold text-amber-900">{{ affected.length === 1 ? '1 partido programado quedaría' : `${affected.length} partidos programados quedarían` }} en conflicto (no se modifica{{ affected.length === 1 ? '' : 'n' }}):</p>
            <ConstraintIssuesList :issues="affected" :tournament-id="tournamentId" :limit="5" />
          </template>
        </template>
        <p v-else class="text-zinc-500">Al cambiar algo verás aquí si choca con lo ya programado.</p>
      </div>
    </form>
    <template #footer>
      <AppButton variant="ghost" class="mr-auto text-red-700" :disabled="saving" @click="save(emptyTeamRules())">Quitar restricciones</AppButton>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="team-constraints" :loading="saving" :disabled="!!rangeError">Guardar</AppButton>
    </template>
  </BaseModal>
</template>
