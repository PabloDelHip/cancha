<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronRight, Info, MapPin, Plus, Server, Shield, Users } from 'lucide-vue-next'
import type { AdministeredTeam } from '@/types'
import { TEAM_MANAGEMENT_REQUIRES_SERVER, teamManagementService, USE_MOCKS } from '@/services'
import { usePageTitle } from '@/composables/usePageTitle'
import { teamActionError } from '@/composables/useTeamManagement'
import { plural } from '@/utils/format'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import TeamRoleBadge from '@/components/admin/team/TeamRoleBadge.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AppButton from '@/components/common/AppButton.vue'
import CreateMyTeamDialog from '@/components/admin/home/CreateMyTeamDialog.vue'

/**
 * Mis equipos: SOLO los equipos que la persona administra (Propietario o Delegado). No aparecen
 * los equipos de sus torneos (organizar no es administrar) ni, como si fueran suyos, los que
 * registró sin propietario (custodia provisional): de esos solo se informa cuántos hay.
 */
usePageTitle(() => 'Mis equipos · Panel')

const rows = ref<AdministeredTeam[]>([])
const loading = ref(true)
const error = ref('')
const creating = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await teamManagementService.listAdministered()
  } catch (e) {
    error.value = teamActionError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const administered = computed(() =>
  rows.value
    .filter((r) => r.myRole)
    .sort((a, b) => Number(b.myRole === 'owner') - Number(a.myRole === 'owner') || a.team.name.localeCompare(b.team.name)),
)
/** Fichas que registró y aún no tienen propietario: puede corregirlas desde sus torneos, pero no las administra. */
const custody = computed(() => rows.value.filter((r) => !r.myRole && r.canEdit).length)
</script>

<template>
  <div>
    <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="display text-3xl leading-none text-zinc-950 sm:text-4xl">Mis equipos</h1>
        <p class="mt-1 text-sm text-zinc-500">Equipos que administras como propietario o delegado, fuera de cualquier torneo.</p>
      </div>
      <AppButton v-if="!USE_MOCKS && administered.length" class="shrink-0" @click="creating = true"><Plus class="size-4" aria-hidden="true" /> Crear mi equipo</AppButton>
    </header>

    <div v-if="USE_MOCKS" class="card flex items-start gap-3 px-4 py-4 text-sm text-zinc-600" role="status">
      <Server class="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden="true" />
      <p>{{ TEAM_MANAGEMENT_REQUIRES_SERVER }}.</p>
    </div>
    <LoadingState v-else-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <template v-else>
      <ul v-if="administered.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="r in administered" :key="r.team.id">
          <RouterLink
            :to="{ name: 'admin-team', params: { teamId: r.team.id } }"
            class="card group relative flex h-full items-center gap-3 overflow-hidden p-4 pl-5 transition hover:border-pitch-300 hover:shadow-sm"
          >
            <span class="absolute inset-y-0 left-0 w-1.5" :style="{ background: r.team.colors.primary }" aria-hidden="true" />
            <TeamLogo :team="r.team" size="lg" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-zinc-950">{{ r.team.name }}</p>
              <p v-if="r.team.city" class="flex items-center gap-1 truncate text-xs text-zinc-500">
                <MapPin class="size-3.5 shrink-0" aria-hidden="true" /> {{ r.team.city }}
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <TeamRoleBadge :role="r.myRole!" />
                <span class="inline-flex items-center gap-1 text-xs text-zinc-600">
                  <Users class="size-3.5" aria-hidden="true" /> {{ plural(r.globalRosterSize, 'jugador', 'jugadores') }}
                </span>
              </div>
            </div>
            <ChevronRight class="size-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-pitch-700" aria-hidden="true" />
            <span class="sr-only">Administrar {{ r.team.name }}</span>
          </RouterLink>
        </li>
      </ul>
      <EmptyState
        v-else
        :icon="Shield"
        title="Todavía no administras ningún equipo"
        description="Crea tu equipo y quedarás como su propietario. Si tu equipo ya existe, pide a su propietario que te agregue como delegado."
        class="card"
      >
        <AppButton @click="creating = true"><Plus class="size-4" aria-hidden="true" /> Crear mi equipo</AppButton>
      </EmptyState>

      <p v-if="custody" class="mt-6 flex items-start gap-2 text-xs text-zinc-500">
        <Info class="mt-px size-4 shrink-0" aria-hidden="true" />
        <span>
          Registraste {{ plural(custody, 'equipo', 'equipos') }} que aún no {{ custody === 1 ? 'tiene' : 'tienen' }} propietario. Puedes corregir su ficha
          desde tus torneos, pero administrar su plantilla corresponde a su propietario o delegados.
        </span>
      </p>
    </template>
    <CreateMyTeamDialog :open="creating" @close="creating = false" />
  </div>
</template>
