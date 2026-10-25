import type { ID, Player, Team, TournamentIdentity } from '@/types'

/**
 * 10C — nombres con que se jugó (puras; las usa el store historicalNames y test/history-10c).
 * Solo cambian nombre, abreviatura, escudo y colores (equipos) o el nombre deportivo (jugadores).
 */
export function teamAsPlayed(live: Team | undefined, identity: TournamentIdentity | null | undefined, teamId: ID | null | undefined): Team | undefined {
  const h = identity?.teams.find((t) => t.id === teamId)
  return live && h ? { ...live, name: h.name, shortName: h.shortName, logoUrl: h.logoUrl, colors: { ...h.colors } } : live
}
export function playerAsPlayed(live: Player | undefined, identity: TournamentIdentity | null | undefined, playerId: ID | null | undefined): Player | undefined {
  const h = identity?.players.find((p) => p.id === playerId)
  return live && h ? { ...live, firstName: h.firstName, lastName: h.lastName, nickname: h.nickname } : live
}
