<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import type { Match, MatchInput, MatchStatus, ReschedulePreview } from '@/types'
import { getErrorBody, getErrorMessage, matchService, USE_MOCKS } from '@/services'
import { useMatchesStore, useRoundsStore } from '@/stores'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useToast } from '@/composables/useToast'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import MatchForm from '@/components/matches/MatchForm.vue'
import ReschedulePreviewDialog from './ReschedulePreviewDialog.vue'

/**
 * Programar o editar un partido, con la reprogramación segura de 2C-2: al moverlo de horario se
 * revisa antes qué cancha y árbitros chocan; solo eso se libera y solo si el organizador lo
 * confirma (si algo cambió mientras tanto, se muestra la vista previa nueva). Lo usan el
 * Calendario del torneo y la Agenda global: una sola implementación.
 */
const props = defineProps<{
  open: boolean
  tournamentId: string
  /** null = programar uno nuevo. */
  match: Match | null
  defaultRound: number
  defaultStatus?: MatchStatus
  groups?: { key: string; teamIds: string[] }[]
  /** Mostrar "Eliminar" (lo decide la vista: depende del formato y del resultado). */
  canDelete?: boolean
}>()
const emit = defineEmits<{ close: []; saved: [match: Match]; remove: [] }>()

const matches = useMatchesStore()
const roundsStore = useRoundsStore()
const toast = useToast()
const stats = useTournamentStats(() => (props.open ? props.tournamentId : ''))

const saving = ref(false)
const previewing = ref<{ input: MatchInput; preview: ReschedulePreview; stale: boolean } | null>(null)
const confirming = ref(false)

const title = computed(() =>
  props.match ? (props.defaultStatus === 'scheduled' && ['postponed', 'suspended'].includes(props.match.status) ? 'Reprogramar partido' : 'Editar partido') : 'Programar partido',
)

const RESERVING: MatchStatus[] = ['scheduled', 'live', 'finished', 'suspended']
/** Cambia el horario que ocupa (o vuelve a ocuparlo, p. ej. un pospuesto o suspendido que se reprograma). */
function movesSlot(m: Match, input: MatchInput) {
  const reserved = RESERVING.includes(m.status) && m.status !== 'suspended'
  return RESERVING.includes(input.status) && (input.date !== m.date || input.time !== m.time || !reserved)
}
/** Una confirmación obsoleta (409 RESCHEDULE_STALE) trae la vista previa nueva. */
function staleFrom(e: unknown, input: MatchInput) {
  const body = getErrorBody<{ error?: string; preview?: ReschedulePreview }>(e)
  if (body?.error !== 'RESCHEDULE_STALE' || !body.preview) return false
  previewing.value = { input, preview: body.preview, stale: true }
  return true
}

async function persist(input: MatchInput) {
  const saved = props.match ? await matches.update(props.match.id, input) : await matches.create(input)
  // El servidor crea el registro de la jornada al programar/mover: se refrescan las jornadas.
  await roundsStore.ensure(true)
  emit('saved', saved)
}
const savedMessage = (input: MatchInput) =>
  props.match ? (props.match.round !== input.round ? `Partido movido a ${roundsStore.labelOf(props.tournamentId, input.round)}.` : 'Partido actualizado.') : 'Partido programado.'

async function onSubmit(input: MatchInput) {
  const current = props.match
  if (current && !USE_MOCKS && movesSlot(current, input)) {
    let preview: ReschedulePreview
    try {
      preview = await matchService.reschedulePreview(current.id, input)
    } catch (e) {
      toast.error(getErrorMessage(e))
      return
    }
    if (preview.needsConfirmation) {
      previewing.value = { input, preview, stale: false }
      return
    }
    // Sin nada que liberar: se guarda con la confirmación vacía (si algo cambió, el servidor avisa).
    input = { ...input, release: preview.release }
  }
  saving.value = true
  try {
    await persist(input)
    toast.success(savedMessage(input))
    emit('close')
  } catch (e) {
    if (!(current && staleFrom(e, input))) toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function confirmReschedule() {
  const p = previewing.value
  if (!p || !props.match) return
  confirming.value = true
  const input = { ...p.input, release: p.preview.release }
  try {
    await persist(input)
    previewing.value = null
    emit('close')
    toast.success('Partido reprogramado. Lo liberado quedó en el historial.')
  } catch (e) {
    if (!staleFrom(e, input)) toast.error(getErrorMessage(e))
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" :title="title" size="lg" @close="saving || emit('close')">
    <MatchForm
      v-if="open"
      form-id="match-form"
      :initial="match"
      :tournament-id="tournamentId"
      :teams="stats.teams.value"
      :rounds="stats.roundViews.value"
      :default-round="defaultRound"
      :default-status="defaultStatus"
      :default-venue="stats.tournament.value?.venue"
      :groups="groups?.length ? groups : undefined"
      @submit="onSubmit"
    />
    <template #footer>
      <AppButton v-if="canDelete" variant="ghost" class="mr-auto text-red-700" :disabled="saving" @click="emit('remove')">
        <Trash2 class="size-4" aria-hidden="true" /> Eliminar
      </AppButton>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="match-form" :loading="saving">{{ match ? 'Guardar cambios' : 'Programar partido' }}</AppButton>
    </template>
  </BaseModal>
  <!-- Después del formulario: se abre encima de él. -->
  <ReschedulePreviewDialog
    :open="!!previewing"
    :preview="previewing?.preview ?? null"
    :stale="previewing?.stale"
    :busy="confirming"
    @close="previewing = null"
    @confirm="confirmReschedule"
  />
</template>
