<script setup lang="ts">
import { computed, ref } from 'vue'
import { GitBranch } from 'lucide-vue-next'
import type { Team, TournamentStructure } from '@/types'
import { useMatchesStore, useRoundsStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentStructure } from '@/composables/useTournamentStructure'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useToast } from '@/composables/useToast'
import { pointsRuleLabel, SYSTEM_LABELS, TIEBREAKERS } from '@/utils/labels'
import CompetitionView from '@/components/tournaments/structure/CompetitionView.vue'
import AdvancePhaseDialog from '@/components/admin/workspace/AdvancePhaseDialog.vue'
import TieDialog from '@/components/admin/workspace/TieDialog.vue'
import { useConfirm } from '@/composables/useConfirm'
import { getErrorMessage, tournamentService } from '@/services'
import AppButton from '@/components/common/AppButton.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

const props = defineProps<{ id: string }>()
const stats = useTournamentStats(() => props.id)
const { structure, loading, error, reload } = useTournamentStructure(() => props.id)
const { readOnly } = useTournamentWorkspace(() => props.id)
const matches = useMatchesStore()
const rounds = useRoundsStore()
const toast = useToast()
const advancing = ref(false)
const teamsStore = useTeamsStore()
const tournaments = useTournamentsStore()
const { confirm } = useConfirm()
const enrolled = computed(() =>
  tournaments
    .teamIdsOf(props.id)
    .map((id) => teamsStore.get(id))
    .filter((t): t is Team => !!t)
    .sort((a, b) => a.name.localeCompare(b.name)),
)

// ─── Cuadro armado a mano: agregar / quitar cruces ───────────────────────
const tieTarget = ref<{ phase: number; round: number } | null>(null)
const tiePhase = computed(() => {
  const p = structure.value?.phases.find((x) => x.index === tieTarget.value?.phase)
  return p?.type === 'knockout' ? p : null
})
async function applyStructure(next: TournamentStructure) {
  structure.value = next
  await Promise.all([matches.ensure(true), rounds.ensure(true)])
}
async function onTieCreated(next: TournamentStructure) {
  tieTarget.value = null
  await applyStructure(next)
  toast.success('Cruce agregado. Sus partidos ya están en el calendario.')
}
async function removeTie(phase: number, round: number, slot: number) {
  const ok = await confirm({ title: '¿Quitar este cruce?', message: 'Se eliminan sus partidos (aún sin resultado). Podrás armarlo de nuevo.', confirmLabel: 'Quitar cruce', tone: 'danger' })
  if (!ok) return
  try {
    await applyStructure(await tournamentService.deleteTie(props.id, phase, round, slot))
    toast.success('Cruce quitado.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}

const system = computed(() => stats.tournament.value?.settings.system ?? 'league')
const canAdvance = computed(() => !readOnly.value && stats.tournament.value?.status === 'active' && !!structure.value?.next)

async function onAdvanced(next: TournamentStructure) {
  advancing.value = false
  await applyStructure(next)
  const ko = next.phases.at(-1)
  toast.success(ko?.type === 'knockout' && ko.manual ? 'Cuadro listo: agrega los cruces de cada ronda.' : 'Eliminatoria generada.')
}
</script>

<template>
  <section aria-labelledby="st-title">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 id="st-title" class="text-xl font-bold">{{ system === 'league' ? (stats.tournament.value?.status === 'finished' ? 'Tabla final' : 'Tabla de posiciones') : 'Competición' }}</h2>
        <p class="text-sm text-zinc-500">{{ SYSTEM_LABELS[system] }} · {{ stats.playedCount.value }} partidos finalizados · se actualiza al capturar cada resultado</p>
      </div>
      <AppButton v-if="canAdvance" @click="advancing = true"><GitBranch class="size-4" aria-hidden="true" /> Armar eliminatoria</AppButton>
    </div>
    <p v-if="canAdvance && structure?.next && !structure.next.ready" class="mb-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
      Con los clasificados: {{ structure.next.blockers.join('. ') }}. También puedes armar la eliminatoria a mano.
    </p>

    <LoadingState v-if="loading" label="Cargando competición…" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />
    <CompetitionView
      v-else-if="structure"
      :structure="structure"
      :editable="!readOnly"
      @add-tie="(phase, round) => (tieTarget = { phase, round })"
      @remove-tie="removeTie"
    />

    <p v-if="system !== 'knockout'" class="mt-3 text-xs text-zinc-500">
      {{ pointsRuleLabel(stats.pointsRule.value) }} · Orden: {{ TIEBREAKERS.join(' → ') }}. Solo cuentan partidos finalizados;
      programados, pospuestos y cancelados no suman. Si el empate persiste, decide el organizador (nunca el nombre).
    </p>

    <AdvancePhaseDialog v-if="structure" :open="advancing" :tournament-id="id" :structure="structure" :team-count="enrolled.length" @close="advancing = false" @done="onAdvanced" />
    <TieDialog
      v-if="tiePhase && tieTarget"
      :open="!!tieTarget"
      :tournament-id="id"
      :phase="tiePhase"
      :round="tieTarget.round"
      :teams="enrolled"
      :default-venue="stats.tournament.value?.venue"
      @close="tieTarget = null"
      @done="onTieCreated"
    />
  </section>
</template>
