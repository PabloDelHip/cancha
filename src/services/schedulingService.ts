import type { ID, SchedulingCheck, SchedulingConflicts, SchedulingOverview, SchedulingRules, TeamSchedulingRules } from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/**
 * Restricciones de calendario del torneo (6A): /tournaments/:id/scheduling*. El servidor las aplica
 * al programar, reprogramar y generar; aquí se configuran y se revisan antes de guardar.
 */
export type SchedulingRulesInput = Partial<SchedulingRules> & { durationMinutes?: number | null }

export interface SchedulingService {
  overview(tournamentId: ID): Promise<SchedulingOverview>
  update(tournamentId: ID, input: SchedulingRulesInput): Promise<SchedulingOverview>
  updateTeam(tournamentId: ID, teamId: ID, rules: TeamSchedulingRules): Promise<SchedulingOverview>
  preview(tournamentId: ID, input: { tournament?: SchedulingRulesInput; team?: { teamId: ID; rules: TeamSchedulingRules } }): Promise<{ conflicts: SchedulingConflicts }>
  check(tournamentId: ID, input: { matchId?: ID; homeTeamId: ID; awayTeamId: ID; date: string; time: string; fieldId?: ID | null }): Promise<SchedulingCheck>
}

const base = (id: ID) => `/tournaments/${id}/scheduling`

const http: SchedulingService = {
  async overview(id) {
    return (await api.get<SchedulingOverview>(base(id))).data
  },
  async update(id, input) {
    return (await api.put<SchedulingOverview>(base(id), input)).data
  },
  async updateTeam(id, teamId, rules) {
    return (await api.put<SchedulingOverview>(`${base(id)}/teams/${teamId}`, rules)).data
  },
  async preview(id, input) {
    return (await api.post<{ conflicts: SchedulingConflicts }>(`${base(id)}/preview`, input)).data
  },
  async check(id, input) {
    return (await api.post<SchedulingCheck>(`${base(id)}/check`, input)).data
  },
}

export const SCHEDULING_REQUIRES_SERVER = 'Las restricciones de calendario requieren el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, SCHEDULING_REQUIRES_SERVER))
const mock: SchedulingService = { overview: unsupported, update: unsupported, updateTeam: unsupported, preview: unsupported, check: unsupported }

export const schedulingService: SchedulingService = USE_MOCKS ? mock : http
