<script setup lang="ts">
import { useImageAfterCreate } from '@/composables/useImageAfterCreate'
import { computed, ref, watch } from 'vue'
import { Check, Search } from 'lucide-vue-next'
import type { ID, Player, PlayerCandidate, PlayerInput } from '@/types'
import { getErrorStatus, playerService, possibleDuplicates, teamManagementService } from '@/services'
import { useToast } from '@/composables/useToast'
import { createRequestId } from '@/utils/id'
import { teamActionError, useOptionalTeamManagement } from '@/composables/useTeamManagement'
import { POSITION_LABELS } from '@/utils/labels'
import { displayName } from '@/utils/players'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import Spinner from '@/components/common/Spinner.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import PlayerForm from '@/components/players/PlayerForm.vue'
import AddPlayerModes from '@/components/players/AddPlayerModes.vue'
import PossibleDuplicates from '@/components/players/PossibleDuplicates.vue'

/**
 * Agregar a la plantilla GLOBAL, con dos acciones claras:
 * - "Buscar en la plataforma": GET /players?search= (nombre, apellidos y apodo, palabras en cualquier
 *   orden). Quien ya está en la plantilla aparece deshabilitado.
 * - "Registrar jugador nuevo": el formulario. Al guardar, el servidor revisa posibles duplicados; si
 *   los hay (409) se muestran para elegir uno existente o confirmar "ninguno es él" (confirmNew).
 * `requestId` se genera al abrir el diálogo y se conserva en los reintentos: un doble envío o un
 * reintento tras un error de red no crea dos jugadores.
 */
const props = defineProps<{ open: boolean; teamId: ID; teamName: string; activeIds: Set<ID>; initialMode?: 'search' | 'create' }>()
const emit = defineEmits<{ close: []; added: [player: Player] }>()

// Dentro del workspace del equipo, un 403 vuelve a comprobar el acceso; fuera (inscripción), solo avisa.
const ctx = useOptionalTeamManagement()
const actionFailed = (e: unknown) => (ctx ? ctx.actionFailed(e) : Promise.resolve(teamActionError(e)))
const toast = useToast()
const attachImage = useImageAfterCreate()
const mode = ref<'search' | 'create'>('search')
const query = ref('')
const results = ref<Player[]>([])
const searching = ref(false)
const selected = ref<Player | null>(null)
const saving = ref(false)
/** Posibles duplicados devueltos por el servidor al registrar (null = formulario). */
const candidates = ref<PlayerCandidate[] | null>(null)
let pending: { input: PlayerInput; photo: Blob | null } | null = null
let requestId = createRequestId()

// Lo buscado se propone como nombre al pasar a "Registrar": "Juan Pérez López" → Juan / Pérez López.
const prefill = computed(() => {
  const [firstName = '', ...rest] = query.value.trim().split(/\s+/)
  return { firstName, lastName: rest.join(' ') }
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    mode.value = props.initialMode ?? 'search'
    query.value = ''
    results.value = []
    selected.value = null
    candidates.value = null
    pending = null
    requestId = createRequestId()
  },
)
watch(mode, () => (candidates.value = null))

let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0
watch(query, (q) => {
  clearTimeout(timer)
  selected.value = null
  if (q.trim().length < 2) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(async () => {
    const mine = ++seq
    try {
      const found = await playerService.search(q.trim())
      if (mine === seq) results.value = found
    } catch (e) {
      if (mine === seq) toast.error(teamActionError(e))
    } finally {
      if (mine === seq) searching.value = false
    }
  }, 300)
})

const canSubmit = computed(() => !!selected.value && !props.activeIds.has(selected.value.id))

async function run(action: () => Promise<Player>, done: string) {
  saving.value = true
  try {
    const player = await action()
    toast.success(done)
    emit('added', player)
    emit('close')
  } catch (e) {
    if (getErrorStatus(e) === 403) emit('close') // sin acceso: el workspace pasará a "No administras este equipo"
    toast.error(await actionFailed(e))
  } finally {
    saving.value = false
  }
}

const add = (player: Pick<Player, 'id'>) =>
  run(async () => (await teamManagementService.addToRoster(props.teamId, player.id)).player, 'Jugador agregado a la plantilla.')

