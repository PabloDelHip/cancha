import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ID, Standing } from '@/types'
import { tournamentService } from '@/services'
import { isPlayed } from '@/utils/stats'
import { useMatchesStore } from './matches'
import { useTournamentsStore } from './tournaments'

/**
 * Tablas de posiciones tal como las calcula el servidor (GET /tournaments/:id/standings).
 *
 * `sync(id, version)` vuelve a pedir la tabla solo cuando cambia la versión de los datos de
 * los que depende (equipos, resultados, puntuación): varias vistas del mismo torneo comparten
 * una sola petición, y una respuesta atrasada nunca pisa a una más reciente.
 */
export const useStandingsStore = defineStore('standings', () => {
  const byTournament = ref<Record<ID, Standing[]>>({})
  const requested = new Map<ID, string>()

  function of(tournamentId: ID): Standing[] | undefined {
    return byTournament.value[tournamentId]
  }

  /**
   * Versión de lo que determina la tabla de un torneo: equipos inscritos, puntuación y partidos
   * finalizados (marcador, equipos, fecha). Si cambia, la tabla se vuelve a pedir al servidor.
   */
  function versionOf(tournamentId: ID): string {
    const tournaments = useTournamentsStore()
    const matches = useMatchesStore()
    return JSON.stringify([
      tournaments.teamIdsOf(tournamentId),
      tournaments.get(tournamentId)?.settings.points ?? null,
      matches
        .ofTournament(tournamentId)
        .filter(isPlayed)
        .map((m) => [m.id, m.homeTeamId, m.awayTeamId, m.homeScore, m.awayScore, m.date, m.time]),
    ])
  }

  async function sync(tournamentId: ID, version: string) {
    if (requested.get(tournamentId) === version) return
    requested.set(tournamentId, version)
    try {
      const rows = await tournamentService.standings(tournamentId)
      if (requested.get(tournamentId) === version) byTournament.value = { ...byTournament.value, [tournamentId]: rows }
    } catch {
      // Se conserva la última tabla conocida; el siguiente cambio de datos la vuelve a pedir.
      if (requested.get(tournamentId) === version) requested.delete(tournamentId)
    }
  }

  return { of, sync, versionOf }
})
