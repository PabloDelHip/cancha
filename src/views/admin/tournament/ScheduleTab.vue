<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarClock, CalendarRange, CheckCircle2, History, Pencil, Plus, Trash2, Wand2 } from 'lucide-vue-next'
import type { Match, MatchInput, MatchStatus, Team } from '@/types'
import { useMatchesStore, useRoundsStore, useTeamsStore, useTournamentsStore, type RoundView } from '@/stores'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentStructure } from '@/composables/useTournamentStructure'
import { useEditor } from '@/composables/useEditor'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { getErrorMessage, USE_MOCKS } from '@/services'
import { isPendingCapture } from '@/utils/matches'
import { formatDate, plural } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MatchForm from '@/components/matches/MatchForm.vue'
import AdminMatchRow from '@/components/admin/AdminMatchRow.vue'
import GenerateScheduleDialog from '@/components/admin/workspace/GenerateScheduleDialog.vue'
import RoundDialog from '@/components/admin/workspace/RoundDialog.vue'
import RefereeAssignmentDialog from '@/components/admin/referees/RefereeAssignmentDialog.vue'
import MatchHistoryDialog from '@/components/admin/history/MatchHistoryDialog.vue'

/**
 * Calendario del torneo: jornadas (organización deportiva) y sus partidos (programación
 * real: fecha y hora). Aquí se genera el calendario, se programan, mueven, posponen y
 * capturan partidos.
 */
const props = defineProps<{ id: string }>()

type View = 'rounds' | 'upcoming' | 'finished' | 'postponed' | 'pending'

const matches = useMatchesStore()
const roundsStore = useRoundsStore()
const teams = useTeamsStore()
const tournaments = useTournamentsStore()
const stats = useTournamentStats(() => props.id)
const { tournament, readOnly, can } = useTournamentWorkspace(() => props.id)
/** Programar (jornadas, partidos, calendario): con el torneo finalizado o sin permiso, solo lectura. */
const scheduleLocked = computed(() => readOnly.value || !can('SCHEDULE'))
const editor = useEditor<Match>({ openOnNew: false })
const { confirm } = useConfirm()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const rounds = computed(() => stats.roundViews.value)
/**
 * Partidos a mano: el organizador arma sus jornadas como quiera y cuentan en la tabla.
 * - Liga clásica: siempre.
 * - Liga + playoffs: en la fase regular mientras siga abierta (una eliminatoria AUTOMÁTICA la cierra:
 *   sus resultados definieron los clasificados; una armada a mano, no).
 * - Grupos: una vez armados los grupos; cada partido es entre equipos del mismo grupo.
 * - Eliminación directa: los cruces se arman en Competición.
 * El servidor aplica las mismas reglas.
 */
const system = computed(() => tournament.value?.settings.system ?? 'league')
const needsStructure = computed(() => (system.value === 'league_playoffs' || system.value === 'groups_knockout'))
const { structure } = useTournamentStructure(() => props.id, needsStructure)
const regularOpen = computed(() => !structure.value?.phases.some((p) => p.index > 0 && p.generated && p.type === 'knockout' && !p.manual))
const groups = computed(() => {
  const p = structure.value?.phases[0]
  return p?.type === 'groups' && p.generated ? p.groups.map((g) => ({ key: g.key, teamIds: g.teamIds })) : []
})
const manual = computed(() => {
  if (system.value === 'league') return true
  if (system.value === 'league_playoffs') return regularOpen.value
  if (system.value === 'groups_knockout') return regularOpen.value && groups.value.length > 0
  return false
})
const all = computed(() => stats.matches.value)
const tournamentTeams = computed(() =>
  tournaments
    .teamIdsOf(props.id)
    .map((teamId) => teams.get(teamId))
    .filter((t): t is Team => Boolean(t))
    .sort((a, b) => a.name.localeCompare(b.name)),
)

