<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ID, Team } from '@/types'
import { usePlayersStore, useTournamentsStore, type RosterEntry } from '@/stores'
import { useRegistration } from '@/composables/useRegistration'
import { useGuardedRegister } from '@/composables/useGuardedRegister'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/services'
import { fullName } from '@/utils/players'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import RegistrationFields from '@/components/admin/RegistrationFields.vue'

/**
 * Cambia el dorsal o el equipo de un jugador DENTRO de este torneo. Cambiar de equipo cierra
 * la participación actual y abre otra (con motivo): el historial se conserva. Otros torneos no se
 * tocan. Si su participación viene de un cambio de equipo, se puede anular (3C).
 */
const props = defineProps<{ entry: RosterEntry | null; tournamentId: ID; teams: Team[] }>()
const emit = defineEmits<{ close: [] }>()

const tournaments = useTournamentsStore()
const players = usePlayersStore()
const toast = useToast()
const { ask } = useConfirm()
const registration = useRegistration(() => props.tournamentId)
const guarded = useGuardedRegister(() => props.tournamentId)
const saving = ref(false)
const canTeams = computed(() => tournaments.can(props.tournamentId, 'TEAMS'))
const fromTeamName = computed(() => {
  const from = props.entry?.membership.transferredFrom
  return from ? (props.teams.find((t) => t.id === from)?.name ?? 'su equipo anterior') : null
})

watch(
  () => props.entry,
  (entry) => entry && registration.reset(entry.membership.teamId, entry.membership.shirtNumber),
)

async function save() {
  const entry = props.entry
  if (!entry) return
  const assignment = registration.validate(entry.player.id)
  if (!assignment) return
  const moving = assignment.teamId !== entry.membership.teamId
  const transferReason = moving
    ? await ask({
        title: 'Motivo del cambio de equipo',
        message: `${fullName(entry.player)} dejará su equipo actual en este torneo. El motivo queda en el historial de la plantilla.`,
        label: 'Motivo',
        placeholder: 'Ej. Pidió el cambio por horario',
        confirmLabel: 'Cambiar de equipo',
      })
    : null
  if (moving && transferReason === null) return
  saving.value = true
  try {
    if (!(await guarded.register(entry.player.id, { ...assignment, fromTeamId: entry.membership.teamId, ...(transferReason ? { transferReason } : {}) }))) return
    toast.success(assignment.teamId === entry.membership.teamId ? 'Participación actualizada.' : 'Jugador cambiado de equipo.')
    emit('close')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function annul() {
  const entry = props.entry
  if (!entry) return
  const reason = await ask({
    title: 'Anular el cambio de equipo',
    message: `${fullName(entry.player)} vuelve a ${fromTeamName.value} como estaba. Solo se puede si no jugó ni figuró en una ficha con el equipo nuevo. El cambio anulado queda en el historial de la plantilla y deja de mostrarse en su perfil.`,
    label: 'Motivo de la anulación',
    placeholder: 'Ej. Se cargó en el equipo equivocado',
    confirmLabel: 'Anular el cambio',
  })
  if (reason === null) return
  saving.value = true
  try {
    await players.annulTransfer(props.tournamentId, entry.player.id, reason)
    toast.success(`Cambio anulado: volvió a ${fromTeamName.value}.`)
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
    :open="!!entry"
    title="Equipo y dorsal en este torneo"
    :description="entry ? `${fullName(entry.player)} · solo cambia su participación en ${tournaments.get(tournamentId)?.name ?? 'este torneo'}.` : undefined"
    @close="saving || emit('close')"
  >
    <RegistrationFields v-model="registration.draft" :teams="teams" :errors="registration.errors" id-prefix="participation" :allow-retroactive="guarded.canExceptions.value" />
    <p v-if="entry && registration.draft.teamId && registration.draft.teamId !== entry.membership.teamId" class="mt-3 text-xs text-amber-700">
      Cambio de equipo: su participación actual se cierra {{ registration.draft.startDate ? `el ${registration.draft.startDate}` : 'hoy' }} y se abre una nueva. Sus partidos anteriores siguen contando con su equipo de entonces; no podrá jugar con los dos equipos en la misma fecha.
    </p>
    <p v-if="canTeams && fromTeamName" class="mt-3 text-xs text-zinc-500">
      Viene de {{ fromTeamName }}. Si el cambio fue un error, puedes anularlo.
    </p>
    <RouterLink
      v-if="canTeams && entry"
      :to="{ name: 'admin-tournament-history', params: { id: tournamentId }, query: { playerId: entry.player.id } }"
      class="mt-3 inline-block text-xs font-semibold text-pitch-700 hover:underline"
      @click="emit('close')"
    >
      Ver su historial en el torneo
    </RouterLink>
    <template #footer>
      <AppButton v-if="canTeams && fromTeamName" variant="secondary" class="sm:mr-auto" :disabled="saving" @click="annul">Anular cambio</AppButton>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton :loading="saving" @click="save">Guardar</AppButton>
    </template>
  </BaseModal>
</template>
