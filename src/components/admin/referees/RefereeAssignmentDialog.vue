<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, Ban, Undo2, UserMinus, UserX } from 'lucide-vue-next'
import type { Match, MatchReferees, RefereeAssignment, RefereeContact, RefereeOption, RefereeRole } from '@/types'
import { getErrorMessage, refereeService } from '@/services'
import { useTeamsStore, useTournamentsStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import { REFEREE_ROLE, REFEREE_ROLES } from '@/utils/labels'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import LoadingState from '@/components/common/LoadingState.vue'

/**
 * Árbitros de un partido: asignar por rol, quitar (si no tiene historia) y registrar ausencias con
 * su sustituto. El servidor rechaza a quien ya arbitra otro partido a esa hora en cualquier torneo;
 * aquí se muestra antes de elegir. La disponibilidad solo avisa.
 *
 * Correcciones (2C-2, permiso REFEREE_CORRECTIONS): anular una ausencia (sí se presentó) o una
 * sustitución mal registrada, siempre con motivo. Nada se borra: lo corregido queda anulado.
 */
const props = defineProps<{ open: boolean; match: Match | null; readOnly?: boolean; canCorrect?: boolean }>()
const emit = defineEmits<{ close: []; changed: [value: MatchReferees] }>()
const teams = useTeamsStore()
const toast = useToast()

const state = ref<MatchReferees | null>(null)
/** Teléfono y correo de los árbitros del propietario: solo ADMIN/COORDINATOR (RBAC R3). */
const contacts = ref(new Map<string, RefereeContact>())
const tournamentsStore = useTournamentsStore()
const options = ref<RefereeOption[]>([])
const loading = ref(false)
const busy = ref(false)
const form = reactive<{ role: RefereeRole | ''; refereeId: string }>({ role: '', refereeId: '' })
const absence = reactive<{ id: string | null; substituteId: string; note: string }>({ id: null, substituteId: '', note: '' })
/** Corrección abierta: `restore` = sí se presentó; `substitute` = el sustituto correcto es otro; `none` = nadie lo sustituyó. */
const correction = reactive<{ id: string | null; mode: 'restore' | 'substitute' | 'none'; substituteId: string; reason: string }>({ id: null, mode: 'restore', substituteId: '', reason: '' })

async function load() {
  if (!props.match) return
  loading.value = true
  try {
    const canContact = tournamentsStore.can(props.match.tournamentId, 'REFEREE_CONTACT')
    const [s, o, c] = await Promise.all([
      refereeService.ofMatch(props.match.id),
      props.readOnly ? Promise.resolve([]) : refereeService.options(props.match.id),
      canContact ? refereeService.contacts(props.match.tournamentId).catch(() => []) : Promise.resolve([]),
    ])
    state.value = s
    options.value = o
    contacts.value = new Map(c.map((x) => [x.id, x]))
    form.role = freeRoles.value[0]?.value ?? ''
    form.refereeId = ''
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    loading.value = false
  }
}
watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(absence, { id: null, substituteId: '', note: '' })
      correction.id = null
      void load()
    }
  },
)

