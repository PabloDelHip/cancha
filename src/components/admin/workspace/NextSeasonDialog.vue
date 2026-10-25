<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Ban, CalendarPlus, Check } from 'lucide-vue-next'
import type { ID } from '@/types'
import { useTeamsStore, useTournamentsStore } from '@/stores'
import { useTournamentLifecycle } from '@/composables/useTournamentLifecycle'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/services'
import { MODALITY_LABELS, SYSTEM_LABELS } from '@/utils/labels'
import { plural } from '@/utils/format'
import { continuingTeams, nextSeasonErrors } from '@/utils/closure'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * 10B — siguiente temporada a partir de este torneo (POST /tournaments/:id/next-season, solo el
 * propietario). Nace en borrador con la configuración y los equipos elegidos; nunca resultados,
 * estadísticas, sanciones, dinero, jugadores ni colaboradores, y sin calendario. Al crearla se
 * entra a su panel.
 */
const tournaments = useTournamentsStore()
const teamsStore = useTeamsStore()
const { nextSeasonOf, closeNextSeason } = useTournamentLifecycle()
const toast = useToast()
const router = useRouter()

const source = computed(() => (nextSeasonOf.value ? tournaments.get(nextSeasonOf.value) : undefined))
const form = reactive({ name: '', season: '', startDate: '', endDate: '' })
const selected = ref(new Set<ID>())
const saving = ref(false)
const submitted = ref(false)

/** Equipos del torneo de origen: los retirados aparecen, pero desmarcados. */
const teams = computed(() => {
  const id = nextSeasonOf.value
  if (!id) return []
  return tournaments.enrollments
    .filter((e) => e.tournamentId === id)
    .map((e) => ({ id: e.teamId, team: teamsStore.get(e.teamId), withdrawn: !!e.withdrawnAt }))
    .sort((a, b) => Number(a.withdrawn) - Number(b.withdrawn) || (a.team?.name ?? '').localeCompare(b.team?.name ?? ''))
})

watch(
  nextSeasonOf,
  () => {
    submitted.value = false
    Object.assign(form, { name: '', season: '', startDate: '', endDate: '' })
    selected.value = new Set(nextSeasonOf.value ? continuingTeams(tournaments.enrollments, nextSeasonOf.value) : [])
  },
  { immediate: true },
)

function toggle(id: ID) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
const selectAll = (on: boolean) => (selected.value = new Set(on ? teams.value.map((t) => t.id) : []))

const maxTeams = computed(() => source.value?.registration?.maxTeams ?? null)
const errors = computed(() => nextSeasonErrors(form, selected.value.size, maxTeams.value))
const valid = computed(() => Object.values(errors.value).every((e) => !e))
const shown = (key: keyof typeof errors.value) => (submitted.value ? errors.value[key] : null)

/** Lo que se reutiliza, con los datos reales del torneo de origen. */
const reused = computed(() => {
  const t = source.value
  if (!t) return []
  const pts = t.settings.points
  return [
    `Modalidad y categoría: ${MODALITY_LABELS[t.modality]} · ${t.category}`,
    `Sistema: ${SYSTEM_LABELS[t.settings.system]}${pts ? ` (${pts.win}/${pts.draw}/${pts.loss} puntos)` : ''}`,
    ...(t.venue ? [`Sede: ${t.venue}`] : []),
    'Reglamento disciplinario y restricciones de calendario',
    'Información del torneo (costos, horarios, reglamento, contacto) y límites de inscripción',
    'La misma liga',
  ]
})
const NOT_COPIED = ['Partidos, calendario y resultados', 'Tabla, goleadores y estadísticas', 'Sanciones y bloqueos', 'Cargos, pagos y adeudos', 'Jugadores inscritos (se inscriben de nuevo)', 'Colaboradores y logo']

