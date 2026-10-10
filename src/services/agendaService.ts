import type { AgendaOptions, AgendaPage, AgendaQuery, AgendaTournament } from '@/types'
import { api, USE_MOCKS } from './api'
import { fromMatchStatus, T_STATUS_IN, toMatch, type ApiMatch } from './mappers'
import { MockHttpError } from '@/mocks/session'

/** Agenda global (2C-3): el servidor decide qué torneos y partidos puedo ver y filtra todo. */
export interface AgendaService {
  list(query: AgendaQuery): Promise<AgendaPage>
  options(includeFinished: boolean): Promise<AgendaOptions>
}

type ApiAgendaTournament = Omit<AgendaTournament, 'status'> & { status: keyof typeof T_STATUS_IN }
type ApiItem = ApiMatch & { tournament: { id: string; name: string; status: keyof typeof T_STATUS_IN }; homeTeam: { name: string } | null; awayTeam: { name: string } | null; roundName: string | null }
const toTournament = (t: ApiAgendaTournament): AgendaTournament => ({ ...t, status: T_STATUS_IN[t.status] })

const http: AgendaService = {
  async list(query) {
    const { status, ...rest } = query
    const params = { ...rest, ...(status?.length ? { status: status.map(fromMatchStatus).join(',') } : {}) }
    const { data } = await api.get<{ data: ApiItem[]; meta: AgendaPage['meta']; tournaments: ApiAgendaTournament[] }>('/agenda', { params })
    return {
      items: data.data.map(({ tournament, homeTeam, awayTeam, roundName, ...m }) => ({
        match: toMatch(m as ApiMatch),
        tournament: { ...tournament, status: T_STATUS_IN[tournament.status] },
        homeTeam: homeTeam?.name ?? null,
        awayTeam: awayTeam?.name ?? null,
        roundName,
      })),
      meta: data.meta,
      tournaments: data.tournaments.map(toTournament),
    }
  },
  async options(includeFinished) {
    const { data } = await api.get<Omit<AgendaOptions, 'tournaments'> & { tournaments: ApiAgendaTournament[] }>('/agenda/options', { params: includeFinished ? { includeFinished: true } : {} })
    return { ...data, tournaments: data.tournaments.map(toTournament) }
  },
}

export const AGENDA_REQUIRES_SERVER = 'La agenda requiere el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, AGENDA_REQUIRES_SERVER))
export const agendaService: AgendaService = USE_MOCKS ? { list: unsupported, options: unsupported } : http