const active = computed(() => state.value?.referees.filter((a) => a.status === 'assigned') ?? [])
const absent = computed(() => state.value?.referees.filter((a) => a.status === 'absent') ?? [])
const freeRoles = computed(() => REFEREE_ROLES.filter((r) => !active.value.some((a) => a.role === r.value)))
const inMatch = computed(() => new Set(active.value.map((a) => a.refereeId)))
const available = computed(() => options.value.filter((o) => !inMatch.value.has(o.id)))
const chosen = computed(() => options.value.find((o) => o.id === form.refereeId))
const chosenSubstitute = computed(() => options.value.find((o) => o.id === absence.substituteId))
const substituteOf = (a: RefereeAssignment) => state.value?.referees.find((x) => x.substituteFor === a.id && (x.status === 'assigned' || x.status === 'absent'))
/** Anuladas y liberadas: se conservan como historial del partido. */
const closed = computed(() => state.value?.referees.filter((a) => a.status === 'void' || a.status === 'released') ?? [])
const nameOf = (id: string | null) => state.value?.referees.find((x) => x.id === id)?.name ?? 'el árbitro'
function openCorrection(a: RefereeAssignment) {
  Object.assign(correction, { id: a.id, mode: a.status === 'absent' ? 'restore' : 'substitute', substituteId: '', reason: '' })
}
function correct() {
  const id = correction.id
  if (!id) return
  if (correction.reason.trim().length < 3) return toast.error('Indica el motivo de la corrección (queda en el historial).')
  if (correction.mode === 'substitute' && !correction.substituteId) return toast.error('Elige al sustituto correcto.')
  const substituteId = correction.mode === 'substitute' ? correction.substituteId : null
  void run(() => refereeService.correct(props.match!.id, id, { reason: correction.reason.trim(), substituteId }), 'Corrección registrada.').then(() => {
    correction.id = null
  })
}
const title = computed(() => (props.match ? `${teams.get(props.match.homeTeamId)?.name ?? 'Local'} vs ${teams.get(props.match.awayTeamId)?.name ?? 'Visitante'}` : 'Árbitros'))

