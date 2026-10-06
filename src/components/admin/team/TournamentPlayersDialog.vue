<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { UserPlus } from 'lucide-vue-next'
import type { Player, TeamTournamentEntry } from '@/types'
import { teamManagementService } from '@/services'
import { useTeamManagement } from '@/composables/useTeamManagement'
import { useToast } from '@/composables/useToast'
import { POSITION_LABELS } from '@/utils/labels'
import { fullName } from '@/utils/players'
import { plural } from '@/utils/format'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import AddRosterPlayerDialog from '@/components/admin/team/AddRosterPlayerDialog.vue'

/**
 * Inscribir jugadores de la plantilla del equipo en UN torneo, con dorsal opcional. Quien no está en
 * la plantilla se registra aquí mismo ("Jugador nuevo") y queda marcado. Se envían de uno en uno: si
 * alguno falla (dorsal ocupado, cupo lleno…) se muestra su error y los demás quedan inscritos.
 */
const props = defineProps<{ open: boolean; entry: TeamTournamentEntry }>()
const emit = defineEmits<{ close: []; done: [] }>()

const { team, teamId, roster, reloadRoster, reloadTournaments, actionFailed } = useTeamManagement()
const toast = useToast()
const selected = reactive(new Set<string>())
const jersey = reactive<Record<string, number | ''>>({})
const errors = reactive<Record<string, string>>({})
const saving = ref(false)
const creating = ref(false)

const enrolled = computed(() => new Set(props.entry.players.map((p) => p.player.id)))
const available = computed(() => roster.value.map((r) => r.player).filter((p) => !enrolled.value.has(p.id)))
const activeIds = computed(() => new Set(roster.value.map((r) => r.player.id)))
const room = computed(() => (props.entry.maxPlayers === null ? null : props.entry.maxPlayers - props.entry.players.length))
const overLimit = computed(() => room.value !== null && selected.size > room.value)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    selected.clear()
    for (const k of Object.keys(jersey)) delete jersey[k]
    for (const k of Object.keys(errors)) delete errors[k]
  },
  { immediate: true },
)

function toggle(p: Player) {
  if (selected.has(p.id)) selected.delete(p.id)
  else selected.add(p.id)
}

async function onCreated(p: Player) {
  await reloadRoster()
  selected.add(p.id)
}

async function submit() {
  if (!selected.size || overLimit.value) return
  saving.value = true
  let ok = 0
  for (const id of [...selected]) {
    const n = jersey[id]
    try {
      await teamManagementService.registerInTournament(teamId(), props.entry.tournament.id, id, n === '' || n === undefined ? null : Number(n))
      selected.delete(id)
      delete errors[id]
      ok++
    } catch (e) {
      errors[id] = await actionFailed(e)
    }
  }
  saving.value = false
  if (ok) {
    await reloadTournaments()
    toast.success(`${plural(ok, 'jugador inscrito', 'jugadores inscritos')} en ${props.entry.tournament.name}.`)
  }
  if (!selected.size) emit('done')
}
</script>

<template>
  <!-- Mientras se registra un jugador nuevo, este diálogo se oculta (sin modales apilados). -->
  <BaseModal :open="open && !creating" :title="`Inscribir jugadores · ${entry.tournament.name}`" description="Elige quién juega este torneo con tu equipo. El dorsal es opcional." @close="saving || emit('close')">
    <p v-if="room !== null" class="mb-3 text-sm" :class="overLimit ? 'font-semibold text-red-700' : 'text-zinc-600'">
      El organizador permite {{ entry.maxPlayers }} por equipo: {{ room > 0 ? `quedan ${room} lugares` : 'ya no quedan lugares' }}.
    </p>

    <ul v-if="available.length" class="max-h-[50vh] divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
      <li v-for="p in available" :key="p.id" class="px-3 py-2">
        <div class="flex items-center gap-3">
          <input :id="`tp-${p.id}`" type="checkbox" class="size-5 accent-pitch-600" :checked="selected.has(p.id)" @change="toggle(p)" />
          <label :for="`tp-${p.id}`" class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
            <PlayerAvatar :player="p" size="sm" decorative />
            <span class="min-w-0">
              <span class="block truncate font-semibold text-zinc-900">{{ fullName(p) }}</span>
              <span class="block text-xs text-zinc-500">{{ POSITION_LABELS[p.position] }}</span>
            </span>
          </label>
          <label v-if="selected.has(p.id)" class="flex items-center gap-1 text-xs text-zinc-500">
            #
            <input v-model.number="jersey[p.id]" type="number" min="1" max="99" inputmode="numeric" class="input h-9 w-16 px-2" :aria-label="`Dorsal de ${fullName(p)}`" placeholder="—" />
          </label>
        </div>
        <p v-if="errors[p.id]" class="mt-1 ml-8 text-xs text-red-700" role="alert">{{ errors[p.id] }}</p>
      </li>
    </ul>
    <p v-else class="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">Todos los jugadores de la plantilla ya están inscritos. Registra uno nuevo para agregarlo.</p>

    <AppButton variant="ghost" size="sm" class="mt-3" @click="creating = true"><UserPlus class="size-4" aria-hidden="true" /> Jugador nuevo (no está en la plantilla)</AppButton>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cerrar</AppButton>
      <AppButton :loading="saving" :disabled="!selected.size || overLimit" @click="submit">
        Inscribir{{ selected.size ? ` (${selected.size})` : '' }}
      </AppButton>
    </template>
  </BaseModal>

  <AddRosterPlayerDialog
    v-if="team"
    :open="creating"
    :team-id="teamId()"
    :team-name="team.name"
    :active-ids="activeIds"
    @close="creating = false"
    @added="onCreated"
  />
</template>