/** Alta en el servidor; con posibles duplicados no crea: muestra los candidatos. */
async function create(confirmNew: boolean) {
  if (!pending || saving.value) return
  const { input, photo } = pending
  saving.value = true
  try {
    const { player } = await teamManagementService.createInRoster(props.teamId, input, requestId, { confirmNew })
    // Quien lo crea es el custodio de la ficha: sube la foto a Cloudinary, ya con id.
    const withPhoto = await attachImage(photo, (image) => playerService.uploadPhoto(player.id, image))
    toast.success('Jugador creado y agregado a la plantilla.')
    emit('added', withPhoto ?? player)
    emit('close')
  } catch (e) {
    const found = possibleDuplicates(e)
    if (found) candidates.value = found
    else {
      if (getErrorStatus(e) === 403) emit('close')
      toast.error(await actionFailed(e))
    }
  } finally {
    saving.value = false
  }
}

function onSubmit(input: PlayerInput, photo: Blob | null) {
  pending = { input, photo }
  void create(false)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="candidates ? '¿Ya está registrado?' : 'Agregar jugador'"
    :description="candidates ? undefined : mode === 'search' ? `Busca si ya existe en Kisokar: puede haber jugado en otro equipo o torneo.` : `Se creará su ficha en Kisokar (no necesita cuenta) y quedará en la plantilla de ${teamName}.`"
    @close="saving || emit('close')"
  >
    <PossibleDuplicates
      v-if="candidates"
      :candidates="candidates"
      :taken-ids="activeIds"
      taken-label="Ya está en la plantilla"
      :busy="saving"
      @choose="add"
      @create-anyway="create(true)"
      @back="candidates = null"
    />

    <template v-else>
      <AddPlayerModes v-model="mode" class="mb-4" />

      <template v-if="mode === 'search'">
        <label for="roster-search" class="sr-only">Buscar jugador por nombre, apellidos o apodo</label>
        <div class="relative">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input id="roster-search" v-model="query" type="search" class="input h-11 pl-9" placeholder="Nombre, apellidos o apodo…" autocomplete="off" autofocus />
        </div>

        <div class="mt-3 min-h-40" aria-live="polite">
          <p v-if="query.trim().length < 2" class="px-1 py-6 text-center text-sm text-zinc-500">Escribe al menos 2 letras: nombre, apellidos o apodo.</p>
          <p v-else-if="searching" class="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500"><Spinner class="size-4" /> Buscando…</p>
          <div v-else-if="!results.length" class="px-1 py-6 text-center">
            <p class="text-sm text-zinc-500">No encontramos jugadores con ese nombre.</p>
            <AppButton variant="secondary" class="mt-3" @click="mode = 'create'">Registrar jugador nuevo</AppButton>
          </div>
          <ul v-else class="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200" role="listbox" aria-label="Resultados">
            <li v-for="p in results" :key="p.id">
              <button
                type="button"
                role="option"
                :aria-selected="selected?.id === p.id"
                :disabled="activeIds.has(p.id)"
                class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                :class="selected?.id === p.id && 'bg-pitch-50'"
                @click="selected = p"
              >
                <PlayerAvatar :player="p" size="sm" decorative />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-zinc-900">{{ displayName(p) }}</span>
                  <span class="block text-xs text-zinc-500">{{ POSITION_LABELS[p.position] }}<template v-if="p.age !== null"> · {{ p.age }} años</template></span>
                </span>
                <span v-if="activeIds.has(p.id)" class="shrink-0 text-xs font-semibold text-zinc-500">Ya pertenece al equipo</span>
                <Check v-else-if="selected?.id === p.id" class="size-5 shrink-0 text-pitch-700" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </template>

      <PlayerForm v-else form-id="roster-new-player" :initial="null" :prefill="prefill" @submit="onSubmit" />
    </template>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <template v-if="!candidates">
        <AppButton v-if="mode === 'create'" type="submit" form="roster-new-player" :loading="saving">Registrar y agregar</AppButton>
        <AppButton v-else :disabled="!canSubmit" :loading="saving" @click="selected && add(selected)">Agregar a la plantilla</AppButton>
      </template>
    </template>
  </BaseModal>
</template>