// ─── Vista y jornada seleccionada (viajan en la URL) ──────────────────────
const VIEWS: View[] = ['rounds', 'upcoming', 'finished', 'postponed', 'pending']
const view = ref<View>(VIEWS.includes(route.query.view as View) ? (route.query.view as View) : 'rounds')
const selected = ref<number | null>(Number(route.query.round) || null)
watch(
  [rounds, () => stats.currentRound.value],
  () => {
    if (selected.value === null || !rounds.value.some((r) => r.number === selected.value)) {
      selected.value = rounds.value.length ? stats.currentRound.value : null
    }
  },
  { immediate: true },
)
watch([view, selected], ([v, r]) => {
  router.replace({ query: { ...route.query, view: v === 'rounds' ? undefined : v, round: v === 'rounds' && r ? String(r) : undefined } })
})
const round = computed(() => rounds.value.find((r) => r.number === selected.value))

const counts = computed(() => ({
  upcoming: all.value.filter((m) => m.status === 'scheduled' || m.status === 'live').length,
  finished: all.value.filter((m) => m.status === 'finished').length,
  postponed: all.value.filter((m) => m.status === 'postponed').length,
  pending: all.value.filter((m) => isPendingCapture(m)).length,
}))
const viewOptions = computed(() =>
  [
    { value: 'rounds' as const, label: 'Por jornada', count: null },
    { value: 'upcoming' as const, label: 'Próximos', count: counts.value.upcoming },
    { value: 'finished' as const, label: 'Finalizados', count: counts.value.finished },
    { value: 'postponed' as const, label: 'Pospuestos', count: counts.value.postponed },
    { value: 'pending' as const, label: 'Por capturar', count: counts.value.pending },
  ].filter((o) => o.value === 'rounds' || o.value === 'upcoming' || o.value === 'finished' || o.count),
)

/** Vistas filtradas: partidos agrupados por jornada. */
const filteredGroups = computed(() => {
  const test: Record<Exclude<View, 'rounds'>, (m: Match) => boolean> = {
    upcoming: (m) => m.status === 'scheduled' || m.status === 'live',
    finished: (m) => m.status === 'finished',
    postponed: (m) => m.status === 'postponed',
    pending: (m) => isPendingCapture(m),
  }
  if (view.value === 'rounds') return []
  const fn = test[view.value]
  const groups = rounds.value
    .map((r) => ({ round: r, matches: r.matches.filter(fn) }))
    .filter((g) => g.matches.length)
  return view.value === 'finished' ? groups.reverse() : groups
})

function roundSummary(r: RoundView) {
  const active = r.matches.filter((m) => m.status !== 'cancelled')
  const done = active.filter((m) => m.status === 'finished').length
  return { done, total: active.length, complete: active.length > 0 && done === active.length }
}
/** Equipos inscritos que no juegan en la jornada (descanso o partido por programar). */
const resting = computed(() => {
  if (!round.value?.matches.length) return []
  const playing = new Set(round.value.matches.filter((m) => m.status !== 'cancelled').flatMap((m) => [m.homeTeamId, m.awayTeamId]))
  return tournamentTeams.value.filter((t) => !playing.has(t.id))
})

// ─── Diálogos ─────────────────────────────────────────────────────────────
const generating = ref(false)
const roundDialog = ref<{ open: boolean; round: RoundView | null }>({ open: false, round: null })
const matchDefaults = ref<{ round: number; status?: MatchStatus }>({ round: 1 })

onMounted(() => {
  if (scheduleLocked.value) return
  if (route.query.generate) generating.value = true
  else if (route.query.new) newMatch()
  else if (route.query.round === 'new') roundDialog.value = { open: true, round: null }
  if (route.query.generate || route.query.new || route.query.round === 'new') {
    router.replace({ query: { ...route.query, generate: undefined, new: undefined, round: undefined } })
  }
})

function newMatch(roundNumber?: number) {
  matchDefaults.value = { round: roundNumber ?? round.value?.number ?? roundsStore.nextNumber(props.id) }
  editor.create()
}
/** Historial abierto: de un partido o (sin matchId) de todo el torneo. */
const historyOf = ref<{ matchId: string | null; title: string } | null>(null)
/** Partido cuyo diálogo de árbitros está abierto. */
const refereesOf = ref<Match | null>(null)

function editMatch(m: Match, status?: MatchStatus) {
  matchDefaults.value = { round: m.round, status }
  editor.edit(m)
}

