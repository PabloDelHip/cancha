<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { History, Pencil, Search, UserMinus, UserPlus, Users } from 'lucide-vue-next'
import type { Player, PlayerInput, RosterPeriod } from '@/types'
import { teamManagementService } from '@/services'
import { usePlayersStore } from '@/stores'
import { teamActionError, useTeamManagement } from '@/composables/useTeamManagement'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { POSITION_LABELS } from '@/utils/labels'
import { formatDate, plural } from '@/utils/format'
import { fullName } from '@/utils/players'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PlayerForm from '@/components/players/PlayerForm.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import AddRosterPlayerDialog from '@/components/admin/team/AddRosterPlayerDialog.vue'

/**
 * Plantilla GLOBAL del equipo (GET /teams/:id/global-roster): quién pertenece al equipo hoy,
 * juegue o no torneos. No es la plantilla de ningún torneo (esa se arma en la pestaña Torneos y
 * lleva el dorsal de competición). Propietario y delegados la administran por igual.
 */
const { team, teamId, roster, tournaments, reloadRoster, reloadTournaments, actionFailed } = useTeamManagement()
const players = usePlayersStore()
const { confirm } = useConfirm()
const toast = useToast()

type View = 'current' | 'history'
const view = ref<View>('current')
const query = ref('')
const adding = ref(false)
const busy = ref<string | null>(null)

const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const filtered = computed(() => {
  const q = normalize(query.value.trim())
  return q ? roster.value.filter((r) => normalize(fullName(r.player)).includes(q)) : roster.value
})
const activeIds = computed(() => new Set(roster.value.map((r) => r.player.id)))

// Historial: todos los periodos, agrupados por jugador (el más reciente primero).
const history = ref<RosterPeriod[]>([])
const historyState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const historyError = ref('')
async function loadHistory() {
  historyState.value = 'loading'
  try {
    history.value = await teamManagementService.roster(teamId(), 'all')
    historyState.value = 'ready'
  } catch (e) {
    historyError.value = teamActionError(e)
    historyState.value = 'error'
  }
}
watch(view, (v) => v === 'history' && loadHistory())
const byPlayer = computed(() => {
  const groups = new Map<string, { player: Player; periods: RosterPeriod[] }>()
  for (const p of history.value) {
    const g = groups.get(p.player.id) ?? { player: p.player, periods: [] }
    g.periods.push(p)
    groups.set(p.player.id, g)
  }
  return [...groups.values()]
    .map((g) => ({ ...g, active: g.periods.some((p) => p.status === 'active'), periods: g.periods.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt) || b.periodId.localeCompare(a.periodId)) }))
    .sort((a, b) => Number(b.active) - Number(a.active) || fullName(a.player).localeCompare(fullName(b.player)))
})
const formerCount = computed(() => byPlayer.value.filter((g) => !g.active).length)

async function refresh() {
  await reloadRoster()
  if (view.value === 'history') await loadHistory()
}

// Editar la ficha (datos y foto) de alguien de la plantilla actual: lo permite el servidor a OWNER/MANAGER.
const editing = ref<Player | null>(null)
const savingEdit = ref(false)
async function saveEdit(input: PlayerInput) {
  if (!editing.value) return
  savingEdit.value = true
  try {
    await players.update(editing.value.id, input)
    toast.success('Ficha del jugador actualizada.')
    await closeEdit()
  } catch (e) {
    toast.error(await actionFailed(e))
  } finally {
    savingEdit.value = false
  }
}
/** Al cerrar (también tras cambiar solo la foto, que se sube al momento) se refrescan las listas. */
async function closeEdit() {
  editing.value = null
  await Promise.all([reloadRoster(), reloadTournaments()])
}

/** Estar en la plantilla no inscribe en torneos: si el equipo juega alguno, se indica dónde hacerlo. */
async function onAdded() {
  await refresh()
  if (tournaments.value.some((t) => t.editable)) toast.info('Para que juegue un torneo, inscríbelo en la pestaña Torneos.')
}

async function retire(period: RosterPeriod) {
  const name = fullName(period.player)
  const ok = await confirm({
    title: `¿Retirar a ${name} de ${team.value?.name}?`,
    message: 'Esto lo quitará de la plantilla actual del equipo. Sus partidos, estadísticas y participaciones en torneos no se eliminarán.',
    confirmLabel: 'Retirar del equipo',
    tone: 'danger',
  })
  if (!ok) return
  busy.value = period.player.id
  try {
    await teamManagementService.removeFromRoster(teamId(), period.player.id)
    toast.success(`${name} ya no está en la plantilla actual.`)
    await refresh()
  } catch (e) {
    toast.error(await actionFailed(e))
  } finally {
    busy.value = null
  }
}

async function rejoin(player: Player) {
  busy.value = player.id
  try {
    await teamManagementService.addToRoster(teamId(), player.id)
    toast.success(`${fullName(player)} volvió a la plantilla. Su periodo anterior se conserva.`)
    await refresh()
  } catch (e) {
    toast.error(await actionFailed(e))
  } finally {
    busy.value = null
  }
}

const period = (p: RosterPeriod) => `${formatDate(p.joinedAt)} → ${p.leftAt ? formatDate(p.leftAt) : 'Actual'}`
</script>

