<script setup lang="ts">
import { ref } from 'vue'
import { ExternalLink, Trophy, UserMinus, UserPlus } from 'lucide-vue-next'
import type { TeamTournamentEntry } from '@/types'
import { teamManagementService } from '@/services'
import { useTeamManagement } from '@/composables/useTeamManagement'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { MODALITY_LABELS, POSITION_LABELS, TOURNAMENT_STATUS } from '@/utils/labels'
import { formatDateRange, plural } from '@/utils/format'
import { fullName } from '@/utils/players'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import TournamentPlayersDialog from '@/components/admin/team/TournamentPlayersDialog.vue'

/**
 * Torneos donde juega el equipo y su plantilla en cada uno. Propietario y delegados inscriben a
 * jugadores de la plantilla global o los dan de baja; el servidor aplica los límites del
 * organizador (máximo de jugadores, dorsal libre) y deja el historial intacto.
 */
const { team, teamId, tournaments, reloadTournaments, actionFailed } = useTeamManagement()
const { confirm } = useConfirm()
const toast = useToast()
const adding = ref<TeamTournamentEntry | null>(null)
const busy = ref<string | null>(null)

async function remove(entry: TeamTournamentEntry, row: TeamTournamentEntry['players'][number]) {
  const name = fullName(row.player)
  const ok = await confirm({
    title: `¿Dar de baja a ${name} de ${entry.tournament.name}?`,
    message: `Dejará de estar en la plantilla de ${team.value?.name} en este torneo. Sus partidos y estadísticas jugados se conservan, y puedes volver a inscribirlo.`,
    confirmLabel: 'Dar de baja',
    tone: 'danger',
  })
  if (!ok) return
  busy.value = `${entry.tournament.id}:${row.player.id}`
  try {
    await teamManagementService.unregisterFromTournament(teamId(), entry.tournament.id, row.player.id)
    await reloadTournaments()
    toast.success(`${name} ya no está inscrito en ${entry.tournament.name}.`)
  } catch (e) {
    toast.error(await actionFailed(e))
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section aria-labelledby="tournaments-title">
    <div class="mb-4">
      <h2 id="tournaments-title" class="text-xl font-bold">Torneos</h2>
      <p class="text-sm text-zinc-500">Dónde juega {{ team?.name }} y quién está inscrito en cada torneo.</p>
    </div>

    <ul v-if="tournaments.length" class="space-y-4">
      <li v-for="entry in tournaments" :key="entry.tournament.id" class="card overflow-hidden">
        <header class="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-4">
          <div class="min-w-0">
            <div class="mb-1 flex flex-wrap items-center gap-2">
              <StatusBadge :label="TOURNAMENT_STATUS[entry.tournament.status].label" :tone="TOURNAMENT_STATUS[entry.tournament.status].tone" />
              <span class="text-xs text-zinc-500">{{ MODALITY_LABELS[entry.tournament.modality] }} · {{ entry.tournament.category }}</span>
            </div>
            <RouterLink :to="{ name: 'tournament', params: { id: entry.tournament.id } }" class="inline-flex items-center gap-1 text-lg font-bold text-zinc-950 hover:text-pitch-700">
              {{ entry.tournament.name }} <ExternalLink class="size-4 text-zinc-400" aria-hidden="true" />
            </RouterLink>
            <p class="text-sm text-zinc-600">
              {{ formatDateRange(entry.tournament.startDate, entry.tournament.endDate) }} ·
              {{ plural(entry.players.length, 'jugador inscrito', 'jugadores inscritos') }}<template v-if="entry.maxPlayers !== null"> de {{ entry.maxPlayers }}</template>
            </p>
          </div>
          <AppButton v-if="entry.editable" :disabled="entry.maxPlayers !== null && entry.players.length >= entry.maxPlayers" @click="adding = entry">
            <UserPlus class="size-4" aria-hidden="true" /> Inscribir jugadores
          </AppButton>
        </header>

        <ul v-if="entry.players.length" class="divide-y divide-zinc-100">
          <li v-for="row in entry.players" :key="row.player.id" class="flex items-center gap-3 px-4 py-2.5">
            <span class="tabular w-8 shrink-0 text-center font-display text-lg font-bold text-zinc-400">{{ row.jerseyNumber ?? '–' }}</span>
            <PlayerAvatar :player="row.player" size="sm" decorative />
            <div class="min-w-0 flex-1">
              <RouterLink :to="{ name: 'player', params: { id: row.player.id } }" class="block truncate font-semibold text-zinc-900 hover:text-pitch-700">{{ fullName(row.player) }}</RouterLink>
              <p class="text-xs text-zinc-500">{{ POSITION_LABELS[row.player.position] }}</p>
            </div>
            <AppButton
              v-if="entry.editable"
              variant="ghost"
              size="sm"
              :loading="busy === `${entry.tournament.id}:${row.player.id}`"
              :aria-label="`Dar de baja a ${fullName(row.player)} de ${entry.tournament.name}`"
              @click="remove(entry, row)"
            >
              <UserMinus class="size-4" aria-hidden="true" /><span class="max-sm:sr-only">Dar de baja</span>
            </AppButton>
          </li>
        </ul>
        <p v-else class="px-4 py-5 text-sm text-zinc-500">
          {{ entry.editable ? 'Todavía no hay jugadores inscritos. Inscribe a los de tu plantilla para que puedan jugar.' : 'Sin jugadores registrados.' }}
        </p>
      </li>
    </ul>
    <EmptyState
      v-else
      :icon="Trophy"
      title="Tu equipo no juega ningún torneo todavía"
      description="Cuando un organizador lo inscriba o apruebe vuestra solicitud por enlace, el torneo aparecerá aquí y podrás inscribir a tus jugadores."
      class="card"
    />

    <TournamentPlayersDialog v-if="adding" :open="!!adding" :entry="tournaments.find((t) => t.tournament.id === adding!.tournament.id) ?? adding" @close="adding = null" @done="adding = null" />
  </section>
</template>
