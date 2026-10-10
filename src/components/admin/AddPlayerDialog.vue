<script setup lang="ts">
import { useImageAfterCreate } from '@/composables/useImageAfterCreate'
import { computed, ref, watch } from 'vue'
import { Check, Search } from 'lucide-vue-next'
import type { ID, Player, PlayerCandidate, PlayerInput, Team } from '@/types'
import { usePlayersStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useRegistration } from '@/composables/useRegistration'
import { useToast } from '@/composables/useToast'
import { getErrorMessage, possibleDuplicates } from '@/services'
import { displayName, fullName, matchesPlayerSearch } from '@/utils/players'
import { POSITION_LABELS } from '@/utils/labels'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import PlayerForm from '@/components/players/PlayerForm.vue'
import RegistrationFields from './RegistrationFields.vue'
import AddPlayerModes from '@/components/players/AddPlayerModes.vue'
import PossibleDuplicates from '@/components/players/PossibleDuplicates.vue'

/**
 * Agrega un jugador a un equipo de MI torneo, con dos acciones claras: buscar su identidad global
 * (nombre, apellidos o apodo) para reutilizarla, o registrar uno nuevo. Al registrar, el servidor
 * revisa posibles duplicados: si los hay se muestran para elegir uno o confirmar "ninguno es él".
 */
const props = defineProps<{ open: boolean; tournamentId: ID; teams: Team[]; defaultTeamId?: ID }>()
const emit = defineEmits<{ close: [] }>()

const players = usePlayersStore()
const attachImage = useImageAfterCreate()
const teamsStore = useTeamsStore()
const tournaments = useTournamentsStore()
const toast = useToast()
const { draft, errors, reset, validate } = useRegistration(() => props.tournamentId)

const mode = ref<'search' | 'create'>('search')
const query = ref('')
const selected = ref<Player | null>(null)
const saving = ref(false)
/** Posibles duplicados devueltos por el servidor al registrar (null = formulario). */
const candidates = ref<PlayerCandidate[] | null>(null)
let pending: { input: PlayerInput; photo: Blob | null } | null = null
/** Quien ya participa en este torneo no se puede elegir otra vez. */
const inTournament = computed(() => new Set((candidates.value ?? []).filter((c) => players.membershipIn(props.tournamentId, c.player.id)).map((c) => c.player.id)))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    mode.value = 'search'
    query.value = ''
    selected.value = null
    candidates.value = null
    pending = null
    reset(props.defaultTeamId ?? '')
  },
)

watch(mode, () => (candidates.value = null))

const results = computed(() => {
  if (query.value.trim().length < 2) return []
  return players.items
    .filter((p) => matchesPlayerSearch(p, query.value))
    .slice(0, 8)
    .map((player) => {
      const current = players.currentParticipations(player.id)
      const here = players.membershipIn(props.tournamentId, player.id)
      return {
        player,
        here,
        // Todas sus competiciones en curso (puede jugar varias a la vez).
        context: current.length
          ? current
              .map((m) => `${teamsStore.get(m.teamId)?.name ?? 'Equipo'} · ${tournaments.get(m.tournamentId)?.name ?? 'Torneo'}`)
              .join(' / ')
          : 'Sin competiciones en curso',
      }
    })
})

async function register(player: Player) {
  const assignment = validate(player.id)
  if (!assignment) return false
  await players.register(player.id, assignment)
  toast.success(`${fullName(player)} agregado a ${teamsStore.get(assignment.teamId)?.name}.`)
  emit('close')
  return true
}

