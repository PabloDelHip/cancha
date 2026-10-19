import type {
  EnrollmentChargesResult,
  FinanceAccounts,
  FinanceEntriesFilter,
  FinanceEntriesPage,
  FinanceEntryInput,
  FinanceEntryResult,
  FinanceReplacementInput,
  FinanceRewriteResult,
  FinanceStatement,
  ID,
  ISODate,
  TeamFinanceStatement,
  TeamFinanceStatements,
} from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/** Módulo 4 — finanzas del torneo (organizador) y estado de cuenta del equipo (solo lectura). */
export interface FinanceService {
  accounts(tournamentId: ID): Promise<FinanceAccounts>
  /** Sin `page`: la última página (lo más reciente). */
  statement(tournamentId: ID, teamId: ID, page?: number, limit?: number): Promise<FinanceStatement>
  record(tournamentId: ID, input: FinanceEntryInput): Promise<FinanceEntryResult>
  generateEnrollmentCharges(tournamentId: ID, date?: ISODate): Promise<EnrollmentChargesResult>
  voidEntry(tournamentId: ID, entryId: ID, input: { requestId: string; reason: string; allowCredit?: boolean }): Promise<FinanceRewriteResult>
  correct(tournamentId: ID, entryId: ID, input: { requestId: string; reason: string; allowCredit?: boolean; entry: FinanceReplacementInput }): Promise<FinanceRewriteResult>
  entries(tournamentId: ID, filter: FinanceEntriesFilter): Promise<FinanceEntriesPage>
  /** Descarga un CSV (movimientos con filtros, o saldos). */
  downloadCsv(tournamentId: ID, which: 'entries' | 'balances', filter?: FinanceEntriesFilter): Promise<void>
  finePlayers(tournamentId: ID, teamId: ID): Promise<{ players: { id: ID; name: string; current: boolean }[] }>
  teamStatements(teamId: ID): Promise<TeamFinanceStatements>
  teamStatement(teamId: ID, tournamentId: ID, page?: number, limit?: number): Promise<TeamFinanceStatement>
}

const http: FinanceService = {
  async accounts(tournamentId) {
    return (await api.get<FinanceAccounts>(`/tournaments/${tournamentId}/finance/accounts`)).data
  },
  async statement(tournamentId, teamId, page, limit) {
    return (await api.get<FinanceStatement>(`/tournaments/${tournamentId}/finance/accounts/${teamId}`, { params: { page, limit } })).data
  },
  async record(tournamentId, input) {
    return (await api.post<FinanceEntryResult>(`/tournaments/${tournamentId}/finance/entries`, input)).data
  },
  async generateEnrollmentCharges(tournamentId, date) {
    return (await api.post<EnrollmentChargesResult>(`/tournaments/${tournamentId}/finance/enrollment-charges`, date ? { date } : {})).data
  },
  async voidEntry(tournamentId, entryId, input) {
    return (await api.post<FinanceRewriteResult>(`/tournaments/${tournamentId}/finance/entries/${entryId}/void`, input)).data
  },
  async correct(tournamentId, entryId, input) {
    return (await api.post<FinanceRewriteResult>(`/tournaments/${tournamentId}/finance/entries/${entryId}/correct`, input)).data
  },
  async entries(tournamentId, filter) {
    return (await api.get<FinanceEntriesPage>(`/tournaments/${tournamentId}/finance/entries`, { params: filter })).data
  },
  async downloadCsv(tournamentId, which, filter = {}) {
    const res = await api.get<Blob>(`/tournaments/${tournamentId}/finance/export/${which}.csv`, { params: which === 'entries' ? { ...filter, page: undefined, limit: undefined } : {}, responseType: 'blob' })
    const name = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? `${which}.csv`
    const url = URL.createObjectURL(res.data)
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  },
  async finePlayers(tournamentId, teamId) {
    return (await api.get<{ players: { id: ID; name: string; current: boolean }[] }>(`/tournaments/${tournamentId}/finance/accounts/${teamId}/fine-players`)).data
  },
  async teamStatements(teamId) {
    return (await api.get<TeamFinanceStatements>(`/teams/${teamId}/finance`)).data
  },
  async teamStatement(teamId, tournamentId, page, limit) {
    return (await api.get<TeamFinanceStatement>(`/teams/${teamId}/finance/${tournamentId}`, { params: { page, limit } })).data
  },
}

export const FINANCE_REQUIRES_SERVER = 'Las finanzas requieren el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, FINANCE_REQUIRES_SERVER))
export const financeService: FinanceService = USE_MOCKS
  ? Object.fromEntries((Object.keys(http) as (keyof FinanceService)[]).map((k) => [k, unsupported])) as unknown as FinanceService
  : http
