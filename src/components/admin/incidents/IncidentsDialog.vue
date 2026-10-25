<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, CalendarClock, ClipboardEdit, PlayCircle } from 'lucide-vue-next'
import type { IncidentType, Match, MatchIncident, MatchIncidents, MatchStatus } from '@/types'
import { getErrorMessage, incidentService } from '@/services'
import { useMatchesStore, useTournamentsStore, useHistoricalNamesStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { formatDate, toISODate } from '@/utils/format'
import { INCIDENT_TYPE, INCIDENT_TYPES, ROLE_LABEL, SUSPENSION_DECISION } from '@/utils/labels'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import LoadingState from '@/components/common/LoadingState.vue'

/**
 * Incidencias de un partido (2C-2): registrar, consultar, resolver y anular. Una suspensión deja el
 * partido pendiente de decisión: aquí se reanuda; reprogramar, posponer o cancelar abre el
 * formulario del partido (`decide`), y darlo por terminado es capturar su resultado final.
 * `canManage` = permiso INCIDENTS; el servidor vuelve a validar todo.
 */
const props = defineProps<{ open: boolean; match: Match | null; canManage: boolean; canSchedule: boolean; canCapture: boolean; readOnly?: boolean }>()
const emit = defineEmits<{ close: []; decide: [status: MatchStatus] }>()
/** 10C: dentro de un torneo finalizado, los nombres con que se jugó. */
const names = useHistoricalNamesStore()
const matches = useMatchesStore()
const tournaments = useTournamentsStore()
const toast = useToast()

const data = ref<MatchIncidents | null>(null)
const loading = ref(false)
const busy = ref(false)
const form = reactive<{ type: IncidentType; description: string; occurredAt: string }>({ type: 'DELAY', description: '', occurredAt: '' })
/** Acción abierta sobre una incidencia (resolver o anular) con su texto. */
const acting = reactive<{ id: string | null; kind: 'resolve' | 'void'; text: string }>({ id: null, kind: 'resolve', text: '' })
const resumeReason = ref('')

async function load() {
  if (!props.match) return
  loading.value = true
  try {
    data.value = await incidentService.list(props.match.id)
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    loading.value = false
  }
}
watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, { type: 'DELAY', description: '', occurredAt: '' })
    Object.assign(acting, { id: null, text: '' })
    resumeReason.value = ''
    void load()
  },
)

const title = computed(() => (props.match ? `${names.team(props.match.tournamentId, props.match.homeTeamId)?.name ?? 'Local'} vs ${names.team(props.match.tournamentId, props.match.awayTeamId)?.name ?? 'Visitante'}` : 'Incidencias'))
const editable = computed(() => props.canManage && !props.readOnly)
const suspended = computed(() => props.match?.status === 'suspended')
const hasScore = computed(() => props.match?.homeScore != null)
/** Suspender: partido programado o en juego, con el torneo iniciado. */
const canSuspend = computed(() => (props.match?.status === 'scheduled' || props.match?.status === 'live') && tournaments.get(props.match.tournamentId)?.status === 'active')
const types = computed(() => INCIDENT_TYPES.filter((t) => t.value !== 'SUSPENSION' || canSuspend.value))
const when = (iso: string) => {
  const d = new Date(iso)
  return `${formatDate(toISODate(d))} ${d.toTimeString().slice(0, 5)}`
}
const who = (id: string, role: string | null) => `${data.value?.users[id] ?? 'Alguien'}${role ? ` (${ROLE_LABEL[role as keyof typeof ROLE_LABEL] ?? role})` : ''}`
const STATUS: Record<MatchIncident['status'], { label: string; tone: 'amber' | 'green' | 'neutral' }> = {
  OPEN: { label: 'Abierta', tone: 'amber' },
  RESOLVED: { label: 'Resuelta', tone: 'green' },
  VOID: { label: 'Anulada', tone: 'neutral' },
}

async function run(fn: () => Promise<MatchIncidents>, done: string, refreshMatch = false) {
  busy.value = true
  try {
    data.value = await fn()
    if (refreshMatch && props.match) await matches.refresh(props.match.id)
    toast.success(done)
    return true
  } catch (e) {
    toast.error(getErrorMessage(e))
    return false
  } finally {
    busy.value = false
  }
}

