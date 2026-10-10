<script setup lang="ts">
import { useImageAfterCreate } from '@/composables/useImageAfterCreate'
import { computed, ref, watch } from 'vue'
import { ArrowLeft, Check, Plus, Search } from 'lucide-vue-next'
import posthog from 'posthog-js'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import type { ID, Team, TeamInput } from '@/types'
import { useTeamsStore, useTournamentsStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/services'
import { normalizeText } from '@/utils/text'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import TeamForm from '@/components/teams/TeamForm.vue'

/**
 * Inscribe un equipo en MI torneo. Primero se busca el equipo global (de cualquier
 * organizador) para no duplicarlo; si no existe, se crea su ficha y se inscribe.
 */
const props = defineProps<{ open: boolean; tournamentId: ID }>()
const emit = defineEmits<{ close: [] }>()

const teams = useTeamsStore()
const attachImage = useImageAfterCreate()
const tournaments = useTournamentsStore()
const toast = useToast()

const mode = ref<'search' | 'create'>('search')
const query = ref('')
const selected = ref<Team | null>(null)
const saving = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    mode.value = 'search'
    query.value = ''
    selected.value = null
  },
)

const enrolled = computed(() => new Set(tournaments.teamIdsOf(props.tournamentId)))
const results = computed(() => {
  const q = normalizeText(query.value)
  return teams.sorted
    .filter((t) => !q || normalizeText(`${t.name} ${t.shortName} ${t.city ?? ''}`).includes(q))
    .slice(0, 8)
    .map((team) => ({
      team,
      here: enrolled.value.has(team.id),
      context: tournaments
        .tournamentsOfTeam(team.id)
        .slice(0, 2)
        .map((t) => t.name)
        .join(' · '),
    }))
})

async function enroll(team: Team) {
  await tournaments.enrollTeam(props.tournamentId, team.id)
  if (posthogConfigured) {
    posthog.capture('team_enrolled', {
      tournament_id: props.tournamentId,
      enrollment_method: mode.value === 'create' ? 'new_team' : 'existing_team',
    })
  }
  toast.success(`${team.name} inscrito en el torneo.`)
  emit('close')
}

async function enrollSelected() {
  if (!selected.value) return
  saving.value = true
  try {
    await enroll(selected.value)
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function createAndEnroll(input: TeamInput, logo: Blob | null) {
  saving.value = true
  try {
    const created = await teams.create(input)
    const withLogo = await attachImage(logo, (image) => teams.setLogo(created.id, image)) // logo → Cloudinary, ya con id
    await enroll(withLogo ?? created)
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
    :title="mode === 'search' ? 'Inscribir equipo' : 'Nuevo equipo'"
    :description="mode === 'search' ? 'Busca si el equipo ya existe en Kisokar para no duplicarlo.' : 'Crea la ficha del equipo; quedará inscrito en tu torneo.'"
    size="lg"
    @close="$emit('close')"
  >
    <div v-if="mode === 'search'" class="space-y-4">
      <label class="relative block">
        <span class="sr-only">Buscar equipo</span>
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
        <input v-model="query" type="search" class="input h-11 pl-9" placeholder="Nombre del equipo…" autocomplete="off" autofocus />
      </label>

      <ul v-if="results.length" class="max-h-80 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200" role="listbox" aria-label="Equipos">
        <li v-for="r in results" :key="r.team.id">
          <button
            type="button"
            role="option"
            class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :class="selected?.id === r.team.id ? 'bg-pitch-50' : 'hover:bg-zinc-50'"
            :aria-selected="selected?.id === r.team.id"
            :disabled="r.here"
            @click="selected = r.team"
          >
            <TeamLogo :team="r.team" size="sm" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ r.team.name }}</span>
              <span class="block truncate text-xs text-zinc-500">{{ r.context || r.team.city || 'Sin torneos todavía' }}</span>
            </span>
            <span v-if="r.here" class="shrink-0 text-xs font-semibold text-zinc-500">Ya inscrito</span>
            <Check v-else-if="selected?.id === r.team.id" class="size-4 shrink-0 text-pitch-700" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p v-else class="rounded-xl bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">Ningún equipo coincide.</p>

      <button type="button" class="link inline-flex items-center gap-1.5 text-sm" @click="mode = 'create'">
        <Plus class="size-4" aria-hidden="true" /> ¿No existe? Crear equipo nuevo
      </button>
    </div>

    <div v-else class="space-y-4">
      <button type="button" class="link inline-flex items-center gap-1.5 text-sm" @click="mode = 'search'">
        <ArrowLeft class="size-4" aria-hidden="true" /> Volver a buscar
      </button>
      <TeamForm form-id="new-team-form" :initial="null" @submit="createAndEnroll" />
    </div>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="$emit('close')">Cancelar</AppButton>
      <AppButton v-if="mode === 'search'" :disabled="!selected" :loading="saving" @click="enrollSelected">Inscribir en el torneo</AppButton>
      <AppButton v-else type="submit" form="new-team-form" :loading="saving">Crear e inscribir</AppButton>
    </template>
  </BaseModal>
</template>
