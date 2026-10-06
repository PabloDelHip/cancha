<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Copy, Link2, Link2Off, RefreshCw, Save, Server, UsersRound } from 'lucide-vue-next'
import type { RegistrationAdminState, RegistrationRequestStatus, RegistrationRequestSummary } from '@/types'
import { getErrorMessage, REGISTRATION_REQUIRES_SERVER, registrationService, USE_MOCKS } from '@/services'
import { ensureAdminData } from '@/stores'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { playersRange, REGISTRATION_CLOSED, REGISTRATION_STATUS } from '@/utils/labels'
import { formatDate, plural, toISODate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import RegistrationReviewDialog from '@/components/admin/registration/RegistrationReviewDialog.vue'

/**
 * Inscripciones del torneo (organizador): abrir/cerrar, límites, enlace privado para compartir por
 * WhatsApp y revisión de solicitudes. Aprobar crea la misma inscripción y plantilla del torneo que
 * el flujo manual (Equipos / Jugadores), sin capturar jugadores a mano.
 */
const props = defineProps<{ id: string }>()
const { readOnly } = useTournamentWorkspace(() => props.id)
const { confirm } = useConfirm()
const toast = useToast()

const state = ref<RegistrationAdminState | null>(null)
const requests = ref<RegistrationRequestSummary[]>([])
const filter = ref<RegistrationRequestStatus>('pending')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const linkBusy = ref(false)
const reviewing = ref<string | null>(null)

const form = reactive({ enabled: false, minPlayers: '' as string | number, maxPlayers: '' as string | number, maxTeams: '' as string | number, deadline: '' })
function fillForm(s: RegistrationAdminState) {
  const r = s.registration
  Object.assign(form, {
    enabled: r.enabled,
    minPlayers: r.minPlayers?.toString() ?? '',
    maxPlayers: r.maxPlayers?.toString() ?? '',
    maxTeams: r.maxTeams?.toString() ?? '',
    deadline: r.deadline ?? '',
  })
}

async function loadRequests() {
  const res = await registrationService.requests(props.id, filter.value)
  requests.value = res.requests
  if (state.value) state.value.counts = res.counts
}
async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = ''
  try {
    state.value = await registrationService.state(props.id)
    fillForm(state.value)
    await loadRequests()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })
watch(filter, () => loadRequests().catch((e) => toast.error(getErrorMessage(e))))