async function create() {
  submitted.value = true
  if (!source.value || !valid.value || saving.value) return
  saving.value = true
  try {
    const result = await tournaments.nextSeason(source.value.id, {
      name: form.name.trim(),
      season: form.season.trim(),
      startDate: form.startDate,
      endDate: form.endDate || null,
      teamIds: [...selected.value],
    })
    toast.success(`${result.tournament.name} creado en borrador con ${plural(result.teams.enrolled, 'equipo')}.`)
    closeNextSeason()
    await router.push({ name: 'admin-tournament', params: { id: result.tournament.id } })
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="!!source"
    title="Crear siguiente temporada"
    :description="source ? `A partir de ${source.name}. Se crea en borrador: podrás revisarla antes de iniciarla.` : undefined"
    size="lg"
    @close="saving || closeNextSeason()"
  >
    <form v-if="source" id="next-season-form" class="space-y-5 text-sm" novalidate @submit.prevent="create">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="ns-name" label="Nombre del nuevo torneo" :error="shown('name')" required class="sm:col-span-2">
          <input id="ns-name" v-model="form.name" class="input" maxlength="120" :placeholder="`Ej. ${source.name} 2`" :aria-invalid="!!shown('name') || undefined" :aria-describedby="shown('name') ? 'ns-name-error' : undefined" />
        </FormField>
        <FormField id="ns-season" label="Temporada" hint="Opcional, p. ej. Clausura 2027">
          <input id="ns-season" v-model="form.season" class="input" maxlength="60" aria-describedby="ns-season-hint" />
        </FormField>
        <div class="hidden sm:block" aria-hidden="true" />
        <FormField id="ns-start" label="Fecha de inicio" :error="shown('startDate')" required>
          <input id="ns-start" v-model="form.startDate" type="date" class="input" :aria-invalid="!!shown('startDate') || undefined" :aria-describedby="shown('startDate') ? 'ns-start-error' : undefined" />
        </FormField>
        <FormField id="ns-end" label="Fecha de fin" :error="shown('endDate')" hint="Opcional">
          <input id="ns-end" v-model="form.endDate" type="date" class="input" :min="form.startDate || undefined" :aria-invalid="!!shown('endDate') || undefined" :aria-describedby="shown('endDate') ? 'ns-end-error' : 'ns-end-hint'" />
        </FormField>
      </div>

      <fieldset>
        <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <legend class="font-semibold text-zinc-900">Equipos que continúan <span class="font-normal text-zinc-500">· {{ selected.size }} de {{ teams.length }}</span></legend>
          <div v-if="teams.length" class="flex gap-3 text-xs font-semibold">
            <button type="button" class="link" @click="selectAll(true)">Todos</button>
            <button type="button" class="link" @click="selectAll(false)">Ninguno</button>
          </div>
        </div>
        <p v-if="!teams.length" class="rounded-xl bg-zinc-50 p-3 text-zinc-600">Este torneo no tiene equipos inscritos: la temporada se crea vacía.</p>
        <ul v-else class="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
          <li v-for="t in teams" :key="t.id">
            <label class="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors" :class="selected.has(t.id) ? 'border-pitch-300 bg-pitch-50/60' : 'border-zinc-200 hover:bg-zinc-50'">
              <input type="checkbox" class="size-4 accent-pitch-700" :checked="selected.has(t.id)" @change="toggle(t.id)" />
              <TeamLogo :team="t.team" size="xs" />
              <span class="min-w-0 flex-1 truncate font-semibold text-zinc-900">{{ t.team?.name ?? 'Equipo' }}</span>
              <span v-if="t.withdrawn" class="shrink-0 text-xs text-zinc-500">Se retiró</span>
            </label>
          </li>
        </ul>
        <p v-if="shown('teams') || errors.teams" class="mt-1 text-xs font-medium text-red-600" role="alert">{{ errors.teams }}</p>
        <p class="mt-2 text-xs text-zinc-500">Se inscriben los mismos equipos (no se duplican). Sus jugadores se registran de nuevo en la temporada.</p>
      </fieldset>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section class="rounded-xl border border-pitch-200 bg-pitch-50/50 p-3" aria-labelledby="ns-copied">
          <h3 id="ns-copied" class="mb-1.5 font-semibold text-pitch-900">Se reutiliza</h3>
          <ul class="space-y-1 text-pitch-900/90">
            <li v-for="r in reused" :key="r" class="flex gap-1.5"><Check class="mt-0.5 size-4 shrink-0 text-pitch-600" aria-hidden="true" />{{ r }}</li>
          </ul>
        </section>
        <section class="rounded-xl border border-zinc-200 bg-zinc-50 p-3" aria-labelledby="ns-not-copied">
          <h3 id="ns-not-copied" class="mb-1.5 font-semibold text-zinc-900">No se copia</h3>
          <ul class="space-y-1 text-zinc-600">
            <li v-for="r in NOT_COPIED" :key="r" class="flex gap-1.5"><Ban class="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden="true" />{{ r }}</li>
          </ul>
        </section>
      </div>
      <p class="text-xs text-zinc-500">
        El calendario no se genera solo: lo armas en la nueva temporada. Las fechas de inscripción anteriores se borran y la inscripción por
        enlace queda cerrada hasta que la abras. {{ source.name }} no cambia.
      </p>
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="closeNextSeason()">Cancelar</AppButton>
      <AppButton type="submit" form="next-season-form" :loading="saving">
        <CalendarPlus class="size-4" aria-hidden="true" /> Crear temporada en borrador
      </AppButton>
    </template>
  </BaseModal>
</template>
