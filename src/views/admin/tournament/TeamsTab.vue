<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRight, ExternalLink, Lock, LogOut, Pencil, Plus, RotateCcw, Shield, X } from 'lucide-vue-next'
import type { Team, TeamInput } from '@/types'
import { useMatchesStore, usePlayersStore, useTeamsStore, useTournamentsStore, useHistoricalNamesStore } from '@/stores'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useEditor } from '@/composables/useEditor'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/services'
import { formatDate, plural } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import TeamForm from '@/components/teams/TeamForm.vue'
import TeamCoverEditor from '@/components/teams/TeamCoverEditor.vue'
import EnrollTeamDialog from '@/components/admin/EnrollTeamDialog.vue'

/**
 * Equipos inscritos en el torneo. El equipo es global (puede haberlo registrado otro
 * organizador): inscribirlo es cosa del torneo; editar su ficha, solo de quien la creó.
 */
const props = defineProps<{ id: string }>()

const teams = useTeamsStore()
/** 10C: dentro de un torneo finalizado, los nombres con que se jugó. */
const names = useHistoricalNamesStore()
const tournaments = useTournamentsStore()
const players = usePlayersStore()
const matches = useMatchesStore()
const { tournament, readOnly, can } = useTournamentWorkspace(() => props.id)
const editor = useEditor<Team>({ openOnNew: false })
const { confirm, ask } = useConfirm()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const enrolling = ref(false)
onMounted(() => {
  if (route.query.new && !readOnly.value) enrolling.value = true
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined } })
})

const enrolled = computed(() =>
  tournaments
    .teamIdsOf(props.id)
    .map((teamId) => names.team(props.id, teamId))
    .filter((t): t is Team => Boolean(t))
    .sort((a, b) => a.name.localeCompare(b.name)),
)

