<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Archive, CalendarPlus, Medal, Trophy } from 'lucide-vue-next'
import type { ClosurePreview, ID } from '@/types'
import { useTournamentsStore } from '@/stores'
import { useTournamentLifecycle } from '@/composables/useTournamentLifecycle'
import { tournamentService } from '@/services'
import { formatDate, plural } from '@/utils/format'
import { ROLE_LABEL } from '@/utils/labels'
import AppButton from '@/components/common/AppButton.vue'

/**
 * 10B — resumen de un torneo finalizado en el panel: campeón y subcampeón (de la estructura, como
 * el historial), goleador, cuándo se cerró y accesos a todo lo consultable. Quien puede finalizar
 * (LIFECYCLE) lo lee de la vista previa del cierre; el propietario puede crear la siguiente temporada.
 */
const props = defineProps<{ tournamentId: ID }>()
const tournaments = useTournamentsStore()
const { askNextSeason } = useTournamentLifecycle()

const preview = ref<ClosurePreview | null>(null)
watch(
  () => props.tournamentId,
  async (id) => {
    preview.value = null
    if (!tournaments.can(id, 'LIFECYCLE')) return
    try {
      preview.value = await tournamentService.closure(id)
    } catch {
      // Sin vista previa el resumen se ve igual, sin campeón: los accesos siguen disponibles.
    }
  },
  { immediate: true },
)
const isOwner = computed(() => tournaments.roleOf(props.tournamentId) === 'OWNER')
const p = computed(() => ({ id: props.tournamentId }))
const closedOn = computed(() => {
  const f = preview.value?.finished
  if (!f?.at) return null
  return `Finalizado el ${formatDate(f.at.slice(0, 10), 'long')}${f.role ? ` (${ROLE_LABEL[f.role].toLowerCase()})` : ''}${f.pendingAtFinish ? ` con ${plural(f.pendingAtFinish, 'partido')} sin jugar` : ''}.`
})
const links = computed(() => [
  { label: 'Resultados', to: { name: 'admin-tournament-schedule', params: p.value, query: { view: 'finished' } } },
  { label: 'Tabla final', to: { name: 'admin-tournament-standings', params: p.value } },
  { label: 'Goleadores', to: { name: 'admin-tournament-scorers', params: p.value } },
  { label: 'Equipos', to: { name: 'admin-tournament-teams', params: p.value }, permission: 'TEAMS' as const },
  { label: 'Reportes', to: { name: 'admin-tournament-reports', params: p.value } },
].filter((l) => !l.permission || tournaments.can(props.tournamentId, l.permission)))
</script>

<template>
  <div class="space-y-4 p-5">
    <div class="flex items-start gap-3">
      <Trophy class="mt-0.5 size-6 shrink-0 text-amber-500" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <h2 id="guide-title" class="font-bold text-zinc-950">Torneo finalizado</h2>
        <p class="text-sm text-zinc-600">Sus resultados están protegidos: se consultan y exportan, pero ya no se modifican.</p>
        <p v-if="closedOn" class="mt-0.5 text-xs text-zinc-500">{{ closedOn }}</p>
      </div>
      <AppButton v-if="isOwner" class="shrink-0 max-sm:hidden" @click="askNextSeason(tournamentId)">
        <CalendarPlus class="size-4" aria-hidden="true" /> Crear siguiente temporada
      </AppButton>
    </div>

    <dl v-if="preview && (preview.champion || preview.runnerUp || preview.topScorers[0])" class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
      <div v-if="preview.champion" class="rounded-xl bg-amber-50 px-3 py-2">
        <dt class="flex items-center gap-1 text-xs font-semibold text-amber-800"><Trophy class="size-3.5" aria-hidden="true" /> Campeón</dt>
        <dd class="font-bold text-zinc-950">{{ preview.champion.name }}</dd>
      </div>
      <div v-if="preview.runnerUp" class="rounded-xl bg-zinc-50 px-3 py-2">
        <dt class="flex items-center gap-1 text-xs font-semibold text-zinc-500"><Medal class="size-3.5" aria-hidden="true" /> Subcampeón</dt>
        <dd class="font-bold text-zinc-950">{{ preview.runnerUp.name }}</dd>
      </div>
      <div v-if="preview.topScorers[0]" class="rounded-xl bg-zinc-50 px-3 py-2">
        <dt class="text-xs font-semibold text-zinc-500">Campeón de goleo</dt>
        <dd class="font-bold text-zinc-950">{{ preview.topScorers[0].name }} <span class="font-normal text-zinc-500">· {{ plural(preview.topScorers[0].goals, 'gol', 'goles') }}</span></dd>
      </div>
    </dl>

    <nav aria-label="Consultar el torneo finalizado" class="flex flex-wrap gap-2">
      <RouterLink v-for="l in links" :key="l.label" :to="l.to" class="btn btn-secondary">{{ l.label }}</RouterLink>
    </nav>
    <AppButton v-if="isOwner" class="w-full sm:hidden" @click="askNextSeason(tournamentId)">
      <CalendarPlus class="size-4" aria-hidden="true" /> Crear siguiente temporada
    </AppButton>
    <p class="flex items-start gap-1.5 text-xs text-zinc-500">
      <Archive class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> Las temporadas anteriores de la liga se ven juntas en «Mis torneos» y en la página de la liga.
    </p>
  </div>
</template>
