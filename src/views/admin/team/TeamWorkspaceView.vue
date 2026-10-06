<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ExternalLink, Lock, SearchX, Server, Shield } from 'lucide-vue-next'
import { provideTeamManagement } from '@/composables/useTeamManagement'
import { usePageTitle } from '@/composables/usePageTitle'
import { TEAM_MANAGEMENT_REQUIRES_SERVER } from '@/services'
import { plural } from '@/utils/format'
import TabNav from '@/components/common/TabNav.vue'
import AppButton from '@/components/common/AppButton.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import TeamRoleBadge from '@/components/admin/team/TeamRoleBadge.vue'

/**
 * Workspace del EQUIPO: resumen, plantilla global, torneos donde juega (con su plantilla en cada
 * uno), administradores y ficha. Todo sale de la API de 6A/6B; lo que se muestra depende del rol que el
 * servidor reconoce (403 → sin acceso, aunque se llegue por enlace directo).
 */
const props = defineProps<{ teamId: string }>()
const ctx = provideTeamManagement(() => props.teamId)
const { state, team, myRole, roster, adminCount, errorMessage, load } = ctx
usePageTitle(() => (team.value ? `${team.value.name} · Mis equipos` : undefined))

const tabs = computed(() => {
  const params = { teamId: props.teamId }
  return [
    { label: 'Resumen', to: { name: 'admin-team', params } },
    { label: 'Plantilla', to: { name: 'admin-team-roster', params } },
    { label: 'Torneos', to: { name: 'admin-team-tournaments', params } },
    { label: 'Administradores', to: { name: 'admin-team-admins', params } },
    { label: 'Configuración', to: { name: 'admin-team-settings', params } },
  ]
})
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'admin-teams' }" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-900">
      <ChevronLeft class="size-4" aria-hidden="true" /> Mis equipos
    </RouterLink>

    <EmptyState v-if="state === 'unsupported'" :icon="Server" title="Requiere el servidor" :description="`${TEAM_MANAGEMENT_REQUIRES_SERVER}.`" class="card" />
    <LoadingState v-else-if="state === 'loading'" />
    <EmptyState
      v-else-if="state === 'forbidden'"
      :icon="Lock"
      title="No administras este equipo"
      description="Solo su propietario y sus delegados pueden administrarlo. Organizar un torneo donde juega no da acceso a su administración."
      class="card"
    >
      <AppButton :to="{ name: 'team', params: { id: teamId } }" variant="secondary">Ver perfil público</AppButton>
    </EmptyState>
    <EmptyState v-else-if="state === 'not-found'" :icon="SearchX" title="El equipo ya no está disponible" class="card">
      <AppButton :to="{ name: 'admin-teams' }" variant="secondary">Ver mis equipos</AppButton>
    </EmptyState>
    <ErrorState v-else-if="state === 'error'" :message="errorMessage" @retry="load" />

    <template v-else-if="team">
      <header class="card relative mb-4 overflow-hidden p-4 sm:p-5">
        <span class="absolute inset-x-0 top-0 h-1.5" :style="{ background: `linear-gradient(90deg, ${team.colors.primary}, ${team.colors.secondary})` }" aria-hidden="true" />
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div class="flex min-w-0 flex-1 items-center gap-4">
            <TeamLogo :team="team" size="xl" class="shrink-0 max-sm:hidden" />
            <TeamLogo :team="team" size="lg" class="shrink-0 sm:hidden" />
            <div class="min-w-0">
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <TeamRoleBadge v-if="myRole" :role="myRole" />
                <span class="text-xs font-semibold text-zinc-500">Equipo · administración global</span>
              </div>
              <h1 class="display text-3xl leading-none break-words text-zinc-950 sm:text-4xl">{{ team.name }}</h1>
              <p class="mt-1 text-sm text-zinc-600">
                {{ plural(roster.length, 'jugador', 'jugadores') }} · {{ plural(adminCount, 'administrador', 'administradores') }}<template v-if="team.city"> · {{ team.city }}</template>
              </p>
            </div>
          </div>
          <AppButton variant="secondary" :to="{ name: 'team', params: { id: teamId } }" class="shrink-0">
            <ExternalLink class="size-4" aria-hidden="true" /> Perfil público
          </AppButton>
        </div>
      </header>

      <TabNav :tabs="tabs" label="Secciones del equipo" class="mb-6" />
      <RouterView />
    </template>
    <EmptyState v-else :icon="Shield" title="Equipo no encontrado" class="card" />
  </div>
</template>
