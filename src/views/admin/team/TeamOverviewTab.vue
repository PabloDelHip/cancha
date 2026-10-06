<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Info, Settings, Trophy, UserCog, Users } from 'lucide-vue-next'
import { useTeamManagement } from '@/composables/useTeamManagement'
import { plural } from '@/utils/format'
import { fullName } from '@/utils/players'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'

/** Resumen: lo esencial del equipo, torneos donde juega y accesos rápidos. */
const { teamId, roster, admins, tournaments } = useTeamManagement()
const playing = computed(() => tournaments.value.filter((t) => t.editable))
const preview = computed(() => roster.value.slice(0, 6))
const params = computed(() => ({ teamId: teamId() }))
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-3 sm:grid-cols-2">
      <RouterLink :to="{ name: 'admin-team-roster', params }" class="card group flex items-center gap-4 p-4 hover:border-pitch-300">
        <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-pitch-50 text-pitch-700"><Users class="size-6" aria-hidden="true" /></span>
        <div class="min-w-0 flex-1">
          <p class="eyebrow">Plantilla actual</p>
          <p class="font-display text-3xl leading-none font-bold text-zinc-950">{{ roster.length }} <span class="text-base font-semibold text-zinc-500">{{ roster.length === 1 ? 'jugador' : 'jugadores' }}</span></p>
          <div v-if="preview.length" class="mt-2 flex -space-x-2" aria-hidden="true">
            <PlayerAvatar v-for="r in preview" :key="r.periodId" :player="r.player" size="sm" decorative class="ring-2 ring-white" />
          </div>
        </div>
        <ChevronRight class="size-5 text-zinc-400 group-hover:text-pitch-700" aria-hidden="true" />
        <span class="sr-only">Ver plantilla: {{ preview.map((r) => fullName(r.player)).join(', ') }}</span>
      </RouterLink>

      <RouterLink :to="{ name: 'admin-team-tournaments', params }" class="card group flex items-center gap-4 p-4 hover:border-pitch-300">
        <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Trophy class="size-6" aria-hidden="true" /></span>
        <div class="min-w-0 flex-1">
          <p class="eyebrow">Torneos</p>
          <template v-if="playing.length">
            <p v-for="t in playing.slice(0, 3)" :key="t.tournament.id" class="truncate text-sm text-zinc-700">
              <strong class="text-zinc-950">{{ t.tournament.name }}</strong> · {{ plural(t.players.length, 'inscrito', 'inscritos') }}
            </p>
            <p v-if="playing.length > 3" class="text-xs text-zinc-500">y {{ playing.length - 3 }} más</p>
          </template>
          <p v-else class="text-sm text-zinc-600">{{ tournaments.length ? 'Ninguno en curso' : 'Aún no juega ningún torneo' }}</p>
        </div>
        <ChevronRight class="size-5 text-zinc-400 group-hover:text-pitch-700" aria-hidden="true" />
      </RouterLink>

      <RouterLink :to="{ name: 'admin-team-admins', params }" class="card group flex items-center gap-4 p-4 hover:border-pitch-300">
        <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-lime-100 text-lime-800"><UserCog class="size-6" aria-hidden="true" /></span>
        <div class="min-w-0 flex-1">
          <p class="eyebrow">Administradores</p>
          <p class="text-sm text-zinc-700">
            <strong class="text-zinc-950">{{ admins?.owner ? '1 propietario' : 'Sin propietario' }}</strong><br />
            {{ plural(admins?.managers.length ?? 0, 'delegado', 'delegados') }}
          </p>
        </div>
        <ChevronRight class="size-5 text-zinc-400 group-hover:text-pitch-700" aria-hidden="true" />
      </RouterLink>
    </div>

    <div class="flex flex-wrap gap-2">
      <RouterLink :to="{ name: 'admin-team-roster', params }" class="btn btn-primary"><Users class="size-4" aria-hidden="true" /> Ver plantilla</RouterLink>
      <RouterLink :to="{ name: 'admin-team-settings', params }" class="btn btn-secondary"><Settings class="size-4" aria-hidden="true" /> Administrar equipo</RouterLink>
    </div>

    <p class="flex items-start gap-2 text-xs text-zinc-500">
      <Info class="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>Tú inscribes a tus jugadores en cada torneo donde juega el equipo (pestaña Torneos). La inscripción del equipo, el calendario y los resultados los gestiona el organizador.</span>
    </p>
  </div>
</template>
