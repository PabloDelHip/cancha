import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { ID, TrackedSummary } from '@/types'
import { getErrorMessage, tournamentService } from '@/services'
import { useMatchesStore, useTournamentsStore } from '@/stores'

/**
 * Tarjetas de los equipos en seguimiento de un torneo PARTIAL (6G): UNA petición para todos
 * (GET /tournaments/:id/tracked-summary), nunca una por equipo. Se vuelve a pedir si cambian los
 * equipos seguidos o los partidos del torneo cargados en la app. En FULL no se pide nada.
 */
export function useTrackedSummary(tournamentId: MaybeRefOrGetter<ID>) {
  const tournaments = useTournamentsStore()
  const matches = useMatchesStore()
  const summary = ref<TrackedSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const tournament = computed(() => tournaments.get(toValue(tournamentId)))
  const enabled = computed(() => tournament.value?.dataCoverage === 'partial' && tournament.value.trackedTeamIds.length > 0)

  async function load() {
    const id = toValue(tournamentId)
    if (!id || !enabled.value) {
      summary.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      const data = await tournamentService.trackedSummary(id)
      if (id === toValue(tournamentId)) summary.value = data
    } catch (e) {
      error.value = getErrorMessage(e)
    } finally {
      loading.value = false
    }
  }

  const version = computed(() =>
    JSON.stringify([
      tournament.value?.trackedTeamIds ?? [],
      matches.ofTournament(toValue(tournamentId)).map((m) => [m.id, m.status, m.homeScore, m.awayScore, m.homeTeamId, m.awayTeamId]),
    ]),
  )
  watch([() => toValue(tournamentId), version, enabled], load, { immediate: true })

  return { summary, loading, error, reload: load }
}
