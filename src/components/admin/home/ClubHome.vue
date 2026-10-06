<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronRight, LinkIcon, Plus, Shield, Trophy, Users } from 'lucide-vue-next'
import type { AdministeredTeam } from '@/types'
import { teamManagementService } from '@/services'
import { teamActionError } from '@/composables/useTeamManagement'
import { useOrganizerOptIn } from '@/composables/useOrganizerOptIn'
import { plural } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import TeamRoleBadge from '@/components/admin/team/TeamRoleBadge.vue'
import CreateMyTeamDialog from './CreateMyTeamDialog.vue'

/**
 * Panel de quien administra equipos y no organiza torneos: sus equipos, crear uno, cómo inscribirlo
 * y, como opción secundaria, "Quiero organizar un torneo". Sin acciones de organizador.
 */
const rows = ref<AdministeredTeam[]>([])
const loading = ref(true)
const error = ref('')
const creating = ref(false)
const optIn = useOrganizerOptIn()

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

const mine = computed(() => rows.value.filter((r) => r.myRole).sort((a, b) => a.team.name.localeCompare(b.team.name)))
</script>

<template>
  <div class="space-y-8">
    <section aria-labelledby="club-teams-title">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 id="club-teams-title" class="text-lg font-bold">Mis equipos</h2>
        <AppButton v-if="mine.length" variant="secondary" size="sm" @click="creating = true"><Plus class="size-3.5" aria-hidden="true" /> Crear mi equipo</AppButton>
      </div>
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="load" />
      <ul v-else-if="mine.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="r in mine" :key="r.team.id">
          <RouterLink :to="{ name: 'admin-team', params: { teamId: r.team.id } }" class="card group flex h-full items-center gap-3 p-4 transition hover:border-pitch-300 hover:shadow-sm">
            <TeamLogo :team="r.team" size="md" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-zinc-950">{{ r.team.name }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <TeamRoleBadge :role="r.myRole!" />
                <span class="inline-flex items-center gap-1 text-xs text-zinc-600"><Users class="size-3.5" aria-hidden="true" /> {{ plural(r.globalRosterSize, 'jugador', 'jugadores') }}</span>
              </div>
            </div>
            <ChevronRight class="size-5 shrink-0 text-zinc-400 group-hover:text-pitch-700" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
      <EmptyState v-else :icon="Shield" title="Todavía no administras ningún equipo" description="Crea tu equipo para armar su plantilla e inscribirlo en torneos." class="card">
        <AppButton @click="creating = true"><Plus class="size-4" aria-hidden="true" /> Crear mi equipo</AppButton>
      </EmptyState>
    </section>

    <section aria-labelledby="club-enroll-title" class="card flex items-start gap-3 p-4">
      <LinkIcon class="mt-0.5 size-5 shrink-0 text-pitch-700" aria-hidden="true" />
      <div>
        <h2 id="club-enroll-title" class="font-semibold text-zinc-950">Inscribir un equipo en un torneo</h2>
        <p class="mt-1 text-sm text-zinc-600">
          El organizador del torneo comparte un enlace de inscripción. Ábrelo, elige uno de tus equipos y marca a los jugadores. Si lo dejas a medias, lo verás aquí para continuar.
        </p>
      </div>
    </section>

    <section aria-labelledby="club-organize-title" class="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-start gap-3">
        <Trophy class="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden="true" />
        <div>
          <h2 id="club-organize-title" class="text-sm font-semibold">¿También organizas torneos?</h2>
          <p class="text-sm text-zinc-500">Activa la opción para crear ligas, calendarios y resultados. Tus equipos siguen igual.</p>
        </div>
      </div>
      <AppButton variant="secondary" size="sm" :loading="optIn.enabling.value" class="shrink-0" @click="optIn.enable()">Quiero organizar un torneo</AppButton>
    </section>

    <CreateMyTeamDialog :open="creating" @close="creating = false" />
  </div>
</template>