async function addExisting() {
  if (!selected.value) return
  saving.value = true
  try {
    await register(selected.value)
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

/** Alta (o "ninguno es él": confirmNew). Con posibles duplicados no crea: muestra los candidatos. */
async function create(confirmNew: boolean) {
  if (!pending || !validate(null)) return
  const { input, photo } = pending
  saving.value = true
  try {
    const created = await players.create(input, { confirmNew })
    await attachImage(photo, (image) => players.setPhoto(created.id, image)) // foto → Cloudinary, ya con id
    await register(created)
  } catch (e) {
    const found = possibleDuplicates(e)
    if (found) candidates.value = found
    else toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

function createAndAdd(input: PlayerInput, photo: Blob | null) {
  pending = { input, photo }
  void create(false)
}

/** "Es este jugador": se usa el Player existente (su foto y ficha no se tocan). */
async function chooseExisting(player: Pick<Player, 'id' | 'firstName' | 'lastName'>) {
  saving.value = true
  try {
    // El panel ya tiene cargadas todas las fichas; si no, basta con id y nombre para inscribirlo.
    await register(players.get(player.id) ?? (player as Player))
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="candidates ? '¿Ya está registrado?' : 'Agregar jugador'"
    :description="
      candidates
        ? undefined
        : mode === 'search'
          ? 'Busca si ya jugó en Kisokar: usar su perfil conserva su historial.'
          : 'Crea su perfil (no necesita cuenta). Antes revisaremos si ya existe.'
    "
    size="lg"
    @close="saving || $emit('close')"
  >
    <div v-if="candidates" class="space-y-4">
      <PossibleDuplicates
        :candidates="candidates"
        :taken-ids="inTournament"
        taken-label="Ya está en este torneo"
        :busy="saving"
        @choose="chooseExisting"
        @create-anyway="create(true)"
        @back="candidates = null"
      />
      <div class="rounded-xl bg-zinc-50 p-4">
        <p class="mb-3 text-sm text-zinc-600">Equipo y dorsal en este torneo (para el jugador que elijas o el nuevo):</p>
        <RegistrationFields v-model="draft" :teams="teams" :errors="errors" id-prefix="add-dup" />
      </div>
    </div>

    <template v-else>
      <AddPlayerModes v-model="mode" class="mb-4" />

      <!-- 1. Buscar en la plataforma -->
      <div v-if="mode === 'search'" class="space-y-4">
        <label class="relative block">
          <span class="sr-only">Buscar jugador por nombre, apellidos o apodo</span>
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input v-model="query" type="search" class="input h-11 pl-9" placeholder="Nombre, apellidos o apodo…" autocomplete="off" autofocus />
        </label>

        <ul v-if="results.length" class="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200" role="listbox" aria-label="Jugadores encontrados">
          <li v-for="r in results" :key="r.player.id">
            <button
              type="button"
              role="option"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :class="selected?.id === r.player.id ? 'bg-pitch-50' : 'hover:bg-zinc-50'"
              :aria-selected="selected?.id === r.player.id"
              :disabled="!!r.here"
              @click="selected = r.player"
            >
              <PlayerAvatar :player="r.player" size="sm" decorative />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold">{{ displayName(r.player) }}</span>
                <span class="block truncate text-xs text-zinc-500">{{ POSITION_LABELS[r.player.position] }} · {{ r.context }}</span>
              </span>
              <span v-if="r.here" class="shrink-0 text-xs font-semibold text-zinc-500">Ya está en este torneo</span>
              <Check v-else-if="selected?.id === r.player.id" class="size-4 shrink-0 text-pitch-700" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <div v-else-if="query.trim().length >= 2" class="rounded-xl bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
          Nadie coincide con “{{ query.trim() }}”.
          <button type="button" class="link ml-1" @click="mode = 'create'">Registrar jugador nuevo</button>
        </div>

        <div v-if="selected" class="rounded-xl bg-zinc-50 p-4">
          <p class="mb-3 text-sm">
            Agregar a <strong>{{ displayName(selected) }}</strong> en este torneo. Su perfil y su historial se conservan.
          </p>
          <RegistrationFields v-model="draft" :teams="teams" :errors="errors" id-prefix="add-existing" />
        </div>
      </div>

      <!-- 2. Registrar jugador nuevo -->
      <div v-else class="space-y-4">
        <PlayerForm form-id="new-player-form" :initial="null" @submit="createAndAdd" />
        <div class="rounded-xl bg-zinc-50 p-4">
          <RegistrationFields v-model="draft" :teams="teams" :errors="errors" id-prefix="add-new" />
        </div>
      </div>
    </template>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="$emit('close')">Cancelar</AppButton>
      <template v-if="!candidates">
        <AppButton v-if="mode === 'search'" :disabled="!selected" :loading="saving" @click="addExisting">Agregar al torneo</AppButton>
        <AppButton v-else type="submit" form="new-player-form" :loading="saving">Registrar y agregar</AppButton>
      </template>
    </template>
  </BaseModal>
</template>
