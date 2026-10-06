<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Check, X } from 'lucide-vue-next'
import posthog from 'posthog-js'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import type { ID, RegistrationRequestDetail } from '@/types'
import { getErrorMessage, registrationService } from '@/services'
import { useToast } from '@/composables/useToast'
import { POSITION_LABELS, REGISTRATION_STATUS } from '@/utils/labels'
import { formatDate, plural, toISODate } from '@/utils/format'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'

/**
 * Revisión de una solicitud: equipo, quién la envió y la plantilla ENVIADA (no la actual). Si
 * sigue pendiente, el servidor señala los problemas ACTUALES (jugador ya no pertenece al equipo,
 * juega con otro equipo del torneo, sin cupo…). Aprobar lo revalida todo de forma atómica.
 * El organizador no edita la plantilla global del equipo.
 */
const props = defineProps<{ open: boolean; tournamentId: ID; requestId: ID | null; readOnly: boolean }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const toast = useToast()

const detail = ref<RegistrationRequestDetail | null>(null)
const loading = ref(false)
const error = ref('')
const busy = ref<'approve' | 'reject' | null>(null)
const rejecting = ref(false)
const reason = ref('')

async function load() {
  if (!props.requestId) return
  loading.value = true
  error.value = ''
  try {
    detail.value = await registrationService.request(props.tournamentId, props.requestId)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(
  () => [props.open, props.requestId],
  () => {
    if (!props.open) return
    detail.value = null
    rejecting.value = false
    reason.value = ''
    load()
  },
  { immediate: true },
)

const pending = computed(() => detail.value?.status === 'pending')
const canAct = computed(() => pending.value && !props.readOnly)
const PROBLEM: Record<string, string> = {
  NOT_IN_ROSTER: 'Ya no pertenece al equipo',
  OTHER_TEAM: 'Ya juega con otro equipo en este torneo',
  PLAYER_NOT_FOUND: 'Ya no existe',
}

async function approve() {
  busy.value = 'approve'
  try {
    detail.value = await registrationService.approve(props.tournamentId, props.requestId!)
    if (posthogConfigured) {
      posthog.capture('registration_request_approved', {
        tournament_id: props.tournamentId,
        player_count: detail.value.playerCount,
      })
    }
    toast.success(`${detail.value.team?.name ?? 'El equipo'} quedó inscrito con ${plural(detail.value.playerCount, 'jugador', 'jugadores')}.`)
    emit('changed')
  } catch (e) {
    toast.error(getErrorMessage(e))
    await load() // muestra los problemas actuales que lo impidieron
  } finally {
    busy.value = null
  }
}

async function reject() {
  busy.value = 'reject'
  try {
    detail.value = await registrationService.reject(props.tournamentId, props.requestId!, reason.value.trim() || null)
    if (posthogConfigured) {
      posthog.capture('registration_request_rejected', {
        tournament_id: props.tournamentId,
        player_count: detail.value.playerCount,
      })
    }
    rejecting.value = false
    toast.success('Solicitud rechazada.')
    emit('changed')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = null
  }
}

const when = (iso: string | null) => (iso ? formatDate(toISODate(new Date(iso))) : '')
</script>

<template>
  <BaseModal :open="open" title="Revisar solicitud" size="lg" @close="busy || emit('close')">
    <LoadingState v-if="loading && !detail" />
    <p v-else-if="error" class="rounded-xl bg-red-50 p-4 text-sm text-red-800">{{ error }}</p>
    <template v-else-if="detail">
      <div class="flex items-center gap-3">
        <TeamLogo :team="detail.team" size="lg" class="shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-lg font-bold text-zinc-950">{{ detail.team?.name ?? 'Equipo' }}</p>
          <p class="text-sm text-zinc-500">
            {{ plural(detail.playerCount, 'jugador', 'jugadores') }}
            <template v-if="detail.submittedBy"> · Enviada por {{ detail.submittedBy.firstName }} {{ detail.submittedBy.lastName }}</template>
            · {{ when(detail.submittedAt) }}
          </p>
        </div>
        <StatusBadge v-bind="REGISTRATION_STATUS[detail.status]" class="shrink-0" />
      </div>

      <p v-if="detail.status === 'rejected' && detail.rejectionReason" class="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
        Motivo del rechazo: {{ detail.rejectionReason }}
      </p>

      <div v-if="detail.problems.length" class="mt-4 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
        <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p class="font-semibold">No se puede aprobar tal como está:</p>
          <ul class="mt-1 list-disc space-y-0.5 pl-5">
            <li v-for="p in detail.problems" :key="p.code">{{ p.message }}</li>
          </ul>
          <p class="mt-1 text-xs">El equipo deberá corregir la plantilla y enviar una nueva solicitud.</p>
        </div>
      </div>

      <h3 class="eyebrow mt-5 mb-2">Plantilla enviada</h3>
      <ol class="max-h-80 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
        <li v-for="(p, i) in detail.players" :key="p.player?.id ?? i" class="flex items-center gap-3 px-3 py-2">
          <span class="tabular w-6 shrink-0 text-right text-xs font-semibold text-zinc-400">{{ i + 1 }}</span>
          <PlayerAvatar :player="p.player ?? undefined" size="sm" decorative />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-zinc-900">{{ p.player ? `${p.player.firstName} ${p.player.lastName}` : 'Jugador eliminado' }}</span>
            <span class="block text-xs text-zinc-500">
              <template v-if="p.player">{{ POSITION_LABELS[p.player.position] }}<template v-if="p.player.age !== null"> · {{ p.player.age }} años</template></template>
            </span>
          </span>
          <span v-if="p.problem" class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">{{ PROBLEM[p.problem] ?? p.problem }}</span>
        </li>
      </ol>

      <div v-if="rejecting" class="mt-4">
        <label for="reject-reason" class="mb-1 block text-sm font-medium text-zinc-700">Motivo (opcional, lo verá el equipo)</label>
        <textarea id="reject-reason" v-model="reason" rows="2" maxlength="300" class="input h-auto py-2" placeholder="Ej.: la plantilla supera el máximo permitido" />
      </div>
    </template>

    <template #footer>
      <template v-if="canAct && !rejecting">
        <AppButton variant="secondary" :disabled="!!busy" @click="rejecting = true"><X class="size-4" aria-hidden="true" /> Rechazar</AppButton>
        <AppButton :loading="busy === 'approve'" :disabled="!!detail?.problems.length || !!busy" @click="approve"><Check class="size-4" aria-hidden="true" /> Aprobar e inscribir</AppButton>
      </template>
      <template v-else-if="canAct && rejecting">
        <AppButton variant="secondary" :disabled="!!busy" @click="rejecting = false">Volver</AppButton>
        <AppButton variant="danger" :loading="busy === 'reject'" @click="reject">Confirmar rechazo</AppButton>
      </template>
      <AppButton v-else variant="secondary" @click="emit('close')">Cerrar</AppButton>
    </template>
  </BaseModal>
</template>