function hasMatches(team: Team) {
  return matches.ofTournament(props.id).some((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
}

function onSubmit(input: TeamInput) {
  const current = editor.current.value
  if (current) editor.save(() => teams.update(current.id, input), 'Ficha del equipo actualizada.')
}
/** La portada se guarda por su cuenta: se refleja en el diálogo y en la lista sin cerrar nada. */
function onCoverChanged(updated: Team) {
  editor.current.value = updated
  teams.items = teams.items.map((t) => (t.id === updated.id ? updated : t))
}

async function unenroll(team: Team) {
  const ok = await confirm({
    title: `¿Quitar a ${team.name} del torneo?`,
    message: `Sale de ${tournament.value?.name} junto con su plantilla en él. El equipo sigue existiendo en Kisokar con su historial.`,
    confirmLabel: 'Quitar equipo',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await tournaments.unenrollTeam(props.id, team.id)
    await players.ensure(true)
    toast.success(`${team.name} ya no está en el torneo.`)
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}

/** 3D: abandonó después de jugar. Sus resultados se conservan; sus pendientes se cancelan. */
async function withdraw(team: Team) {
  const reason = await ask({
    title: `¿Retirar a ${team.name} del torneo?`,
    message:
      'Sus resultados y estadísticas se conservan y siguen contando en la tabla, pero ya no clasifica. Sus partidos pendientes se cancelan (sin marcador ni puntos) y sus jugadores quedan fuera de la plantilla del torneo. No recibe jugadores ni partidos nuevos.',
    label: 'Motivo del retiro',
    placeholder: 'Ej. No se presentó a dos jornadas seguidas',
    confirmLabel: 'Retirar equipo',
    tone: 'danger',
  })
  if (reason === null) return
  try {
    await tournaments.withdrawTeam(props.id, team.id, reason)
    await Promise.all([players.ensure(true), matches.ensure(true)])
    toast.success(`${team.name} quedó retirado del torneo.`)
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}

async function reinstate(team: Team) {
  const reason = await ask({
    title: `¿Reincorporar a ${team.name}?`,
    message: 'Vuelve a participar y a admitir jugadores. Sus partidos cancelados no se restauran (reprograma los que correspondan) y sus jugadores se inscriben de nuevo.',
    label: 'Motivo de la reincorporación',
    placeholder: 'Ej. Acuerdo de la junta de delegados',
    confirmLabel: 'Reincorporar',
  })
  if (reason === null) return
  try {
    await tournaments.reinstateTeam(props.id, team.id, reason)
    toast.success(`${team.name} vuelve a participar.`)
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold">Equipos inscritos</h2>
        <p class="text-sm text-zinc-500">
          {{ enrolled.length ? plural(enrolled.length, 'equipo') : 'Ninguno todavía' }}
          <template v-if="enrolled.length >= 2 && !matches.ofTournament(id).length && !readOnly">
            · ya puedes <RouterLink :to="{ name: 'admin-tournament-schedule', params: { id }, query: { generate: '1' } }" class="link">generar el calendario</RouterLink>
          </template>
        </p>
      </div>
      <AppButton v-if="!readOnly" @click="enrolling = true"><Plus class="size-4" aria-hidden="true" /> Inscribir equipo</AppButton>
    </div>

    <ul v-if="enrolled.length" class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="team in enrolled" :key="team.id" class="card relative flex items-center gap-4 p-4 transition hover:border-zinc-300">
        <TeamLogo :team="team" size="lg" />
        <div class="min-w-0 flex-1">
          <RouterLink
            :to="{ name: 'admin-tournament-team', params: { id, teamId: team.id } }"
            class="block truncate font-bold after:absolute after:inset-0 hover:text-pitch-700"
          >
            {{ team.name }}
          </RouterLink>
          <p v-if="tournaments.withdrawnAt(id, team.id)" class="mt-0.5">
            <StatusBadge :label="`Retirado el ${formatDate(tournaments.withdrawnAt(id, team.id))}`" tone="red" />
          </p>
          <p v-else class="text-sm" :class="players.rosterOf(team.id, id).length ? 'text-zinc-500' : 'font-semibold text-amber-700'">
            {{ players.rosterOf(team.id, id).length ? plural(players.rosterOf(team.id, id).length, 'jugador') : 'Sin plantilla' }}
          </p>
          <p v-if="!teams.canEdit(team.id)" class="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500">
            <Lock class="size-3" aria-hidden="true" /> Ficha administrada por otro organizador
          </p>
        </div>
        <div class="relative z-10 flex items-center gap-1">
          <AppButton variant="ghost" size="sm" icon :to="{ name: 'team', params: { id: team.id } }" :aria-label="`Ver ${team.name} en el sitio público`">
            <ExternalLink class="size-4" aria-hidden="true" />
          </AppButton>
          <AppButton v-if="teams.canEdit(team.id)" variant="ghost" size="sm" icon :aria-label="`Editar ficha de ${team.name}`" @click="editor.edit(team)">
            <Pencil class="size-3.5" aria-hidden="true" />
          </AppButton>
          <template v-if="!readOnly && can('TEAMS')">
            <AppButton
              v-if="tournaments.withdrawnAt(id, team.id)"
              variant="ghost"
              size="sm"
              icon
              :aria-label="`Reincorporar a ${team.name}`"
              title="Reincorporar al torneo"
              @click="reinstate(team)"
            >
              <RotateCcw class="size-4" aria-hidden="true" />
            </AppButton>
            <AppButton
              v-else-if="hasMatches(team)"
              variant="ghost"
              size="sm"
              icon
              :aria-label="`Retirar a ${team.name} del torneo`"
              title="Retirar del torneo (abandonó)"
              @click="withdraw(team)"
            >
              <LogOut class="size-4" aria-hidden="true" />
            </AppButton>
            <AppButton
              v-else
              variant="ghost"
              size="sm"
              icon
              :aria-label="`Quitar a ${team.name} del torneo`"
              title="Quitar del torneo"
              @click="unenroll(team)"
            >
              <X class="size-4" aria-hidden="true" />
            </AppButton>
          </template>
          <ChevronRight class="size-4 text-zinc-300" aria-hidden="true" />
        </div>
      </li>
    </ul>
    <EmptyState
      v-else
      :icon="Shield"
      title="Aún no tienes equipos inscritos"
      description="Si el equipo ya jugó en Kisokar, búscalo y reutilízalo para conservar su historial. Si no existe, créalo."
      class="card"
    >
      <AppButton v-if="!readOnly" @click="enrolling = true"><Plus class="size-4" aria-hidden="true" /> Inscribir primer equipo</AppButton>
    </EmptyState>

    <p v-if="enrolled.length" class="mt-4 text-xs text-zinc-500">
      Un equipo sin partidos se quita del torneo. Si abandona después de jugar, se retira: sus resultados quedan en el historial y en la tabla.
    </p>

    <EnrollTeamDialog :open="enrolling" :tournament-id="id" @close="enrolling = false" />

    <BaseModal
      :open="editor.open.value"
      title="Editar ficha del equipo"
      description="Es la ficha global: el cambio se ve en todos los torneos donde participa."
      size="lg"
      @close="editor.close()"
    >
      <TeamForm v-if="editor.current.value" form-id="team-form" :initial="editor.current.value" @submit="onSubmit" />
      <!-- Equipo sin dueño registrado por el organizador (custodio): también maneja su portada. -->
      <section v-if="editor.current.value" aria-labelledby="team-cover-title" class="mt-6 border-t border-zinc-200 pt-5">
        <h3 id="team-cover-title" class="font-bold">Foto de portada</h3>
        <p class="mb-3 text-sm text-zinc-500">La foto grande del perfil del equipo. Se guarda al momento, aparte de "Guardar cambios".</p>
        <TeamCoverEditor :team="editor.current.value" @changed="onCoverChanged" />
      </section>
      <template #footer>
        <AppButton variant="secondary" :disabled="editor.saving.value" @click="editor.close()">Cancelar</AppButton>
        <AppButton type="submit" form="team-form" :loading="editor.saving.value">Guardar cambios</AppButton>
      </template>
    </BaseModal>
  </div>
</template>