async function report() {
  if (form.description.trim().length < 3) return toast.error('Describe la incidencia.')
  const suspension = form.type === 'SUSPENSION'
  const ok = await run(
    () => incidentService.report(props.match!.id, { type: form.type, description: form.description.trim(), ...(form.occurredAt ? { occurredAt: new Date(form.occurredAt).toISOString() } : {}) }),
    suspension ? 'Partido suspendido: queda pendiente de decisión.' : 'Incidencia registrada.',
    suspension,
  )
  if (ok) Object.assign(form, { type: 'DELAY', description: '', occurredAt: '' })
}

async function act(incident: MatchIncident) {
  const text = acting.text.trim()
  if (text.length < 3) return toast.error(acting.kind === 'resolve' ? 'Indica cómo se resolvió.' : 'Indica por qué se anula.')
  const ok = await run(
    () => (acting.kind === 'resolve' ? incidentService.resolve(props.match!.id, incident.id, text) : incidentService.void(props.match!.id, incident.id, text)),
    acting.kind === 'resolve' ? 'Incidencia resuelta.' : 'Incidencia anulada.',
    incident.type === 'SUSPENSION',
  )
  if (ok) acting.id = null
}

async function resume() {
  if (resumeReason.value.trim().length < 3) return toast.error('Indica el motivo (queda en el historial).')
  busy.value = true
  try {
    await matches.update(props.match!.id, { status: 'live', reason: resumeReason.value.trim() })
    data.value = await incidentService.list(props.match!.id)
    resumeReason.value = ''
    toast.success('Partido reanudado.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Incidencias del partido" :description="match ? `${title} · ${formatDate(match.date)} ${match.time}` : undefined" size="lg" @close="busy || emit('close')">
    <LoadingState v-if="loading && !data" />
    <div v-else class="space-y-5">
      <!-- Suspendido: pendiente de decisión -->
      <section v-if="match && suspended" class="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3" aria-labelledby="inc-decide">
        <h3 id="inc-decide" class="flex items-center gap-2 text-sm font-bold text-amber-900">
          <AlertTriangle class="size-4" aria-hidden="true" /> Partido suspendido · pendiente de decisión
        </h3>
        <p class="text-xs text-amber-900">
          No cuenta en la tabla ni se da por terminado solo.
          <template v-if="hasScore"> Marcador al suspenderse: {{ match.homeScore }}–{{ match.awayScore }} (se conserva si se reanuda o se reprograma).</template>
        </p>
        <template v-if="!readOnly">
          <form v-if="canManage" class="flex flex-wrap items-end gap-2" @submit.prevent="resume">
            <FormField id="inc-resume" label="Motivo para reanudar" class="min-w-56 flex-1">
              <input id="inc-resume" v-model="resumeReason" class="input" maxlength="300" placeholder="Ej. paró la lluvia" />
            </FormField>
            <AppButton type="submit" size="sm" :loading="busy"><PlayCircle class="size-4" aria-hidden="true" /> Reanudar</AppButton>
          </form>
          <div class="flex flex-wrap gap-2">
            <AppButton v-if="canSchedule" variant="secondary" size="sm" :disabled="busy" @click="emit('decide', 'scheduled')"><CalendarClock class="size-4" aria-hidden="true" /> Reprogramar</AppButton>
            <AppButton v-if="canSchedule && !hasScore" variant="secondary" size="sm" :disabled="busy" @click="emit('decide', 'postponed')">Posponer</AppButton>
            <AppButton v-if="canSchedule && !hasScore" variant="secondary" size="sm" :disabled="busy" @click="emit('decide', 'cancelled')">Cancelar partido</AppButton>
            <AppButton v-if="canCapture && canManage" variant="secondary" size="sm" :to="{ name: 'admin-match-capture', params: { id: match.id } }">
              <ClipboardEdit class="size-4" aria-hidden="true" /> Capturar resultado final
            </AppButton>
          </div>
          <p v-if="hasScore" class="text-xs text-amber-900">Con marcador parcial no se puede posponer ni cancelar: reprográmalo, reanúdalo o captura el resultado final.</p>
        </template>
      </section>

      <!-- Historial de incidencias -->
      <section aria-labelledby="inc-list">
        <h3 id="inc-list" class="mb-2 text-sm font-semibold text-zinc-900">Registradas</h3>
        <p v-if="!data?.incidents.length" class="text-sm text-zinc-500">Sin incidencias.</p>
        <ul class="divide-y divide-zinc-100">
          <li v-for="i in data?.incidents ?? []" :key="i.id" class="py-2.5 text-sm" :class="i.status === 'VOID' && 'opacity-60'">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold" :class="i.type === 'SUSPENSION' ? 'text-amber-800' : 'text-zinc-900'">{{ INCIDENT_TYPE[i.type] }}</span>
              <StatusBadge v-bind="STATUS[i.status]" />
              <span class="text-xs text-zinc-500">{{ when(i.occurredAt) }} · {{ who(i.reportedBy, i.reportedRole) }}</span>
            </div>
            <p class="mt-0.5 text-zinc-700" :class="i.status === 'VOID' && 'line-through'">{{ i.description }}</p>
            <p v-if="i.resolution" class="mt-0.5 text-xs text-green-800">
              {{ i.resolution.decision ? SUSPENSION_DECISION[i.resolution.decision] : 'Resuelta' }}<template v-if="i.resolution.note">: {{ i.resolution.note }}</template> · {{ who(i.resolution.by, i.resolution.role) }}, {{ when(i.resolution.at) }}
            </p>
            <p v-if="i.voided" class="mt-0.5 text-xs text-zinc-500">Anulada: {{ i.voided.note }} · {{ who(i.voided.by, i.voided.role) }}, {{ when(i.voided.at) }}</p>
            <div v-if="editable && i.status !== 'VOID'" class="mt-1 flex gap-1">
              <AppButton v-if="i.status === 'OPEN' && i.type !== 'SUSPENSION'" variant="ghost" size="sm" :disabled="busy" @click="Object.assign(acting, { id: i.id, kind: 'resolve', text: '' })">Resolver</AppButton>
              <AppButton
                v-if="i.type !== 'SUSPENSION' || (i.status === 'OPEN' && suspended)"
                variant="ghost"
                size="sm"
                class="text-red-700"
                :disabled="busy"
                @click="Object.assign(acting, { id: i.id, kind: 'void', text: '' })"
              >
                Anular
              </AppButton>
            </div>
            <form v-if="acting.id === i.id" class="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-zinc-50 p-3" @submit.prevent="act(i)">
              <FormField :id="`inc-act-${i.id}`" :label="acting.kind === 'resolve' ? 'Cómo se resolvió' : 'Por qué se anula (registrada por error)'" class="min-w-56 flex-1">
                <input :id="`inc-act-${i.id}`" v-model="acting.text" class="input" :maxlength="acting.kind === 'resolve' ? 500 : 300" />
              </FormField>
              <p v-if="acting.kind === 'void' && i.type === 'SUSPENSION'" class="w-full text-xs text-amber-800">El partido vuelve al estado que tenía antes de suspenderse.</p>
              <AppButton variant="secondary" size="sm" @click="acting.id = null">Cancelar</AppButton>
              <AppButton type="submit" size="sm" :loading="busy">{{ acting.kind === 'resolve' ? 'Resolver' : 'Anular' }}</AppButton>
            </form>
          </li>
        </ul>
      </section>

      <!-- Registrar -->
      <section v-if="editable && match?.status !== 'cancelled'" aria-labelledby="inc-new" class="rounded-xl border border-zinc-200 p-3">
        <h3 id="inc-new" class="mb-2 text-sm font-semibold text-zinc-900">Registrar incidencia</h3>
        <form class="grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="report">
          <FormField id="inc-type" label="Tipo">
            <select id="inc-type" v-model="form.type" class="input">
              <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }} — {{ t.description }}</option>
            </select>
          </FormField>
          <FormField id="inc-when" label="Cuándo ocurrió" hint="Opcional; por defecto, ahora">
            <input id="inc-when" v-model="form.occurredAt" type="datetime-local" class="input" />
          </FormField>
          <FormField id="inc-desc" label="Descripción" class="sm:col-span-2">
            <textarea id="inc-desc" v-model="form.description" class="input min-h-20" maxlength="1000" placeholder="Qué pasó" />
          </FormField>
          <p v-if="form.type === 'SUSPENSION'" class="flex gap-1.5 text-xs text-amber-800 sm:col-span-2" role="status">
            <AlertTriangle class="size-3.5 shrink-0" aria-hidden="true" /> El partido queda suspendido y pendiente de decisión: no se da por terminado ni se cancela solo.
          </p>
          <div class="flex justify-end sm:col-span-2">
            <AppButton type="submit" :loading="busy" :variant="form.type === 'SUSPENSION' ? 'accent' : 'primary'">{{ form.type === 'SUSPENSION' ? 'Suspender partido' : 'Registrar' }}</AppButton>
          </div>
        </form>
      </section>
    </div>
    <template #footer>
      <AppButton variant="secondary" :disabled="busy" @click="emit('close')">Cerrar</AppButton>
    </template>
  </BaseModal>
</template>
