<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ID, Team } from '@/types'
import { usePlayersStore, useTournamentsStore, type RosterEntry } from '@/stores'
import { useRegistration } from '@/composables/useRegistration'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/services'
import { fullName } from '@/utils/players'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import RegistrationFields from '@/components/admin/RegistrationFields.vue'

/**
 * Cambia el dorsal o el equipo de un jugador DENTRO de este torneo. Cambiar de equipo cierra
 * la participación actual y abre otra: el historial se conserva. Otros torneos no se tocan.
 */
const props = defineProps<{ entry: RosterEntry | null; tournamentId: ID; teams: Team[] }>()
const emit = defineEmits<{ close: [] }>()

const players = usePlayersStore()
const tournaments = useTournamentsStore()
const toast = useToast()
const registration = useRegistration(() => props.tournamentId)
const saving = ref(false)

watch(
  () => props.entry,
  (entry) => entry && registration.reset(entry.membership.teamId, entry.membership.shirtNumber),
)

async function save() {
  const entry = props.entry
  if (!entry) return
  const assignment = registration.validate(entry.player.id)
  if (!assignment) return
  saving.value = true
  try {
    await players.register(entry.player.id, assignment)
    toast.success(assignment.teamId === entry.membership.teamId ? 'Dorsal actualizado.' : 'Jugador cambiado de equipo.')
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
    <RegistrationFields v-model="registration.draft" :teams="teams" :errors="registration.errors" id-prefix="participation" />
    <p v-if="entry && registration.draft.teamId && registration.draft.teamId !== entry.membership.teamId" class="mt-3 text-xs text-amber-700">
      Cambio de equipo: su participación actual se cierra hoy y se abre una nueva. Sus partidos anteriores siguen contando con su equipo de entonces.
    </p>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton :loading="saving" @click="save">Guardar</AppButton>
    </template>
  </BaseModal>
</template>
