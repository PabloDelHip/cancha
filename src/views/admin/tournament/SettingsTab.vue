<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Archive, Flag, Play } from 'lucide-vue-next'
import type { Tournament, TournamentInput, UploadProgress } from '@/types'
import { useMatchesStore, useTournamentsStore } from '@/stores'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useTournamentLifecycle } from '@/composables/useTournamentLifecycle'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { getErrorMessage, getErrorStatus, tournamentService } from '@/services'
import { useRoundsStore } from '@/stores'
import { TOURNAMENT_STATUS } from '@/utils/labels'
import AppButton from '@/components/common/AppButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import TournamentForm from '@/components/tournaments/TournamentForm.vue'

const props = defineProps<{ id: string }>()

const tournaments = useTournamentsStore()
const matches = useMatchesStore()
const { tournament, readOnly } = useTournamentWorkspace(() => props.id)
const { start, askFinish } = useTournamentLifecycle()
const toast = useToast()
const { confirm } = useConfirm()
const rounds = useRoundsStore()
const saving = ref(false)
const editableTournament = ref<Tournament | null>(null)
const detailsError = ref<string | null>(null)
async function loadDetails() {
  const id = props.id
  editableTournament.value = null
  detailsError.value = null
  try {
    const data = await tournamentService.getOwned(id)
    if (props.id === id) editableTournament.value = data
  } catch (e) { if (props.id === id) detailsError.value = getErrorMessage(e) }
}
watch(() => props.id, loadDetails, { immediate: true })
async function uploadLogo(image: Blob, onProgress: UploadProgress) {
  const updated = await tournamentService.uploadLogo(props.id, image, onProgress)
  editableTournament.value = updated
  tournaments.replace(updated)
}
async function removeLogo() {
  const updated = await tournamentService.removeLogo(props.id)
  editableTournament.value = updated
  tournaments.replace(updated)
}
/** Cambiar la clave fuerza a re-montar el formulario con los datos guardados. */
const formKey = ref(0)

const hasResults = computed(() => matches.ofTournament(props.id).some((m) => m.status === 'finished'))
const settingsNote = computed(() => (readOnly.value ? 'El torneo está finalizado: su configuración queda como estaba.' : undefined))

async function onSubmit(input: TournamentInput) {
  saving.value = true
  try {
    editableTournament.value = await tournaments.update(props.id, input)
    formKey.value++
    toast.success('Configuración guardada.')
  } catch (e) {
    // Cambiar el formato con un calendario generado (sin jugar) exige confirmar que se borra.
    if (getErrorStatus(e) === 409 && /resetSchedule/.test(getErrorMessage(e))) {
      const ok = await confirm({
        title: '¿Cambiar el formato y borrar el calendario?',
        message: 'El torneo tiene un calendario generado sin partidos jugados. Se borrarán sus partidos y jornadas y tendrás que generarlo de nuevo con el formato nuevo.',
        confirmLabel: 'Cambiar formato',
        tone: 'danger',
      })
      if (ok) {
        try {
          editableTournament.value = await tournaments.update(props.id, input, { resetSchedule: true })
          await Promise.all([matches.ensure(true), rounds.ensure(true)])
          formKey.value++
          toast.success('Formato cambiado. Genera el calendario de nuevo.')
        } catch (err) {
          toast.error(getErrorMessage(err))
        }
      }
    } else toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

const steps = [
  { status: 'draft', title: 'Borrador', text: 'Configuras el torneo, inscribes equipos y armas el calendario.' },
  { status: 'active', title: 'En curso', text: 'Se juegan los partidos y capturas resultados.' },
  { status: 'finished', title: 'Finalizado', text: 'Histórico de solo lectura: tabla final, resultados y estadísticas.' },
] as const
</script>

<template>
  <div v-if="tournament" class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
    <section class="card p-5 sm:p-6" aria-label="Configuración del torneo">
      <ErrorState v-if="detailsError" :message="detailsError" @retry="loadDetails" />
      <LoadingState v-else-if="!editableTournament" />
      <TournamentForm
        v-else
        :key="formKey"
        form-id="settings-form"
        :initial="editableTournament"
        :upload-logo="uploadLogo"
        :remove-logo="removeLogo"
        :settings-editable="!readOnly"
        :settings-note="settingsNote"
        :has-results="hasResults"
        :disabled="readOnly || saving"
        @submit="onSubmit"
      />
      <div v-if="!readOnly && editableTournament" class="mt-6 flex justify-end border-t border-zinc-100 pt-4">
        <AppButton type="submit" form="settings-form" :loading="saving">Guardar configuración</AppButton>
      </div>
    </section>

    <aside class="space-y-4">
      <section class="card p-5" aria-labelledby="life-title">
        <h2 id="life-title" class="mb-3 font-bold">Estado del torneo</h2>
        <ol class="space-y-3">
          <li v-for="s in steps" :key="s.status" class="flex gap-3" :class="tournament.status !== s.status && 'opacity-50'">
            <StatusBadge v-bind="TOURNAMENT_STATUS[s.status]" />
            <p class="text-xs text-zinc-600">{{ s.text }}</p>
          </li>
        </ol>
        <div class="mt-4 border-t border-zinc-100 pt-4">
          <AppButton v-if="tournament.status === 'draft'" class="w-full" @click="start(tournament.id)">
            <Play class="size-4" aria-hidden="true" /> Iniciar torneo
          </AppButton>
          <template v-else-if="tournament.status === 'active'">
            <p class="mb-3 text-xs text-zinc-500">
              Al finalizar, el torneo pasa a ser historial: no se borra nada, pero ya no se capturan resultados ni se cambian plantillas.
            </p>
            <AppButton variant="danger" class="w-full" @click="askFinish(tournament.id)">
              <Flag class="size-4" aria-hidden="true" /> Finalizar torneo…
            </AppButton>
          </template>
          <p v-else class="flex items-start gap-2 text-sm text-zinc-600">
            <Archive class="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden="true" /> Finalizado. Consulta su historial desde las pestañas.
          </p>
        </div>
      </section>
    </aside>
  </div>
</template>