// v-model en <input type="number"> entrega número (o '' si está vacío): se aceptan ambos.
const num = (v: string | number) => (String(v).trim() === '' ? null : Number(v))
async function save() {
  saving.value = true
  try {
    state.value = await registrationService.updateSettings(props.id, {
      enabled: form.enabled,
      minPlayers: num(form.minPlayers),
      maxPlayers: num(form.maxPlayers),
      maxTeams: num(form.maxTeams),
      deadline: form.deadline || null,
    })
    fillForm(state.value)
    toast.success(form.enabled ? 'Inscripciones abiertas.' : 'Configuración guardada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

const linkUrl = computed(() => (state.value?.link ? `${window.location.origin}/join/${state.value.link.token}` : ''))

async function copy() {
  try {
    await navigator.clipboard.writeText(linkUrl.value)
  } catch {
    // Sin Clipboard API (http, navegadores viejos): selecciona el texto para copiarlo a mano.
    const input = document.getElementById('registration-link') as HTMLInputElement | null
    input?.select()
    const ok = document.execCommand?.('copy')
    if (!ok) {
      toast.error('No se pudo copiar automáticamente: el enlace quedó seleccionado para copiarlo.')
      return
    }
  }
  toast.success('Enlace copiado')
}

async function generate() {
  if (state.value?.link) {
    const ok = await confirm({
      title: '¿Generar un enlace nuevo?',
      message: 'El enlace actual dejará de funcionar de inmediato. Las solicitudes ya enviadas se conservan.',
      confirmLabel: 'Generar enlace nuevo',
      tone: 'danger',
    })
    if (!ok) return
  }
  linkBusy.value = true
  try {
    state.value = await registrationService.generateLink(props.id)
    toast.success('Enlace listo para compartir.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    linkBusy.value = false
  }
}

async function revoke() {
  const ok = await confirm({
    title: '¿Desactivar el enlace?',
    message: 'Nadie podrá enviar solicitudes con este enlace. Las solicitudes ya enviadas se conservan y puedes seguir revisándolas.',
    confirmLabel: 'Desactivar enlace',
    tone: 'danger',
  })
  if (!ok) return
  linkBusy.value = true
  try {
    await registrationService.revokeLink(props.id)
    state.value = await registrationService.state(props.id)
    toast.success('Enlace desactivado.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    linkBusy.value = false
  }
}

async function onChanged() {
  await Promise.all([loadRequests(), registrationService.state(props.id).then((s) => (state.value = s)), ensureAdminData(true)])
}

const FILTERS: { value: RegistrationRequestStatus; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'cancelled', label: 'Canceladas' },
]
const when = (iso: string) => formatDate(toISODate(new Date(iso)))
const summary = computed(() => {
  const r = state.value?.registration
  if (!r) return ''
  return [playersRange(r.minPlayers, r.maxPlayers), r.maxTeams ? `cupo de ${r.maxTeams} equipos` : null, r.deadline ? `cierre ${formatDate(r.deadline)}` : null]
    .filter(Boolean)
    .join(' · ')
})
</script>

<template>
  <div>
    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${REGISTRATION_REQUIRES_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <div v-else-if="state" class="space-y-8">
      <!-- Estado y enlace -->
      <section aria-labelledby="link-title" class="card overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-4 py-3">
          <h2 id="link-title" class="text-lg font-bold">Enlace de inscripción</h2>
          <StatusBadge :label="state.open ? 'Abiertas' : 'Cerradas'" :tone="state.open ? 'green' : 'neutral'" :pulse="state.open" />
          <span class="text-sm text-zinc-500">{{ plural(state.enrolledTeams, 'equipo inscrito', 'equipos inscritos') }}</span>
        </div>
        <div class="space-y-3 p-4">
          <p v-if="!state.open && state.closedReason" class="text-sm text-zinc-600">{{ REGISTRATION_CLOSED[state.closedReason] }}.</p>
          <template v-if="state.link">
            <p class="text-sm text-zinc-600">Compártelo por WhatsApp: el encargado de cada equipo elige su plantilla y tú apruebas.</p>
            <label for="registration-link" class="sr-only">Enlace de inscripción</label>
            <div class="flex flex-col gap-2 sm:flex-row">
              <input id="registration-link" :value="linkUrl" readonly class="input min-w-0 flex-1 font-mono text-xs" @focus="($event.target as HTMLInputElement).select()" />
              <AppButton class="h-11 sm:h-10" @click="copy"><Copy class="size-4" aria-hidden="true" /> Copiar enlace</AppButton>
            </div>
            <div v-if="!readOnly" class="flex flex-wrap gap-2">
              <AppButton variant="ghost" size="sm" :loading="linkBusy" @click="generate"><RefreshCw class="size-4" aria-hidden="true" /> Generar uno nuevo</AppButton>
              <AppButton variant="ghost" size="sm" :disabled="linkBusy" class="text-red-700" @click="revoke"><Link2Off class="size-4" aria-hidden="true" /> Desactivar</AppButton>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-zinc-600">Genera un enlace privado para que los equipos se inscriban solos con su plantilla.</p>
            <AppButton v-if="!readOnly" :loading="linkBusy" @click="generate"><Link2 class="size-4" aria-hidden="true" /> Generar enlace</AppButton>
          </template>
        </div>
      </section>

      <!-- Configuración -->
      <section aria-labelledby="reg-settings-title" class="card p-4">
        <h2 id="reg-settings-title" class="text-lg font-bold">Configuración</h2>
        <p class="mb-4 text-sm text-zinc-500">{{ summary || 'Sin límites configurados.' }} Todas las solicitudes requieren tu aprobación.</p>
        <form class="space-y-4" novalidate @submit.prevent="save">
          <fieldset :disabled="readOnly" class="space-y-4">
            <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3">
              <span>
                <span class="block font-semibold text-zinc-900">Aceptar solicitudes</span>
                <span class="block text-xs text-zinc-500">Cerrar no borra las solicitudes ya enviadas: las puedes seguir revisando.</span>
              </span>
              <input v-model="form.enabled" type="checkbox" class="size-6 shrink-0 accent-pitch-700" />
            </label>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FormField id="reg-min" label="Mín. jugadores">
                <input id="reg-min" v-model="form.minPlayers" type="number" inputmode="numeric" min="1" max="60" class="input" placeholder="Sin mínimo" />
              </FormField>
              <FormField id="reg-max" label="Máx. jugadores">
                <input id="reg-max" v-model="form.maxPlayers" type="number" inputmode="numeric" min="1" max="60" class="input" placeholder="Sin máximo" />
              </FormField>
              <FormField id="reg-teams" label="Cupo de equipos">
                <input id="reg-teams" v-model="form.maxTeams" type="number" inputmode="numeric" min="2" max="128" class="input" placeholder="Sin cupo" />
              </FormField>
              <FormField id="reg-deadline" label="Fecha límite">
                <input id="reg-deadline" v-model="form.deadline" type="date" class="input" />
              </FormField>
            </div>
          </fieldset>
          <div v-if="!readOnly" class="flex justify-end">
            <AppButton type="submit" :loading="saving"><Save class="size-4" aria-hidden="true" /> Guardar</AppButton>
          </div>
        </form>
      </section>

      <!-- Solicitudes -->
      <section aria-labelledby="requests-title">
        <h2 id="requests-title" class="mb-3 text-lg font-bold">Solicitudes</h2>
        <div role="radiogroup" aria-label="Filtrar solicitudes" class="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <button
            v-for="f in FILTERS"
            :key="f.value"
            type="button"
            role="radio"
            :aria-checked="filter === f.value"
            class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors"
            :class="filter === f.value ? 'border-pitch-900 bg-pitch-900 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'"
            @click="filter = f.value"
          >
            {{ f.label }}
            <span class="tabular rounded-full px-1.5 text-xs" :class="filter === f.value ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500'">{{ state.counts[f.value] }}</span>
          </button>
        </div>
        <ul v-if="requests.length" class="space-y-2">
          <li v-for="r in requests" :key="r.id" class="card flex items-center gap-3 p-3">
            <TeamLogo :team="r.team" size="md" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-zinc-900">{{ r.team?.name ?? 'Equipo' }}</p>
              <p class="truncate text-xs text-zinc-500">
                {{ plural(r.playerCount, 'jugador', 'jugadores') }}<template v-if="r.submittedBy"> · Enviada por {{ r.submittedBy.firstName }} {{ r.submittedBy.lastName }}</template> · {{ when(r.submittedAt) }}
              </p>
            </div>
            <StatusBadge v-if="filter !== 'pending'" v-bind="REGISTRATION_STATUS[r.status]" class="shrink-0 max-sm:hidden" />
            <AppButton :variant="r.status === 'pending' && !readOnly ? 'primary' : 'secondary'" size="sm" class="shrink-0" @click="reviewing = r.id">
              {{ r.status === 'pending' && !readOnly ? 'Revisar' : 'Ver' }}
            </AppButton>
          </li>
        </ul>
        <EmptyState
          v-else
          :icon="UsersRound"
          :title="filter === 'pending' ? 'Sin solicitudes pendientes' : 'Nada por aquí'"
          :description="filter === 'pending' ? 'Cuando un equipo envíe su plantilla por el enlace, aparecerá aquí para que la revises.' : undefined"
          class="card"
          compact
        />
      </section>
    </div>

    <RegistrationReviewDialog :open="!!reviewing" :tournament-id="id" :request-id="reviewing" :read-only="readOnly" @close="reviewing = null" @changed="onChanged" />
  </div>
</template>