<template>
  <section aria-labelledby="roster-title">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="roster-title" class="text-xl font-bold">Plantilla</h2>
        <p class="text-sm text-zinc-500">
          {{ plural(roster.length, 'jugador', 'jugadores') }} en el equipo hoy · independiente de los torneos
        </p>
      </div>
      <AppButton @click="adding = true"><UserPlus class="size-4" aria-hidden="true" /> Agregar jugador</AppButton>
    </div>

    <div role="radiogroup" aria-label="Vista de la plantilla" class="mb-4 inline-flex rounded-xl bg-zinc-200/70 p-1 text-sm font-semibold">
      <button
        v-for="o in ([['current', 'Actual'], ['history', 'Historial']] as const)"
        :key="o[0]"
        type="button"
        role="radio"
        :aria-checked="view === o[0]"
        class="h-9 rounded-lg px-4 transition"
        :class="view === o[0] ? 'bg-white shadow-sm' : 'text-zinc-600'"
        @click="view = o[0]"
      >
        {{ o[1] }}
      </button>
    </div>

    <!-- Plantilla actual -->
    <template v-if="view === 'current'">
      <template v-if="roster.length">
        <label for="roster-filter" class="sr-only">Buscar en la plantilla</label>
        <div class="relative mb-3">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input id="roster-filter" v-model="query" type="search" class="input h-11 pl-9" placeholder="Buscar por nombre o apellido…" autocomplete="off" />
        </div>
        <ul v-if="filtered.length" class="card divide-y divide-zinc-100 overflow-hidden">
          <li v-for="r in filtered" :key="r.periodId" class="flex items-center gap-3 px-4 py-3">
            <PlayerAvatar :player="r.player" size="md" decorative />
            <div class="min-w-0 flex-1">
              <RouterLink :to="{ name: 'player', params: { id: r.player.id } }" class="block truncate font-semibold text-zinc-900 hover:text-pitch-700">
                {{ fullName(r.player) }}
              </RouterLink>
              <p class="truncate text-xs text-zinc-500">{{ POSITION_LABELS[r.player.position] }} · Desde {{ formatDate(r.joinedAt) }}</p>
            </div>
            <AppButton variant="ghost" size="sm" icon :aria-label="`Editar ficha de ${fullName(r.player)}`" title="Editar ficha y foto" @click="editing = r.player">
              <Pencil class="size-4" aria-hidden="true" />
            </AppButton>
            <AppButton variant="ghost" size="sm" :loading="busy === r.player.id" :aria-label="`Retirar a ${fullName(r.player)} del equipo`" @click="retire(r)">
              <UserMinus class="size-4" aria-hidden="true" /><span class="max-sm:sr-only">Retirar del equipo</span>
            </AppButton>
          </li>
        </ul>
        <p v-else class="card px-4 py-6 text-center text-sm text-zinc-500">Nadie en la plantilla coincide con “{{ query }}”.</p>
      </template>
      <EmptyState
        v-else
        :icon="Users"
        title="La plantilla está vacía"
        description="Agrega a los jugadores que pertenecen al equipo. Después podrás elegirlos al inscribir el equipo en torneos."
        class="card"
      >
        <AppButton @click="adding = true"><UserPlus class="size-4" aria-hidden="true" /> Agregar jugador</AppButton>
      </EmptyState>
    </template>

    <!-- Historial por jugador -->
    <template v-else>
      <LoadingState v-if="historyState === 'loading' || historyState === 'idle'" />
      <ErrorState v-else-if="historyState === 'error'" :message="historyError" @retry="loadHistory" />
      <template v-else>
        <p class="mb-3 text-sm text-zinc-500">
          {{ plural(byPlayer.length, 'jugador ha', 'jugadores han') }} pasado por la plantilla<template v-if="formerCount"> · {{ formerCount }} ya no {{ formerCount === 1 ? 'está' : 'están' }}</template>.
        </p>
        <ul v-if="byPlayer.length" class="card divide-y divide-zinc-100 overflow-hidden">
          <li v-for="g in byPlayer" :key="g.player.id" class="flex items-start gap-3 px-4 py-3">
            <PlayerAvatar :player="g.player" size="md" decorative />
            <div class="min-w-0 flex-1">
              <p class="flex flex-wrap items-center gap-x-2">
                <RouterLink :to="{ name: 'player', params: { id: g.player.id } }" class="truncate font-semibold text-zinc-900 hover:text-pitch-700">{{ fullName(g.player) }}</RouterLink>
                <span v-if="g.active" class="rounded-full bg-lime-100 px-1.5 text-[10px] font-bold text-lime-800 uppercase">En el equipo</span>
              </p>
              <ol class="mt-1 space-y-0.5 text-xs text-zinc-600">
                <li v-for="p in g.periods" :key="p.periodId" class="tabular flex items-center gap-1.5">
                  <History class="size-3 shrink-0 text-zinc-400" aria-hidden="true" /> {{ period(p) }}
                </li>
              </ol>
            </div>
            <AppButton v-if="!g.active" variant="secondary" size="sm" :loading="busy === g.player.id" @click="rejoin(g.player)">
              <UserPlus class="size-4" aria-hidden="true" /> Reincorporar
            </AppButton>
          </li>
        </ul>
        <EmptyState v-else :icon="History" title="Sin historial todavía" description="Aquí aparecerán los periodos de cada jugador en el equipo." class="card" compact />
      </template>
    </template>

    <BaseModal :open="!!editing" title="Editar jugador" description="Datos y foto de la ficha. La foto se guarda al subirla." @close="savingEdit || closeEdit()">
      <PlayerForm v-if="editing" :key="editing.id" form-id="team-edit-player" :initial="editing" @submit="saveEdit" />
      <template #footer>
        <AppButton variant="secondary" :disabled="savingEdit" @click="closeEdit">Cerrar</AppButton>
        <AppButton type="submit" form="team-edit-player" :loading="savingEdit">Guardar cambios</AppButton>
      </template>
    </BaseModal>

    <AddRosterPlayerDialog
      v-if="team"
      :open="adding"
      :team-id="teamId()"
      :team-name="team.name"
      :active-ids="activeIds"
      @close="adding = false"
      @added="onAdded"
    />
  </section>
</template>
