<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftRight, Lock, Pencil, Search, UserMinus, UserPlus, Users } from 'lucide-vue-next'
import type { ID, Player, PlayerInput, Team } from '@/types'
import { usePlayersStore, useTeamsStore, useTournamentsStore, type RosterEntry } from '@/stores'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useEditor } from '@/composables/useEditor'
import { useRosterActions } from '@/composables/useRosterActions'
import { fullName } from '@/utils/players'
import { plural } from '@/utils/format'
import { POSITION_LABELS } from '@/utils/labels'
import { normalizeText } from '@/utils/text'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import PlayerForm from '@/components/players/PlayerForm.vue'
import AddPlayerDialog from '@/components/admin/AddPlayerDialog.vue'
import ParticipationDialog from '@/components/admin/workspace/ParticipationDialog.vue'

/** Todos los jugadores que participan en el torneo, con su equipo y dorsal aquí. */
const props = defineProps<{ id: string }>()
const PAGE_SIZE = 30

const players = usePlayersStore()
const teams = useTeamsStore()
const tournaments = useTournamentsStore()
const { readOnly } = useTournamentWorkspace(() => props.id)
const { unregister } = useRosterActions(() => props.id)
const editor = useEditor<Player>({ openOnNew: false })
const route = useRoute()
const router = useRouter()

const query = ref('')
const teamFilter = ref<ID | ''>('')
const limit = ref(PAGE_SIZE)
const adding = ref(false)
const moving = shallowRef<RosterEntry | null>(null)

onMounted(() => {
  if (route.query.new && !readOnly.value) adding.value = true
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined } })
})

const tournamentTeams = computed(() =>
  tournaments
    .teamIdsOf(props.id)
    .map((teamId) => teams.get(teamId))
    .filter((t): t is Team => Boolean(t))
    .sort((a, b) => a.name.localeCompare(b.name)),
)
const participants = computed(() => players.participantsOf(props.id))
const rows = computed(() => {
  const q = normalizeText(query.value)
  return participants.value
    .map((entry) => ({ ...entry, team: teams.get(entry.membership.teamId) }))
    .filter((r) => !q || normalizeText(fullName(r.player)).includes(q))
    .filter((r) => !teamFilter.value || r.membership.teamId === teamFilter.value)
    .sort(
      (a, b) =>
        (a.team?.name ?? '').localeCompare(b.team?.name ?? '') ||
        (a.membership.shirtNumber ?? 99) - (b.membership.shirtNumber ?? 99),
    )
})
const visible = computed(() => rows.value.slice(0, limit.value))

function onSubmitProfile(input: PlayerInput) {
  const current = editor.current.value
  if (current) editor.save(() => players.update(current.id, input), 'Ficha del jugador actualizada.')
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold">Jugadores del torneo</h2>
        <p class="text-sm text-zinc-500">
          {{ participants.length ? plural(participants.length, 'jugador participa', 'jugadores participan') : 'Ninguno todavía' }}
          · cada uno conserva su historial en Cancha
        </p>
      </div>
      <AppButton v-if="!readOnly" :disabled="!tournamentTeams.length" @click="adding = true">
        <UserPlus class="size-4" aria-hidden="true" /> Agregar jugador
      </AppButton>
    </div>

    <EmptyState
      v-if="!tournamentTeams.length"
      :icon="Users"
      title="Primero inscribe equipos"
      description="Cada jugador participa con un equipo del torneo."
      class="card"
    >
      <AppButton :to="{ name: 'admin-tournament-teams', params: { id }, query: { new: '1' } }">Inscribir equipo</AppButton>
    </EmptyState>

    <template v-else>
      <div class="mb-4 grid gap-2 sm:grid-cols-[1fr_14rem]">
        <label class="relative block">
          <span class="sr-only">Buscar jugador en este torneo</span>
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input v-model="query" type="search" class="input pl-9" placeholder="Buscar por nombre…" @input="limit = PAGE_SIZE" />
        </label>
        <label>
          <span class="sr-only">Filtrar por equipo</span>
          <select v-model="teamFilter" class="input" @change="limit = PAGE_SIZE">
            <option value="">Todos los equipos</option>
            <option v-for="t in tournamentTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
      </div>

      <div v-if="rows.length" class="card overflow-hidden">
        <ul class="divide-y divide-zinc-100">
          <li v-for="r in visible" :key="r.membership.id" class="flex items-center gap-3 px-4 py-3">
            <span class="tabular w-7 shrink-0 text-center font-display text-lg font-bold text-zinc-400">{{ r.membership.shirtNumber ?? '–' }}</span>
            <PlayerAvatar :player="r.player" :color="r.team?.colors.primary" size="sm" decorative />
            <div class="min-w-0 flex-1">
              <RouterLink :to="{ name: 'player', params: { id: r.player.id } }" class="block truncate font-semibold hover:text-pitch-700">
                {{ fullName(r.player) }}
              </RouterLink>
              <p class="flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-500">
                <TeamLogo :team="r.team" size="xs" />
                <RouterLink :to="{ name: 'admin-tournament-team', params: { id, teamId: r.membership.teamId } }" class="truncate hover:text-pitch-700">
                  {{ r.team?.name }}
                </RouterLink>
                · {{ POSITION_LABELS[r.player.position] }}
                <template v-if="r.player.age !== null"> · {{ r.player.age }} años</template>
                <Lock v-if="!players.canEdit(r.player.id)" class="size-3 shrink-0" aria-label="Ficha de otro organizador" />
              </p>
            </div>
            <div v-if="!readOnly" class="flex shrink-0 gap-1">
              <AppButton variant="ghost" size="sm" icon :aria-label="`Cambiar dorsal o equipo de ${fullName(r.player)}`" title="Dorsal / equipo" @click="moving = r">
                <ArrowLeftRight class="size-3.5" aria-hidden="true" />
              </AppButton>
              <AppButton v-if="players.canEdit(r.player.id)" variant="ghost" size="sm" icon :aria-label="`Editar ficha de ${fullName(r.player)}`" title="Editar ficha" @click="editor.edit(r.player)">
                <Pencil class="size-3.5" aria-hidden="true" />
              </AppButton>
              <AppButton variant="ghost" size="sm" icon :aria-label="`Dar de baja a ${fullName(r.player)}`" title="Dar de baja del torneo" @click="unregister(r)">
                <UserMinus class="size-3.5" aria-hidden="true" />
              </AppButton>
            </div>
          </li>
        </ul>
        <button
          v-if="rows.length > visible.length"
          type="button"
          class="w-full border-t border-zinc-100 py-3 text-sm font-semibold text-pitch-700 hover:bg-zinc-50"
          @click="limit += PAGE_SIZE"
        >
          Mostrar más ({{ rows.length - visible.length }} restantes)
        </button>
      </div>
      <EmptyState
        v-else-if="!participants.length"
        illustrated
        title="Aún no hay jugadores en este torneo"
        description="Busca primero: si la persona ya jugó en Cancha, usa su perfil. Si no, créalo; no necesita cuenta."
        class="card"
      >
        <AppButton v-if="!readOnly" @click="adding = true"><UserPlus class="size-4" aria-hidden="true" /> Agregar jugador</AppButton>
      </EmptyState>
      <EmptyState v-else :icon="Users" title="Sin resultados" description="Ningún jugador coincide con la búsqueda o el filtro." class="card" />
    </template>

    <AddPlayerDialog :open="adding" :tournament-id="id" :teams="tournamentTeams" :default-team-id="teamFilter || undefined" @close="adding = false" />
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
