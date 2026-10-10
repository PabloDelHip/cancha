import type { ID, MatchLog } from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/** Historial de partidos (solo el organizador): por partido y por torneo. */
export interface MatchLogService {
  ofMatch(matchId: ID): Promise<MatchLog>
  ofTournament(tournamentId: ID, options?: { deleted?: boolean }): Promise<MatchLog>
}

const http: MatchLogService = {
  async ofMatch(matchId) {
    return (await api.get<MatchLog>(`/matches/${matchId}/log`)).data
  },
  async ofTournament(tournamentId, options = {}) {
    return (await api.get<MatchLog>(`/tournaments/${tournamentId}/match-log`, { params: options.deleted ? { deleted: true } : {} })).data
  },
}

export const MATCH_LOG_REQUIRES_SERVER = 'El historial de partidos requiere el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, MATCH_LOG_REQUIRES_SERVER))
export const matchLogService: MatchLogService = USE_MOCKS ? { ofMatch: unsupported, ofTournament: unsupported } : http
