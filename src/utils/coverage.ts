import type { Match, Tournament } from '@/types'

/**
 * Presentación pública de un torneo con seguimiento parcial (6G): solo cuentan los partidos donde
 * juega al menos un equipo seguido. Los demás existen (el admin los ve y gestiona) pero no forman
 * parte del seguimiento público. En FULL (o sin torneo) todo es visible.
 */
export function isPubliclyTracked(match: Pick<Match, 'homeTeamId' | 'awayTeamId'>, tournament: Pick<Tournament, 'dataCoverage' | 'trackedTeamIds'> | undefined): boolean {
  if (!tournament || tournament.dataCoverage !== 'partial') return true
  return tournament.trackedTeamIds.includes(match.homeTeamId) || tournament.trackedTeamIds.includes(match.awayTeamId)
}
