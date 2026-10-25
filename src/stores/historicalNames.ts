import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ID, Player, Team, TournamentIdentity } from '@/types'
import { tournamentService } from '@/services'
import { useTournamentsStore } from './tournaments'
import { useTeamsStore } from './teams'
import { usePlayersStore } from './players'
import { playerAsPlayed, teamAsPlayed } from '@/utils/historicalNames'

/**
 * 10C — nombres históricos de los torneos finalizados. Las fichas de equipos y jugadores del store
 * son las ACTUALES; dentro de un torneo finalizado se muestran los nombres con que se jugó
 * (GET /tournaments/:id/identity, una vez por torneo). Sin foto (en curso, o cerrado antes de 10C),
 * los actuales. Solo cambian textos, escudo y colores: ids y datos deportivos son los mismos.
 */
export const useHistoricalNamesStore = defineStore('historicalNames', () => {
  const byTournament = ref(new Map<ID, TournamentIdentity | null>())
  const pending = new Set<ID>()
  const tournaments = useTournamentsStore()
  const teams = useTeamsStore()
  const players = usePlayersStore()

  /** Pide la foto de un torneo FINALIZADO (una sola vez; los demás no tienen). */
  async function ensure(tournamentId: ID | null | undefined) {
    if (!tournamentId || byTournament.value.has(tournamentId) || pending.has(tournamentId)) return
    if (tournaments.get(tournamentId)?.status !== 'finished') return
    pending.add(tournamentId)
    try {
      const identity = await tournamentService.identity(tournamentId)
      byTournament.value = new Map(byTournament.value).set(tournamentId, identity)
    } catch {
      // Sin foto se ven los nombres actuales: la pantalla no se rompe.
      byTournament.value = new Map(byTournament.value).set(tournamentId, null)
    } finally {
      pending.delete(tournamentId)
    }
  }
  function of(tournamentId: ID | null | undefined) {
    if (!tournamentId) return null
    if (!byTournament.value.has(tournamentId)) void ensure(tournamentId)
    return byTournament.value.get(tournamentId) ?? null
  }

  /** El equipo en ese torneo: con su nombre, abreviatura, escudo y colores de entonces si los hay. */
  function team(tournamentId: ID | null | undefined, teamId: ID | null | undefined): Team | undefined {
    return teamAsPlayed(teams.get(teamId), of(tournamentId), teamId)
  }
  /** El jugador en ese torneo: con su nombre deportivo de entonces si lo hay. */
  function player(tournamentId: ID | null | undefined, playerId: ID | null | undefined): Player | undefined {
    return playerAsPlayed(playerId ? players.get(playerId) : undefined, of(tournamentId), playerId)
  }
  /** true = nombres históricos; false = finalizado sin foto (nombres actuales); null = no aplica o cargando. */
  function historical(tournamentId: ID | null | undefined): boolean | null {
    const i = of(tournamentId)
    return i ? i.historical : null
  }

  return { ensure, of, team, player, historical }
})
