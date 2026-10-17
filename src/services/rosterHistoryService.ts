import type { ID, RosterHistoryFilter, RosterHistoryPage } from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/** 3E — historial de plantillas del torneo (solo propietario y administradores). */
export interface RosterHistoryService {
  list(tournamentId: ID, filter?: RosterHistoryFilter): Promise<RosterHistoryPage>
}

const http: RosterHistoryService = {
  async list(tournamentId, filter = {}) {
    const params = { ...filter, action: filter.action?.length ? filter.action.join(',') : undefined }
    return (await api.get<RosterHistoryPage>(`/tournaments/${tournamentId}/roster-history`, { params })).data
  },
}

export const ROSTER_HISTORY_REQUIRES_SERVER = 'El historial de plantillas requiere el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, ROSTER_HISTORY_REQUIRES_SERVER))
export const rosterHistoryService: RosterHistoryService = USE_MOCKS ? { list: unsupported } : http