async function run(fn: () => Promise<MatchReferees>, done: string) {
  busy.value = true
  try {
    state.value = await fn()
    emit('changed', state.value)
    if (state.value.warnings.length) toast.info(`${done} Aviso: ${state.value.warnings.join(' ')}`)
    else toast.success(done)
    await load()
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}
const assign = () => form.role && form.refereeId && run(() => refereeService.assign(props.match!.id, form.refereeId, form.role as RefereeRole), 'Árbitro asignado.')
const unassign = (a: RefereeAssignment) => run(() => refereeService.unassign(props.match!.id, a.id), 'Asignación quitada.')
function markAbsent() {
  const id = absence.id
  if (!id) return
  void run(() => refereeService.absence(props.match!.id, id, { substituteId: absence.substituteId || null, note: absence.note.trim() || null }), 'Ausencia registrada.').then(() => {
    absence.id = null
  })
}
</script>

<template>
  <BaseModal :open="open" title="Árbitros del partido" :description="match ? `${title} · ${formatDate(match.date)} ${match.time}` : undefined" size="lg" @close="busy || emit('close')">
    <LoadingState v-if="loading && !state" />
    <div v-else class="space-y-5">
      <section aria-labelledby="ref-assigned">
        <h3 id="ref-assigned" class="mb-2 text-sm font-semibold text-zinc-900">Asignados</h3>
        <p v-if="!active.length" class="text-sm text-zinc-500">Todavía no hay árbitros asignados.</p>
        <ul class="divide-y divide-zinc-100">
          <li v-for="a in active" :key="a.id" class="py-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="w-28 shrink-0 text-xs font-semibold text-zinc-500 uppercase">{{ REFEREE_ROLE[a.role] }}</span>
              <span class="font-semibold text-zinc-900">{{ a.name ?? 'Árbitro' }}</span>
              <span v-if="a.substituteFor" class="text-xs text-zinc-500">(sustituto)</span>
              <a v-if="contacts.get(a.refereeId)?.phone" :href="`tel:${contacts.get(a.refereeId)!.phone}`" class="link text-xs">{{ contacts.get(a.refereeId)!.phone }}</a>
              <span v-if="!readOnly" class="ml-auto flex gap-1">
                <AppButton variant="ghost" size="sm" :disabled="busy" @click="Object.assign(absence, { id: a.id, substituteId: '', note: '' })">
                  <UserX class="size-4" aria-hidden="true" /> No se presentó
                </AppButton>
                <AppButton v-if="!a.substituteFor" variant="ghost" size="sm" class="text-red-700" :disabled="busy" :aria-label="`Quitar a ${a.name}`" @click="unassign(a)">
                  <UserMinus class="size-4" aria-hidden="true" />
                </AppButton>
                <AppButton v-if="a.substituteFor && canCorrect" variant="ghost" size="sm" :disabled="busy" title="La sustitución se registró mal" @click="openCorrection(a)">
                  <Undo2 class="size-4" aria-hidden="true" /> Corregir
                </AppButton>
              </span>
            </div>
            <form v-if="absence.id === a.id" class="mt-2 grid grid-cols-1 gap-3 rounded-xl bg-zinc-50 p-3 sm:grid-cols-2" @submit.prevent="markAbsent">
              <FormField :id="`abs-sub-${a.id}`" label="Sustituto" hint="Opcional, mismo rol">
                <select :id="`abs-sub-${a.id}`" v-model="absence.substituteId" class="input">
                  <option value="">Sin sustituto</option>
                  <option v-for="o in available" :key="o.id" :value="o.id" :disabled="o.conflicts.length > 0">{{ o.name }}{{ o.conflicts.length ? ' (ocupado)' : '' }}</option>
                </select>
              </FormField>
              <FormField :id="`abs-note-${a.id}`" label="Nota" hint="Opcional">
                <input :id="`abs-note-${a.id}`" v-model="absence.note" class="input" maxlength="300" placeholder="Ej. avisó enfermo" />
              </FormField>
              <p v-for="w in chosenSubstitute?.warnings ?? []" :key="w" class="flex gap-1.5 text-xs text-amber-800 sm:col-span-2"><AlertTriangle class="size-3.5 shrink-0" aria-hidden="true" /> {{ w }}</p>
              <div class="flex justify-end gap-2 sm:col-span-2">
                <AppButton variant="secondary" size="sm" @click="absence.id = null">Cancelar</AppButton>
                <AppButton type="submit" size="sm" :loading="busy">Registrar ausencia</AppButton>
              </div>
            </form>
          </li>
        </ul>
        <ul v-if="absent.length" class="mt-2 space-y-1 text-xs text-zinc-500">
          <li v-for="a in absent" :key="a.id" class="flex flex-wrap items-center gap-x-2">
            <span>
              <strong class="text-red-700">No se presentó:</strong> {{ a.name }} ({{ REFEREE_ROLE[a.role] }})<template v-if="substituteOf(a)"> · lo sustituyó {{ substituteOf(a)!.name }}</template><template v-if="a.absenceNote"> · {{ a.absenceNote }}</template>
            </span>
            <AppButton v-if="canCorrect && !readOnly" variant="ghost" size="sm" :disabled="busy" title="La ausencia se registró mal" @click="openCorrection(a)">
              <Undo2 class="size-3.5" aria-hidden="true" /> Corregir
            </AppButton>
          </li>
        </ul>

        <!-- Corrección justificada (VOID): nada se borra -->
        <form v-if="correction.id" class="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3" @submit.prevent="correct">
          <p class="text-sm font-semibold text-zinc-900">Corregir el registro de {{ nameOf(correction.id) }}</p>
          <div role="radiogroup" aria-label="Qué pasó en realidad" class="space-y-1 text-sm">
            <label v-if="state?.referees.find((x) => x.id === correction.id)?.status === 'absent'" class="flex items-center gap-2">
              <input v-model="correction.mode" type="radio" value="restore" class="accent-pitch-700" /> Sí se presentó (se anula la ausencia y su sustituto)
            </label>
            <label class="flex items-center gap-2">
              <input v-model="correction.mode" type="radio" value="substitute" class="accent-pitch-700" /> Lo sustituyó otro árbitro
            </label>
            <label v-if="state?.referees.find((x) => x.id === correction.id)?.substituteFor" class="flex items-center gap-2">
              <input v-model="correction.mode" type="radio" value="none" class="accent-pitch-700" /> Nadie lo sustituyó
            </label>
          </div>
          <FormField v-if="correction.mode === 'substitute'" id="corr-sub" label="Sustituto correcto">
            <select id="corr-sub" v-model="correction.substituteId" class="input">
              <option value="" disabled>Elige un árbitro</option>
              <option v-for="o in available" :key="o.id" :value="o.id" :disabled="o.conflicts.length > 0">{{ o.name }}{{ o.conflicts.length ? ' (ocupado)' : '' }}</option>
            </select>
          </FormField>
          <FormField id="corr-reason" label="Motivo de la corrección">
            <input id="corr-reason" v-model="correction.reason" class="input" maxlength="300" required placeholder="Ej. se capturó en el partido equivocado" />
          </FormField>
          <div class="flex justify-end gap-2">
            <AppButton variant="secondary" size="sm" @click="correction.id = null">Cancelar</AppButton>
            <AppButton type="submit" size="sm" :loading="busy">Registrar corrección</AppButton>
          </div>
        </form>

        <ul v-if="closed.length" class="mt-3 space-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
          <li v-for="a in closed" :key="a.id">
            <template v-if="a.status === 'void'"><strong class="text-zinc-700">Anulado:</strong> {{ a.name }} ({{ REFEREE_ROLE[a.role] }}) · {{ a.voided?.reason }}</template>
            <template v-else><strong class="text-zinc-700">Liberado al reprogramar:</strong> {{ a.name }} ({{ REFEREE_ROLE[a.role] }})</template>
          </li>
          <li v-for="a in state?.referees.filter((x) => x.absenceVoided?.length) ?? []" :key="`av-${a.id}`">
            <strong class="text-zinc-700">Ausencia anulada:</strong> {{ a.name }} · {{ a.absenceVoided!.at(-1)!.reason }}
          </li>
        </ul>
      </section>

      <section v-if="!readOnly && freeRoles.length" aria-labelledby="ref-add" class="rounded-xl border border-zinc-200 p-3">
        <h3 id="ref-add" class="mb-2 text-sm font-semibold text-zinc-900">Asignar</h3>
        <form class="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end" @submit.prevent="assign">
          <FormField id="ref-role" label="Rol">
            <select id="ref-role" v-model="form.role" class="input">
              <option v-for="r in freeRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </FormField>
          <FormField id="ref-who" label="Árbitro">
            <select id="ref-who" v-model="form.refereeId" class="input">
              <option value="" disabled>{{ available.length ? 'Elige un árbitro' : 'No hay árbitros disponibles' }}</option>
              <option v-for="o in available" :key="o.id" :value="o.id" :disabled="o.conflicts.length > 0">
                {{ o.name }}{{ o.conflicts.length ? ' (ocupado)' : o.warnings.length ? ' (fuera de su disponibilidad)' : '' }}
              </option>
            </select>
          </FormField>
          <AppButton type="submit" :loading="busy" :disabled="!form.refereeId">Asignar</AppButton>
        </form>
        <p v-for="w in chosen?.warnings ?? []" :key="w" class="mt-2 flex gap-1.5 text-xs text-amber-800"><AlertTriangle class="size-3.5 shrink-0" aria-hidden="true" /> {{ w }} (se puede asignar).</p>
        <ul v-if="options.some((o) => o.conflicts.length)" class="mt-2 space-y-0.5 text-xs text-zinc-500">
          <li v-for="o in options.filter((x) => x.conflicts.length)" :key="o.id" class="flex gap-1.5">
            <Ban class="size-3.5 shrink-0 text-red-600" aria-hidden="true" />
            {{ o.name }} ya arbitra {{ o.conflicts[0].homeTeam }} vs {{ o.conflicts[0].awayTeam }} ({{ o.conflicts[0].tournamentName }}) de {{ o.conflicts[0].time }} a {{ o.conflicts[0].endTime }}.
          </li>
        </ul>
        <p v-if="!options.length" class="mt-2 text-xs text-zinc-500">
          Registra árbitros en <RouterLink :to="{ name: 'admin-referees' }" class="link">Árbitros</RouterLink>.
        </p>
      </section>
    </div>
    <template #footer>
      <AppButton variant="secondary" :disabled="busy" @click="emit('close')">Cerrar</AppButton>
    </template>
  </BaseModal>
</template>
