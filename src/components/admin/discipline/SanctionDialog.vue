<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { DisciplineOverview, ID, Match, Sanction } from '@/types'
import { useMatchesStore, usePlayersStore, useRoundsStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { disciplineService, getErrorMessage } from '@/services'
import { fullName } from '@/utils/players'
import { formatDate } from '@/utils/format'
import { SANCTION_CAUSE } from '@/utils/labels'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

export type SanctionDialogMode = 'create' | 'edit' | 'annul' | 'restore'

/**
 * Registrar una sanción manual, corregirla o anularla/reactivarla. Toda corrección lleva
 * justificación y queda en el historial (el servidor la registra).
 */
const props = defineProps<{ open: boolean; tournamentId: ID; mode: SanctionDialogMode; sanction: Sanction | null; refs: DisciplineOverview['refs'] | null }>()
const emit = defineEmits<{ close: []; saved: [overview: DisciplineOverview] }>()

const tournaments = useTournamentsStore()
const teams = useTeamsStore()
const players = usePlayersStore()
const matches = useMatchesStore()
const rounds = useRoundsStore()
const toast = useToast()
const saving = ref(false)

const form = reactive({ teamId: '', playerId: '', matchId: '', matches: 1, reason: '', useRule: false, justification: '' })

const teamOptions = computed(() => tournaments.teamIdsOf(props.tournamentId).map((id) => ({ id, name: teams.nameOf(id) })).sort((a, b) => a.name.localeCompare(b.name)))
const playerOptions = computed(() =>
  form.teamId ? players.rosterOf(form.teamId, props.tournamentId).map((e) => ({ id: e.player.id, name: fullName(e.player) })).sort((a, b) => a.name.localeCompare(b.name)) : [],
)
const teamId = computed(() => (props.mode === 'create' ? form.teamId : props.sanction?.teamId))
const matchOptions = computed(() =>
  teamId.value
    ? matches
        .ofTournament(props.tournamentId)
        .filter((m) => m.status !== 'cancelled' && (m.homeTeamId === teamId.value || m.awayTeamId === teamId.value))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    : [],
)
const matchLabel = (m: Match) => {
  const rival = m.homeTeamId === teamId.value ? m.awayTeamId : m.homeTeamId
  return `${rounds.labelOf(props.tournamentId, m.round)} · ${formatDate(m.date)} · vs ${teams.nameOf(rival)}`
}

const who = computed(() => {
  const s = props.sanction
  if (!s || !props.refs) return ''
  const p = props.refs.players[s.playerId]
  return `${p ? fullName(p) : 'Jugador'} · ${SANCTION_CAUSE[s.cause]}`
})
const title = computed(
  () => ({ create: 'Nueva sanción', edit: 'Corregir sanción', annul: 'Anular sanción', restore: 'Reactivar sanción' })[props.mode],
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const s = props.sanction
    Object.assign(form, {
      teamId: s?.teamId ?? '',
      playerId: s?.playerId ?? '',
      matchId: s?.kind === 'manual' ? s.matchId : (matchOptions.value.find((m) => m.status === 'scheduled')?.id ?? ''),
      matches: s?.matches ?? 1,
      reason: s?.reason ?? '',
      useRule: false,
      justification: '',
    })
  },
)
// Al cambiar de equipo se proponen su jugador y su próximo partido de nuevo.
watch(() => form.teamId, () => {
  if (props.mode !== 'create') return
  form.playerId = ''
  form.matchId = matchOptions.value.find((m) => m.status === 'scheduled')?.id ?? ''
})

async function save() {
  const s = props.sanction
  saving.value = true
  try {
    let overview: DisciplineOverview
    if (props.mode === 'create') {
      overview = await disciplineService.create(props.tournamentId, { playerId: form.playerId, teamId: form.teamId, matchId: form.matchId, matches: Number(form.matches), reason: form.reason.trim() })
    } else if (props.mode === 'edit' && s) {
      overview = await disciplineService.update(
        props.tournamentId,
        s.ref,
        s.kind === 'auto'
          ? { matches: form.useRule ? null : Number(form.matches), justification: form.justification.trim() }
          : { matches: Number(form.matches), reason: form.reason.trim(), matchId: form.matchId, justification: form.justification.trim() },
      )
    } else if (s) {
      overview = await (props.mode === 'annul' ? disciplineService.annul : disciplineService.restore)(props.tournamentId, s.ref, form.justification.trim())
    } else return
    toast.success(
      { create: 'Sanción registrada.', edit: 'Sanción corregida.', annul: 'Sanción anulada.', restore: 'Sanción reactivada.' }[props.mode],
    )
    emit('saved', overview)
    emit('close')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" :title="title" :description="who || 'La sanción aplica desde el partido que elijas (incluido).'" @close="saving || emit('close')">
    <form id="sanction-form" class="space-y-4" @submit.prevent="save">
      <template v-if="mode === 'create'">
        <FormField id="sanction-team" label="Equipo">
          <select id="sanction-team" v-model="form.teamId" class="input" required>
            <option value="" disabled>Elige un equipo</option>
            <option v-for="t in teamOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </FormField>
        <FormField id="sanction-player" label="Jugador">
          <select id="sanction-player" v-model="form.playerId" class="input" required :disabled="!form.teamId">
            <option value="" disabled>Elige un jugador</option>
            <option v-for="p in playerOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </FormField>
      </template>

      <template v-if="mode === 'create' || mode === 'edit'">
        <FormField v-if="mode === 'create' || sanction?.kind === 'manual'" id="sanction-match" label="Aplica desde el partido" hint="Ese partido es el primero que no puede jugar.">
          <select id="sanction-match" v-model="form.matchId" class="input" required :disabled="!teamId">
            <option value="" disabled>Elige un partido</option>
            <option v-for="m in matchOptions" :key="m.id" :value="m.id">{{ matchLabel(m) }}</option>
          </select>
        </FormField>
        <label v-if="sanction?.kind === 'auto'" class="flex items-center gap-2 text-sm">
          <input v-model="form.useRule" type="checkbox" class="size-4 accent-pitch-700" />
          Usar lo que marca el reglamento ({{ sanction.ruleMatches }} {{ sanction.ruleMatches === 1 ? 'partido' : 'partidos' }})
        </label>
        <FormField id="sanction-matches" label="Partidos de suspensión">
          <input id="sanction-matches" v-model.number="form.matches" type="number" inputmode="numeric" min="1" max="50" class="input" required :disabled="form.useRule" />
        </FormField>
        <FormField v-if="mode === 'create' || sanction?.kind === 'manual'" id="sanction-reason" label="Motivo">
          <textarea id="sanction-reason" v-model="form.reason" class="input min-h-20" minlength="3" maxlength="500" required placeholder="Ej. Agresión a un rival tras el silbatazo final" />
        </FormField>
      </template>

      <FormField v-if="mode !== 'create'" id="sanction-justification" label="Justificación" hint="Queda en el historial disciplinario.">
        <textarea id="sanction-justification" v-model="form.justification" class="input min-h-20" minlength="3" maxlength="500" required autofocus />
      </FormField>
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="sanction-form" :loading="saving" :variant="mode === 'annul' ? 'danger' : 'primary'">
        {{ { create: 'Registrar sanción', edit: 'Guardar corrección', annul: 'Anular sanción', restore: 'Reactivar' }[mode] }}
      </AppButton>
    </template>
  </BaseModal>
</template>
