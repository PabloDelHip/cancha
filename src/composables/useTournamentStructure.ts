import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { ID, TournamentStructure } from '@/types'
import { getErrorMessage, tournamentService } from '@/services'
import { useMatchesStore } from '@/stores'

/**
 * Estructura del torneo (fases, grupos, cuadro, campeón) tal como la calcula el servidor. Se vuelve
 * a pedir cuando cambian los partidos del torneo cargados en la app (resultados, estados, equipos).
 */
export function useTournamentStructure(tournamentId: MaybeRefOrGetter<ID>, enabled: MaybeRefOrGetter<boolean> = true) {
  const matches = useMatchesStore()
  const structure = ref<TournamentStructure | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    const id = toValue(tournamentId)
    // Seguimiento parcial: el servidor no publica la estructura (409); ni se pide.
    if (!id || !toValue(enabled)) return
    error.value = null
    try {
      const data = await tournamentService.structure(id)
      if (id === toValue(tournamentId)) structure.value = data
    } catch (e) {
      error.value = getErrorMessage(e)
    } finally {
      loading.value = false
    }
  }

  const version = computed(() =>
    JSON.stringify(
      matches.ofTournament(toValue(tournamentId)).map((m) => [m.id, m.status, m.homeScore, m.awayScore, m.homeTeamId, m.awayTeamId, m.penalties]),
    ),
  )
  watch([() => toValue(tournamentId), version, () => toValue(enabled)], load, { immediate: true })

  return { structure, loading, error, reload: load }
}
