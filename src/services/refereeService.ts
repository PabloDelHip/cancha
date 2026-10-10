import type { FieldAvailability, ID, MatchReferees, Referee, RefereeContact, RefereeHistoryEntry, RefereeOption, RefereeRole } from '@/types'
import { api, USE_MOCKS } from './api'
import { toRefereeAssignment, type ApiRefereeAssignment } from './mappers'
import { MockHttpError } from '@/mocks/session'

/** Árbitros del organizador (/referees) y asignaciones a partidos (/matches/:id/referees). */
export interface RefereeInput {
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  availability: FieldAvailability
}
export interface RefereeService {
  list(): Promise<Referee[]>
  /** Árbitros del propietario con contacto (ADMIN/COORDINATOR del torneo). */
  contacts(tournamentId: ID): Promise<RefereeContact[]>
  create(input: RefereeInput): Promise<Referee>
  update(id: ID, input: Partial<RefereeInput & { active: boolean }>): Promise<Referee>
  remove(id: ID): Promise<{ archived: boolean }>
  history(id: ID): Promise<RefereeHistoryEntry[]>
  ofMatch(matchId: ID): Promise<MatchReferees>
  options(matchId: ID): Promise<RefereeOption[]>
  assign(matchId: ID, refereeId: ID, role: RefereeRole): Promise<MatchReferees>
  unassign(matchId: ID, assignmentId: ID): Promise<MatchReferees>
  absence(matchId: ID, assignmentId: ID, input: { substituteId: ID | null; note: string | null }): Promise<MatchReferees>
}

type ApiMatchReferees = Omit<MatchReferees, 'referees'> & { referees: ApiRefereeAssignment[] }
const toMatchReferees = (r: ApiMatchReferees): MatchReferees => ({ ...r, referees: r.referees.map(toRefereeAssignment) })

const http: RefereeService = {
  async list() {
    return (await api.get<Referee[]>('/referees')).data
  },
  async contacts(tournamentId) {
    return (await api.get<RefereeContact[]>(`/tournaments/${tournamentId}/referees`)).data
  },
  async create(input) {
    return (await api.post<Referee>('/referees', input)).data
  },
  async update(id, input) {
    return (await api.patch<Referee>(`/referees/${id}`, input)).data
  },
  async remove(id) {
    return (await api.delete<{ archived: boolean }>(`/referees/${id}`)).data
  },
  async history(id) {
    const { data } = await api.get<RefereeHistoryEntry[]>(`/referees/${id}/matches`)
    return data.map((e) => ({
      ...e,
      role: e.role.toLowerCase() as RefereeRole,
      status: e.status.toLowerCase() as RefereeHistoryEntry['status'],
      match: { ...e.match, status: e.match.status.toLowerCase() as RefereeHistoryEntry['match']['status'] },
    }))
  },
  async ofMatch(matchId) {
    return toMatchReferees((await api.get<ApiMatchReferees>(`/matches/${matchId}/referees`)).data)
  },
  async options(matchId) {
    return (await api.get<RefereeOption[]>(`/matches/${matchId}/referee-options`)).data
  },
  async assign(matchId, refereeId, role) {
    return toMatchReferees((await api.post<ApiMatchReferees>(`/matches/${matchId}/referees`, { refereeId, role: role.toUpperCase() })).data)
  },
  async unassign(matchId, assignmentId) {
    return toMatchReferees((await api.delete<ApiMatchReferees>(`/matches/${matchId}/referees/${assignmentId}`)).data)
  },
  async absence(matchId, assignmentId, input) {
    return toMatchReferees((await api.post<ApiMatchReferees>(`/matches/${matchId}/referees/${assignmentId}/absence`, input)).data)
  },
}

export const REFEREES_REQUIRE_SERVER = 'Los árbitros requieren el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, REFEREES_REQUIRE_SERVER))
const mock: RefereeService = {
  list: unsupported,
  contacts: unsupported,
  create: unsupported,
  update: unsupported,
  remove: unsupported,
  history: unsupported,
  ofMatch: unsupported,
  options: unsupported,
  assign: unsupported,
  unassign: unsupported,
  absence: unsupported,
}

export const refereeService: RefereeService = USE_MOCKS ? mock : http