function onSubmitMatch(input: MatchInput) {
  const current = editor.current.value
  editor.save(
    async () => {
      const saved = current ? await matches.update(current.id, input) : await matches.create(input)
      // El servidor crea el registro de la jornada al programar/mover: se refrescan las jornadas.
      await roundsStore.ensure(true)
      view.value = 'rounds'
      selected.value = saved.round
    },
    current ? (current.round !== input.round ? `Partido movido a ${roundsStore.labelOf(props.id, input.round)}.` : 'Partido actualizado.') : 'Partido programado.',
  )
}

/** Posponer abre el mismo formulario con el estado ya elegido: ahí se escribe el motivo. */
function postpone(m: Match) {
  editMatch(m, 'postponed')
}

const canDeleteCurrent = computed(() => {
  const m = editor.current.value
  return !!m && !m.stage?.tie && (!m.stage || manual.value) && m.status !== 'finished' && m.homeScore === null && !matches.statsOf(m.id).length
})
async function deleteCurrent() {
  const m = editor.current.value
  if (!m) return
  const ok = await confirm({
    title: '¿Eliminar este partido?',
    message: 'Solo se pueden eliminar partidos sin resultado. Si no se va a jugar, también puedes marcarlo como cancelado.',
    confirmLabel: 'Eliminar partido',
    tone: 'danger',
  })
  if (!ok) return
  editor.save(() => matches.remove(m.id), 'Partido eliminado.')
}

