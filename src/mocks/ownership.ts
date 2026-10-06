/**
 * Reglas de propiedad en modo mock: imitan al backend (OwnershipService) para que la demo
 * se comporte igual. NO son seguridad: la seguridad real la aplica siempre el servidor.
 *
 * - Torneo, sus inscripciones, partidos y resultados → solo su organizador (organizerId).
 * - Equipo / jugador (globales) → editar la ficha solo quien la registró (createdBy).
 * - Torneo finalizado → solo lectura para operaciones deportivas (regla propuesta para el
 *   backend: docs/torneo-real-v1-backend-gaps.md). El backend real aún no la aplica.
 */
import type { ID } from '@/types'
import { getDb, MockNotFoundError } from './db'
import { MockHttpError, requireMockUser } from './session'

export function assertTournamentOwner(tournamentId: ID): ID {
  const userId = requireMockUser()
  const tournament = getDb().tournaments.find((t) => t.id === tournamentId)
  if (!tournament) throw new MockNotFoundError('Torneo', tournamentId)
  if (tournament.organizerId !== userId) throw new MockHttpError(403, 'No tienes permiso para modificar este torneo')
  return userId
}

/** Dueño del torneo y torneo no finalizado: inscripciones, plantillas, calendario y resultados. */
export function assertTournamentWritable(tournamentId: ID): ID {
  const userId = assertTournamentOwner(tournamentId)
  if (getDb().tournaments.find((t) => t.id === tournamentId)?.status === 'finished') {
    throw new MockHttpError(409, 'El torneo está finalizado: su información deportiva es de solo lectura')
  }
  return userId
}

/** Como el backend: en DRAFT se programa, pero no se juega (LIVE, resultados, estadísticas). */
export function assertTournamentStarted(tournamentId: ID) {
  if (getDb().tournaments.find((t) => t.id === tournamentId)?.status === 'draft') {
    throw new MockHttpError(409, 'El torneo no ha iniciado: inícialo antes de poner partidos en juego o capturar resultados')
  }
}

export function assertMatchOwner(matchId: ID): ID {
  const match = getDb().matches.find((m) => m.id === matchId)
  if (!match) throw new MockNotFoundError('Partido', matchId)
  return assertTournamentWritable(match.tournamentId)
}

export function assertTeamCustodian(teamId: ID): ID {
  const userId = requireMockUser()
  const team = getDb().teams.find((t) => t.id === teamId)
  if (!team) throw new MockNotFoundError('Equipo', teamId)
  if (team.createdBy !== userId) throw new MockHttpError(403, 'Solo quien registró este equipo puede modificarlo')
  return userId
}

export function assertPlayerCustodian(playerId: ID): ID {
  const userId = requireMockUser()
  const player = getDb().players.find((p) => p.id === playerId)
  if (!player) throw new MockNotFoundError('Jugador', playerId)
  if (player.createdBy !== userId) throw new MockHttpError(403, 'Solo quien registró este jugador puede modificarlo')
  return userId
}

/** Ejecuta la comprobación y devuelve una promesa rechazada si falla (API de los services). */
export function guard<T>(check: () => unknown, action: () => Promise<T>): Promise<T> {
  try {
    check()
  } catch (error) {
    return Promise.reject(error)
  }
  return action()
}
