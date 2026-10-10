<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { ArrowLeftRight, ChevronLeft, ExternalLink, History, Lock, Pencil, Shield, UserMinus, UserPlus, Users } from 'lucide-vue-next'
import type { Player, PlayerInput, Team } from '@/types'
import { usePlayersStore, useTeamsStore, useTournamentsStore, type RosterEntry } from '@/stores'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useEditor } from '@/composables/useEditor'
import { useRosterActions } from '@/composables/useRosterActions'
import { fullName } from '@/utils/players'
import { formatDate, plural } from '@/utils/format'
import { POSITION_LABELS } from '@/utils/labels'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import PlayerForm from '@/components/players/PlayerForm.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import AddPlayerDialog from '@/components/admin/AddPlayerDialog.vue'
import ParticipationDialog from '@/components/admin/workspace/ParticipationDialog.vue'

/**
 * Plantilla de un equipo EN ESTE TORNEO. El jugador es global; aquí se administra su
 * participación (alta, dorsal, cambio de equipo, baja). Las bajas conservan el historial.
 */
const props = defineProps<{ id: string; teamId: string }>()

const players = usePlayersStore()
const teams = useTeamsStore()
const tournaments = useTournamentsStore()
const { tournament, readOnly } = useTournamentWorkspace(() => props.id)
const { unregister } = useRosterActions(() => props.id)
const editor = useEditor<Player>({ openOnNew: false })

const team = computed(() => teams.get(props.teamId))
const enrolled = computed(() => tournaments.teamIdsOf(props.id).includes(props.teamId))
const tournamentTeams = computed(() =>
  tournaments
    .teamIdsOf(props.id)
    .map((teamId) => teams.get(teamId))
    .filter((t): t is Team => Boolean(t))
    .sort((a, b) => a.name.localeCompare(b.name)),
)
const roster = computed(() => players.rosterOf(props.teamId, props.id))
/** Quienes estuvieron en esta plantilla y ya no (baja o cambio de equipo). */
const former = computed(() =>
  players.memberships
    .filter((m) => m.tournamentId === props.id && m.teamId === props.teamId && m.status === 'ended')
    .filter((m) => !roster.value.some((e) => e.player.id === m.playerId))
    .map((membership) => ({ membership, player: players.get(membership.playerId) }))
    .filter((e): e is RosterEntry => Boolean(e.player))
    .sort((a, b) => (b.membership.endDate ?? '').localeCompare(a.membership.endDate ?? '')),
)

const adding = ref(false)
const moving = shallowRef<RosterEntry | null>(null)