async function deleteRound(r: RoundView) {
  if (!r.record) return
  try {
    await roundsStore.remove(props.id, r.number)
    selected.value = null
    toast.success(`${r.label} eliminada.`)
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold">Calendario</h2>
        <p class="text-sm text-zinc-500">
          <template v-if="all.length">
            {{ plural(rounds.length, 'jornada') }} · {{ plural(all.length, 'partido') }} · {{ counts.finished }} jugados
            <template v-if="stats.openCount.value"> · {{ stats.openCount.value }} por jugar</template>
          </template>
          <template v-else>Organiza las jornadas y programa los partidos.</template>
        </p>
      </div>
      <div v-if="!scheduleLocked" class="flex flex-wrap gap-2">
        <AppButton :variant="all.length ? 'secondary' : 'primary'" :disabled="tournamentTeams.length < 2" @click="generating = true">
          <Wand2 class="size-4" aria-hidden="true" /> Generar calendario
        </AppButton>
        <AppButton v-if="manual && (all.length || rounds.length)" @click="newMatch()"><Plus class="size-4" aria-hidden="true" /> Programar partido</AppButton>
      </div>
      <AppButton v-if="!USE_MOCKS && (all.length || rounds.length)" variant="ghost" @click="historyOf = { matchId: null, title: 'Historial de partidos' }">
        <History class="size-4" aria-hidden="true" /> Historial
      </AppButton>
    </div>

    <!-- Sin calendario -->
    <template v-if="!rounds.length">
      <EmptyState
        v-if="tournamentTeams.length < 2"
        :icon="CalendarRange"
        title="Primero inscribe equipos"
        :description="`Necesitas al menos dos equipos para armar el calendario. Ahora tienes ${tournamentTeams.length}.`"
        class="card"
      >
        <AppButton v-if="!readOnly && can('TEAMS')" :to="{ name: 'admin-tournament-teams', params: { id }, query: { new: '1' } }">Inscribir equipos</AppButton>
      </EmptyState>
      <EmptyState
        v-else
        illustrated
        title="Aún no hay calendario"
        :description="system === 'knockout' ? `Tienes ${plural(tournamentTeams.length, 'equipo')}. Cancha puede armar el cuadro con cabezas de serie, o puedes armarlo tú y elegir cada cruce.` : system === 'groups_knockout' && !groups.length ? `Tienes ${plural(tournamentTeams.length, 'equipo')}. Cancha puede generar los grupos y sus jornadas, o puedes elegir tú los grupos y programar los partidos a mano.` : `Tienes ${plural(tournamentTeams.length, 'equipo')}. Cancha puede generar todas las jornadas, o puedes programarlas tú a mano: cuentan igual en la tabla.`"
        class="card"
      >

        <template v-if="!scheduleLocked">
          <AppButton @click="generating = true"><Wand2 class="size-4" aria-hidden="true" /> Generar calendario</AppButton>
          <AppButton v-if="manual" variant="ghost" @click="newMatch(1)">Programar a mano</AppButton>
        </template>
      </EmptyState>
    </template>

    <template v-else>
      <!-- Vista -->
      <div role="radiogroup" aria-label="Vista del calendario" class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          v-for="o in viewOptions"
          :key="o.value"
          type="button"
          role="radio"
          :aria-checked="view === o.value"
          class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors"
          :class="
            view === o.value
              ? o.value === 'pending'
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-pitch-900 bg-pitch-900 text-white'
              : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
          "
          @click="view = o.value"
        >
          {{ o.label }}
          <span v-if="o.count !== null" class="tabular rounded-full px-1.5 text-xs" :class="view === o.value ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500'">
            {{ o.count }}
          </span>
        </button>
      </div>

      <!-- Por jornada -->
      <template v-if="view === 'rounds'">
        <div role="tablist" aria-label="Jornadas" class="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            v-for="r in rounds"
            :key="r.number"
            type="button"
            role="tab"
            :aria-selected="selected === r.number"
            :title="r.label"
            class="relative h-9 min-w-11 shrink-0 rounded-lg border px-2.5 text-sm font-semibold transition-colors"
            :class="
              selected === r.number
                ? 'border-pitch-900 bg-pitch-900 text-white'
                : roundSummary(r).complete
                  ? 'border-pitch-200 bg-pitch-50 text-pitch-800 hover:border-pitch-300'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
            "
            @click="selected = r.number"
          >
            J{{ r.number }}
            <span v-if="r.number === stats.currentRound.value && !roundSummary(r).complete" class="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-white bg-lime-400" aria-label="(jornada actual)" />
          </button>
          <button
            v-if="!scheduleLocked && manual"
            type="button"
            class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-2.5 text-sm font-semibold text-zinc-500 hover:border-pitch-400 hover:text-pitch-700"
            @click="roundDialog = { open: true, round: null }"
          >
            <Plus class="size-3.5" aria-hidden="true" /> Jornada
          </button>
        </div>

        <section v-if="round" role="tabpanel" :aria-label="round.label">
          <div class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 class="display text-2xl text-zinc-900">{{ round.label }}</h3>
            <span v-if="round.customName" class="text-xs text-zinc-500">Jornada {{ round.number }}</span>
            <span v-if="round.date" class="text-sm text-zinc-500">{{ formatDate(round.date, 'long') }}</span>
            <span v-if="roundSummary(round).complete" class="inline-flex items-center gap-1 text-xs font-semibold text-pitch-700">
              <CheckCircle2 class="size-3.5" aria-hidden="true" /> Completa
            </span>
            <span v-else-if="roundSummary(round).total" class="text-xs text-zinc-500">{{ roundSummary(round).done }}/{{ roundSummary(round).total }} jugados</span>
            <span v-if="!scheduleLocked" class="ml-auto flex gap-1">
              <AppButton variant="ghost" size="sm" @click="roundDialog = { open: true, round }"><Pencil class="size-3.5" aria-hidden="true" /> Editar jornada</AppButton>
              <AppButton v-if="manual" variant="secondary" size="sm" @click="newMatch(round.number)"><Plus class="size-3.5" aria-hidden="true" /> Partido</AppButton>
            </span>
          </div>

          <ul v-if="round.matches.length" class="card divide-y divide-zinc-100 overflow-hidden">
            <AdminMatchRow
              v-for="m in round.matches"
              :key="m.id"
              :match="m"
              :read-only="readOnly"
              :can-schedule="can('SCHEDULE')"
              :can-assign="can('ASSIGNMENTS')"
              :can-capture="can('RESULTS')"
              :allow-postpone="true"
              @edit="editMatch(m)"
              @postpone="postpone(m)"
              @reschedule="editMatch(m, 'scheduled')"
              @referees="refereesOf = m"
              @history="historyOf = { matchId: m.id, title: `${teams.nameOf(m.homeTeamId)} vs ${teams.nameOf(m.awayTeamId)}` }"
            />
          </ul>
          <EmptyState v-else :icon="CalendarClock" title="Jornada sin partidos" compact class="card">
            <template v-if="!scheduleLocked">
              <AppButton v-if="manual" size="sm" @click="newMatch(round.number)"><Plus class="size-3.5" aria-hidden="true" /> Agregar partido</AppButton>
              <AppButton v-if="round.record" variant="ghost" size="sm" @click="deleteRound(round)">
                <Trash2 class="size-3.5" aria-hidden="true" /> Eliminar jornada
              </AppButton>
            </template>
          </EmptyState>
          <p v-if="manual && resting.length" class="mt-2 text-xs text-zinc-500">
            {{ resting.length === 1 ? 'Descansa' : 'No juegan' }}: {{ resting.map((t) => t.name).join(', ') }}
          </p>
        </section>
      </template>

      <!-- Vistas filtradas -->
      <template v-else>
        <div v-if="filteredGroups.length" class="space-y-5">
          <section v-for="g in filteredGroups" :key="g.round.number" :aria-label="g.round.label">
            <h3 class="mb-2 flex items-baseline gap-2">
              <button type="button" class="display text-xl text-zinc-900 hover:text-pitch-700" @click="(view = 'rounds'), (selected = g.round.number)">
                {{ g.round.label }}
              </button>
              <span v-if="g.round.date" class="text-xs text-zinc-500">{{ formatDate(g.round.date) }}</span>
            </h3>
            <ul class="card divide-y divide-zinc-100 overflow-hidden">
              <AdminMatchRow
                v-for="m in g.matches"
                :key="m.id"
                :match="m"
                :read-only="readOnly"
                :can-schedule="can('SCHEDULE')"
                :can-assign="can('ASSIGNMENTS')"
                :can-capture="can('RESULTS')"
                :allow-postpone="true"
                @edit="editMatch(m)"
                @postpone="postpone(m)"
                @reschedule="editMatch(m, 'scheduled')"
                @referees="refereesOf = m"
                @history="historyOf = { matchId: m.id, title: `${teams.nameOf(m.homeTeamId)} vs ${teams.nameOf(m.awayTeamId)}` }"
              />
            </ul>
          </section>
        </div>
        <EmptyState v-else :icon="CheckCircle2" title="Nada por aquí" description="No hay partidos con este filtro." class="card" />
      </template>
    </template>

    <GenerateScheduleDialog
      :open="generating"
      :tournament-id="id"
      @close="generating = false"
      @generated="(n) => ((view = 'rounds'), (selected = n))"
    />
    <MatchHistoryDialog
      :open="!!historyOf"
      :match-id="historyOf?.matchId ?? null"
      :tournament-id="id"
      :title="historyOf?.title ?? 'Historial'"
      @close="historyOf = null"
    />
    <RefereeAssignmentDialog
      :open="!!refereesOf"
      :match="refereesOf"
      :read-only="readOnly || !can('ASSIGNMENTS')"
      @close="refereesOf = null"
      @changed="(r) => refereesOf && matches.patch(refereesOf.id, { referees: r.referees, centralReferee: r.centralReferee })"
    />
    <RoundDialog
      :open="roundDialog.open"
      :tournament-id="id"
      :round="roundDialog.round"
      :next-number="roundsStore.nextNumber(id)"
      @close="roundDialog.open = false"
      @saved="(n) => ((view = 'rounds'), (selected = n))"
    />

    <BaseModal
      :open="editor.open.value"
      :title="editor.current.value ? (matchDefaults.status === 'scheduled' && editor.current.value.status === 'postponed' ? 'Reprogramar partido' : 'Editar partido') : 'Programar partido'"
      size="lg"
      @close="editor.close()"
    >
      <MatchForm
        v-if="editor.open.value"
        form-id="match-form"
        :initial="editor.current.value"
        :tournament-id="id"
        :teams="tournamentTeams"
        :rounds="rounds"
        :default-round="matchDefaults.round"
        :default-status="matchDefaults.status"
        :default-venue="tournament?.venue"
        :groups="groups.length ? groups : undefined"
        @submit="onSubmitMatch"
      />
      <template #footer>
        <AppButton v-if="canDeleteCurrent" variant="ghost" class="mr-auto text-red-700" :disabled="editor.saving.value" @click="deleteCurrent">
          <Trash2 class="size-4" aria-hidden="true" /> Eliminar
        </AppButton>
        <AppButton variant="secondary" :disabled="editor.saving.value" @click="editor.close()">Cancelar</AppButton>
        <AppButton type="submit" form="match-form" :loading="editor.saving.value">
          {{ editor.current.value ? 'Guardar cambios' : 'Programar partido' }}
        </AppButton>
      </template>
    </BaseModal>
  </div>
</template>
