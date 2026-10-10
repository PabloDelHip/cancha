import type { ID, IncidentType, MatchIncidents } from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/** Incidencias de un partido (2C-2): solo dentro del torneo, nunca públicas. */
export interface IncidentService {
  list(matchId: ID): Promise<MatchIncidents>
  report(matchId: ID, input: { type: IncidentType; description: string; occurredAt?: string }): Promise<MatchIncidents>
  resolve(matchId: ID, incidentId: ID, note: string): Promise<MatchIncidents>
  void(matchId: ID, incidentId: ID, reason: string): Promise<MatchIncidents>
}

const http: IncidentService = {
  async list(matchId) {
    return (await api.get<MatchIncidents>(`/matches/${matchId}/incidents`)).data
  },
  async report(matchId, input) {
    return (await api.post<MatchIncidents>(`/matches/${matchId}/incidents`, input)).data
  },
  async resolve(matchId, incidentId, note) {
    return (await api.post<MatchIncidents>(`/matches/${matchId}/incidents/${incidentId}/resolve`, { note })).data
  },
  async void(matchId, incidentId, reason) {
    return (await api.post<MatchIncidents>(`/matches/${matchId}/incidents/${incidentId}/void`, { reason })).data
  },
}

export const INCIDENTS_REQUIRE_SERVER = 'Las incidencias requieren el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, INCIDENTS_REQUIRE_SERVER))
export const incidentService: IncidentService = USE_MOCKS ? { list: unsupported, report: unsupported, resolve: unsupported, void: unsupported } : http