function onSubmitProfile(input: PlayerInput) {
  const current = editor.current.value
  if (current) editor.save(() => players.update(current.id, input), 'Ficha del jugador actualizada.')
}
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'admin-tournament-teams', params: { id } }" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-900">
      <ChevronLeft class="size-4" aria-hidden="true" /> Equipos
    </RouterLink>

    <EmptyState v-if="!team || !enrolled" :icon="Shield" title="Este equipo no está inscrito en el torneo" class="card">
      <AppButton :to="{ name: 'admin-tournament-teams', params: { id } }" variant="secondary">Ver equipos inscritos</AppButton>
    </EmptyState>

    <template v-else>
      <header class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <TeamLogo :team="team" size="lg" />
        <div class="min-w-0 flex-1">
          <h2 class="text-2xl font-bold">{{ team.name }}</h2>
          <p class="text-sm text-zinc-500">Plantilla — {{ tournament?.name }} · {{ plural(roster.length, 'jugador') }}</p>
          <p v-if="!teams.canEdit(team.id)" class="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500">
            <Lock class="size-3" aria-hidden="true" /> Ficha administrada por otro organizador · tú administras su plantilla en este torneo
          </p>
        </div>
        <div class="flex gap-2">
          <AppButton variant="ghost" :to="{ name: 'team', params: { id: team.id } }" :aria-label="`Ver ${team.name} en el sitio público`">
            <ExternalLink class="size-4" aria-hidden="true" />
          </AppButton>
          <AppButton v-if="!readOnly" @click="adding = true"><UserPlus class="size-4" aria-hidden="true" /> Agregar jugador</AppButton>
        </div>
      </header>

      <ul v-if="roster.length" class="card divide-y divide-zinc-100 overflow-hidden">
        <li v-for="entry in roster" :key="entry.membership.id" class="flex items-center gap-3 px-4 py-3">
          <span class="tabular w-8 shrink-0 text-center font-display text-2xl font-bold text-zinc-400">{{ entry.membership.shirtNumber ?? '–' }}</span>
          <PlayerAvatar :player="entry.player" :color="team.colors.primary" size="sm" decorative />
          <div class="min-w-0 flex-1">
            <RouterLink :to="{ name: 'player', params: { id: entry.player.id } }" class="block truncate font-semibold hover:text-pitch-700">
              {{ fullName(entry.player) }}
            </RouterLink>
            <p class="truncate text-xs text-zinc-500">
              {{ POSITION_LABELS[entry.player.position] }}<template v-if="entry.player.age !== null"> · {{ entry.player.age }} años</template>
              <template v-if="!players.canEdit(entry.player.id)"> · <Lock class="inline size-3" aria-hidden="true" /> ficha de otro organizador</template>
            </p>
          </div>
          <div v-if="!readOnly" class="flex shrink-0 gap-1">
            <AppButton variant="ghost" size="sm" icon :aria-label="`Cambiar dorsal o equipo de ${fullName(entry.player)}`" title="Dorsal / equipo" @click="moving = entry">
              <ArrowLeftRight class="size-3.5" aria-hidden="true" />
            </AppButton>
            <AppButton v-if="players.canEdit(entry.player.id)" variant="ghost" size="sm" icon :aria-label="`Editar ficha de ${fullName(entry.player)}`" title="Editar ficha" @click="editor.edit(entry.player)">
              <Pencil class="size-3.5" aria-hidden="true" />
            </AppButton>
            <AppButton variant="ghost" size="sm" icon :aria-label="`Dar de baja a ${fullName(entry.player)}`" title="Dar de baja del torneo" @click="unregister(entry)">
              <UserMinus class="size-3.5" aria-hidden="true" />
            </AppButton>
          </div>
        </li>
      </ul>
      <EmptyState
        v-else
        :icon="Users"
        title="Plantilla vacía"
        description="Busca primero: si el jugador ya existe en Kisokar, reutiliza su perfil. Si no, créalo; no necesita cuenta."
        class="card"
      >
        <AppButton v-if="!readOnly" @click="adding = true"><UserPlus class="size-4" aria-hidden="true" /> Agregar primer jugador</AppButton>
      </EmptyState>

      <details v-if="former.length" class="mt-6">
        <summary class="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          <History class="size-4" aria-hidden="true" /> {{ plural(former.length, 'baja') }} en este torneo
        </summary>
        <ul class="card mt-2 divide-y divide-zinc-100">
          <li v-for="entry in former" :key="entry.membership.id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span class="tabular w-8 text-center text-zinc-400">{{ entry.membership.shirtNumber ?? '–' }}</span>
            <RouterLink :to="{ name: 'player', params: { id: entry.player.id } }" class="min-w-0 flex-1 truncate font-semibold text-zinc-600 hover:text-pitch-700">
              {{ fullName(entry.player) }}
            </RouterLink>
            <span class="text-xs text-zinc-500">{{ formatDate(entry.membership.startDate) }} – {{ formatDate(entry.membership.endDate) }}</span>
          </li>
        </ul>
        <p class="mt-2 text-xs text-zinc-500">Las bajas no borran nada: sus partidos y estadísticas siguen en su perfil.</p>
      </details>
    </template>

    <AddPlayerDialog :open="adding" :tournament-id="id" :teams="tournamentTeams" :default-team-id="teamId" @close="adding = false" />
    <ParticipationDialog :entry="moving" :tournament-id="id" :teams="tournamentTeams" @close="moving = null" />

    <BaseModal
      :open="editor.open.value"
      title="Editar ficha del jugador"
      description="Es su identidad global: el cambio se ve en todos los torneos donde participa."
      size="lg"
      @close="editor.close()"
    >
      <PlayerForm v-if="editor.current.value" form-id="player-form" :initial="editor.current.value" @submit="onSubmitProfile" />
      <template #footer>
        <AppButton variant="secondary" :disabled="editor.saving.value" @click="editor.close()">Cancelar</AppButton>
        <AppButton type="submit" form="player-form" :loading="editor.saving.value">Guardar cambios</AppButton>
      </template>
    </BaseModal>
  </div>
</template>
