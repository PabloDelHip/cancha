import type { ID, League, LeagueDetail, LeagueHistory, LeagueInput, LeagueSummary } from '@/types'
import { api, USE_MOCKS } from './api'
import { MODALITY_IN, SYSTEM_IN_PUBLIC, T_STATUS_IN, toPlayer, type ApiPlayer } from './mappers'
import { MockHttpError } from '@/mocks/session'

/**
 * Ligas (agrupan torneos y su histórico). Solo contratos reales del backend:
 * GET /leagues · GET /leagues/:id · GET /leagues/:id/history · GET /admin/leagues ·
 * POST/PATCH/DELETE /leagues.
 */
export interface LeagueService {
  list(): Promise<LeagueSummary[]>
  mine(): Promise<LeagueSummary[]>
  get(id: ID): Promise<LeagueDetail>
  history(id: ID): Promise<LeagueHistory>
  create(input: LeagueInput): Promise<League>
  update(id: ID, input: Partial<LeagueInput>): Promise<League>
  remove(id: ID): Promise<void>
}

type ApiLeagueTournament = { id: string; name: string; status: 'DRAFT' | 'ACTIVE' | 'FINISHED'; category: string; format: 'FOOTBALL_7' | 'FOOTBALL_11'; startDate: string; endDate: string | null; system: string }
type WithPlayer<T> = Omit<T, 'player'> & { player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'> }
type ApiHistory = Omit<LeagueHistory, 'champions' | 'players' | 'keepers'> & {
  champions: (Omit<LeagueHistory['champions'][number], 'decidedBy' | 'topScorer'> & { decidedBy: 'LEAGUE_TABLE' | 'FINAL'; topScorer: WithPlayer<{ player: unknown; goals: number }> | null })[]
  players: WithPlayer<LeagueHistory['players'][number]>[]
  keepers: WithPlayer<LeagueHistory['keepers'][number]>[]
}

const player = (p: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>) => toPlayer({ ...p, createdAt: '', updatedAt: '' } as ApiPlayer)

const http: LeagueService = {
  async list() {
    return (await api.get<LeagueSummary[]>('/leagues')).data
  },
  async mine() {
    return (await api.get<LeagueSummary[]>('/admin/leagues')).data
  },
  async get(id) {
    const { data } = await api.get<League & { tournaments: ApiLeagueTournament[] }>(`/leagues/${id}`)
    return {
      ...data,
      tournaments: data.tournaments.map((t) => ({
        ...t,
        status: T_STATUS_IN[t.status],
        modality: MODALITY_IN[t.format],
        system: SYSTEM_IN_PUBLIC(t.system),
      })),
    }
  },
  async history(id) {
    const { data } = await api.get<ApiHistory>(`/leagues/${id}/history`)
    return {
      ...data,
      champions: data.champions.map((c) => ({
        ...c,
        decidedBy: c.decidedBy === 'FINAL' ? 'final' : 'league_table',
        topScorer: c.topScorer ? { goals: c.topScorer.goals, player: player(c.topScorer.player) } : null,
      })),
      players: data.players.map((p) => ({ ...p, player: player(p.player) })),
      keepers: data.keepers.map((p) => ({ ...p, player: player(p.player) })),
    }
  },
  async create(input) {
    return (await api.post<League>('/leagues', input)).data
  },
  async update(id, input) {
    return (await api.patch<League>(`/leagues/${id}`, input)).data
  },
  async remove(id) {
    await api.delete(`/leagues/${id}`)
  },
}

/** Modo demo: las ligas requieren el servidor (histórico calculado en el backend). */
const unsupported = () => Promise.reject(new MockHttpError(501, 'Las ligas requieren el servidor (modo demo sin backend)'))
const mock: LeagueService = {
  list: () => Promise.resolve([]),
  mine: () => Promise.resolve([]),
  get: unsupported,
  history: unsupported,
  create: unsupported,
  update: unsupported,
  remove: unsupported,
}

export const leagueService: LeagueService = USE_MOCKS ? mock : http
