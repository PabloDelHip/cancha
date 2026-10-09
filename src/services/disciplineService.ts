import type { DisciplineLogEntry, DisciplineOverview, DisciplineRules, ID, MatchEligibility, MatchStatus } from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/**
 * Control disciplinario del torneo (solo el organizador): /tournaments/:id/discipline* y
 * /matches/:id/eligibility. El servidor calcula las sanciones; la UI solo las representa.
 */
export interface DisciplineService {
  overview(tournamentId: ID): Promise<DisciplineOverview>
  history(tournamentId: ID, filter?: { ref?: string; playerId?: ID }): Promise<DisciplineLogEntry[]>
  updateRules(tournamentId: ID, rules: Partial<DisciplineRules> & { justification?: string }): Promise<DisciplineOverview>
  create(tournamentId: ID, input: { playerId: ID; teamId: ID; matchId: ID; matches: number; reason: string }): Promise<DisciplineOverview>
  update(tournamentId: ID, ref: string, input: { matches?: number | null; reason?: string; matchId?: ID; justification: string }): Promise<DisciplineOverview>
  annul(tournamentId: ID, ref: string, justification: string): Promise<DisciplineOverview>
  restore(tournamentId: ID, ref: string, justification: string): Promise<DisciplineOverview>
  eligibility(matchId: ID): Promise<MatchEligibility>
}

// El API envía los enums en mayúsculas; la UI los usa en minúsculas (como el resto de mappers).
const lower = <T extends string>(v: T) => v.toLowerCase() as T

function toOverview(o: DisciplineOverview): DisciplineOverview {
  return {
    ...o,
    rules: { ...o.rules, eligibility: lower(o.rules.eligibility) },
    sanctions: o.sanctions.map((s) => ({ ...s, kind: lower(s.kind), cause: lower(s.cause), status: lower(s.status) })),
    orphans: o.orphans.map((s) => ({ ...s, cause: lower(s.cause) })),
    refs: { ...o.refs, matches: Object.fromEntries(Object.entries(o.refs.matches).map(([id, m]) => [id, { ...m, status: lower<MatchStatus>(m.status) }])) },
  }
}

const base = (id: ID) => `/tournaments/${id}/discipline`
const sanction = (id: ID, ref: string) => `${base(id)}/sanctions/${encodeURIComponent(ref)}`

const http: DisciplineService = {
  async overview(id) {
    return toOverview((await api.get<DisciplineOverview>(base(id))).data)
  },
  async history(id, filter = {}) {
    const { data } = await api.get<DisciplineLogEntry[]>(`${base(id)}/history`, { params: filter })
    return data.map((e) => ({ ...e, action: lower(e.action) }))
  },
  async updateRules(id, rules) {
    const body = { ...rules, ...(rules.eligibility ? { eligibility: rules.eligibility.toUpperCase() } : {}) }
    return toOverview((await api.put<DisciplineOverview>(`${base(id)}/rules`, body)).data)
  },
  async create(id, input) {
    return toOverview((await api.post<DisciplineOverview>(`${base(id)}/sanctions`, input)).data)
  },
  async update(id, ref, input) {
    return toOverview((await api.patch<DisciplineOverview>(sanction(id, ref), input)).data)
  },
  async annul(id, ref, justification) {
    return toOverview((await api.post<DisciplineOverview>(`${sanction(id, ref)}/annul`, { justification })).data)
  },
  async restore(id, ref, justification) {
    return toOverview((await api.post<DisciplineOverview>(`${sanction(id, ref)}/restore`, { justification })).data)
  },
  async eligibility(matchId) {
    const { data } = await api.get<MatchEligibility>(`/matches/${matchId}/eligibility`)
    return { ...data, mode: lower(data.mode), suspended: data.suspended.map((s) => ({ ...s, cause: lower(s.cause) })) }
  },
}

export const DISCIPLINE_REQUIRES_SERVER = 'El control disciplinario requiere el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, DISCIPLINE_REQUIRES_SERVER))
const mock: DisciplineService = {
  overview: unsupported,
  history: unsupported,
  updateRules: unsupported,
  create: unsupported,
  update: unsupported,
  annul: unsupported,
  restore: unsupported,
  eligibility: unsupported,
}

export const disciplineService: DisciplineService = USE_MOCKS ? mock : http
