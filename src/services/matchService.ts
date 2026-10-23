import type { ID, Match, MatchInput, MatchResultInput, PlayerMatchStats, ReschedulePreview, RescheduleAction, RescheduleProposal, RescheduleSearch, RescheduleSelection, Round, ScheduleAssignment, ScheduleProposal, SmartScheduleOptions } from '@/types'
import { api, fetchAll, USE_MOCKS } from './api'
import { fromMatchInput, fromMatchStatus, toMatch, toPlayerMatchStats, toRound, type ApiMatch, type ApiPlayerMatchStats, type ApiRound } from './mappers'
import { generateRoundRobin, planMatches, type ScheduleOptions } from '@/utils/schedule'
import { delay, getDb, MockNotFoundError, mutate, now, plain } from '@/mocks/db'
import { createId } from '@/utils/id'
import { assertMatchOwner, assertTournamentStarted, assertTournamentWritable, guard } from '@/mocks/ownership'
import { MockHttpError } from '@/mocks/session'

export interface MatchService {
  list(): Promise<Match[]>
  get(id: ID): Promise<Match>
  create(input: MatchInput): Promise<Match>
  update(id: ID, input: Partial<MatchInput>): Promise<Match>
  /** Qué cancha y árbitros se conservan o se liberan si el partido pasa a ese horario (2C-2). */
  reschedulePreview(id: ID, input: Pick<MatchInput, 'date' | 'time' | 'fieldId' | 'status'>): Promise<ReschedulePreview>
  /** Estadísticas individuales (todas o de un partido). */
  listStats(matchId?: ID): Promise<PlayerMatchStats[]>
  /** Captura marcador + estadísticas. Reemplaza las estadísticas previas del partido. */
  saveResult(id: ID, result: MatchResultInput): Promise<{ match: Match; stats: PlayerMatchStats[] }>
  /** Elimina un partido sin resultado ni estadísticas (p. ej. mal programado). */
  remove(id: ID): Promise<void>
  /**
   * Genera el calendario de liga en el servidor (jornadas + partidos, en una transacción).
   * 409 si hay partidos jugados/en juego, o partidos programados sin `replaceExisting`.
   */
  /** `warnings`: preferencias de calendario incumplidas (6A); las obligatorias rechazan con 409 SCHEDULE_CONSTRAINTS. */
  generateSchedule(tournamentId: ID, options: GenerateScheduleInput): Promise<{ rounds: Round[]; matches: Match[]; warnings?: string[] }>
  /** 6B: propuesta (fecha, hora y cancha de cada partido) sin guardar nada. */
  proposeSchedule(tournamentId: ID, options: GenerateScheduleInput): Promise<ScheduleProposal>
  /** 6C: reprogramación parcial — propuesta (sin escrituras) y confirmación (todo o nada). */
  rescheduleProposal(tournamentId: ID, selection: RescheduleSelection, search: RescheduleSearch): Promise<RescheduleProposal>
  confirmReschedule(tournamentId: ID, input: { reason?: string; allowPending?: number; items: { matchId: ID; version: string; action: RescheduleAction; date?: string; time?: string; fieldId?: ID | null }[] }): Promise<{ moved: number; kept: number; pending: number; matches: Match[]; warnings: string[] }>
}

export type GenerateScheduleInput = ScheduleOptions & {
  replaceExisting: boolean
  /** Confirma liberar las canchas de los partidos que se reemplazan. */
  releaseAssignments?: boolean
  /** Eliminación directa: orden de cabezas de serie. */
  seeding?: ID[]
  /** Armar a mano: solo la estructura (grupos o cuadro vacío), sin partidos. */
  manual?: boolean
  /** Eliminación directa a mano: equipos de la primera ronda. */
  bracketSize?: number
  /** 6B: confirma una propuesta (el servidor revalida todo). */
  assignments?: ScheduleAssignment[]
} & SmartScheduleOptions & {
  /** Grupos elegidos por el organizador. */
  groups?: ID[][]
}

const http: MatchService = {
  async list() {
    return (await fetchAll<ApiMatch>('/matches')).map(toMatch)
  },
  async get(id) {
    return toMatch((await api.get<ApiMatch>(`/matches/${id}`)).data)
  },
  async create(input) {
    return toMatch((await api.post<ApiMatch>('/matches', fromMatchInput(input))).data)
  },
  async update(id, input) {
    return toMatch((await api.patch<ApiMatch>(`/matches/${id}`, fromMatchInput(input))).data)
  },
  async reschedulePreview(id, input) {
    return (await api.post<ReschedulePreview>(`/matches/${id}/reschedule-preview`, { date: input.date, time: input.time, fieldId: input.fieldId ?? null, status: fromMatchStatus(input.status) })).data
  },
  async listStats(matchId) {
    const rows = matchId
      ? (await api.get<ApiPlayerMatchStats[]>(`/matches/${matchId}/stats`)).data
      : await fetchAll<ApiPlayerMatchStats>('/player-match-stats')
    return toPlayerMatchStats(rows)
  },
  async saveResult(id, result) {
    const { data } = await api.put<{ match: ApiMatch; playerStats: ApiPlayerMatchStats[] }>(`/matches/${id}/result`, {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      status: fromMatchStatus(result.status),
      penalties: result.penalties ?? null,
      extraTime: result.extraTime ?? false,
      // sendOff omitido = fila sin clasificar (capturas anteriores que el organizador no tocó).
      playerStats: result.stats.map(({ sendOff, ...s }) => ({ ...s, played: true, ...(sendOff !== undefined ? { sendOff: sendOff?.toUpperCase() ?? null } : {}) })),
      ...(result.sameDateReason ? { sameDateReason: result.sameDateReason } : {}),
    })
    return { match: toMatch(data.match), stats: toPlayerMatchStats(data.playerStats) }
  },
  async remove(id) {
    await api.delete(`/matches/${id}`)
  },
  async generateSchedule(tournamentId, options) {
    const { data } = await api.post<{ rounds: ApiRound[]; matches: ApiMatch[]; warnings?: string[] }>(`/tournaments/${tournamentId}/schedule`, options)
    return { rounds: data.rounds.map(toRound), matches: data.matches.map(toMatch), warnings: data.warnings ?? [] }
  },
  async proposeSchedule(tournamentId, options) {
    return (await api.post<ScheduleProposal>(`/tournaments/${tournamentId}/schedule/proposal`, options)).data
  },
  async rescheduleProposal(tournamentId, selection, search) {
    return (await api.post<RescheduleProposal>(`/tournaments/${tournamentId}/reschedule/proposal`, { selection, search })).data
  },
  async confirmReschedule(tournamentId, input) {
    const { data } = await api.post<{ moved: number; kept: number; pending: number; matches: ApiMatch[]; warnings: string[] }>(`/tournaments/${tournamentId}/reschedule`, input)
    return { ...data, matches: data.matches.map(toMatch) }
  },
}

/** La búsqueda de horarios corre en el servidor: en modo demo se usa el generador de siempre. */
export const PROPOSAL_REQUIRES_SERVER = 'La propuesta de calendario requiere el servidor (modo demo sin backend)'

const mock: MatchService = {
  proposeSchedule: () => Promise.reject(new MockHttpError(501, PROPOSAL_REQUIRES_SERVER)),
  rescheduleProposal: () => Promise.reject(new MockHttpError(501, PROPOSAL_REQUIRES_SERVER)),
  confirmReschedule: () => Promise.reject(new MockHttpError(501, PROPOSAL_REQUIRES_SERVER)),
  list: () => delay(getDb().matches),
  get(id) {
    const found = getDb().matches.find((m) => m.id === id)
    return found ? delay(found) : Promise.reject(new MockNotFoundError('Partido', id))
  },
  create(input) {
    const check = () => {
      assertTournamentWritable(input.tournamentId)
      if (input.status === 'live') assertTournamentStarted(input.tournamentId)
      if (input.status !== 'cancelled') assertRoundAvailable(input)
    }
    return guard(check, () => mutate((db) => {
      ensureRound(input.tournamentId, input.round)
      const created: Match = {
        ...plain(input),
        id: createId('m'),
        homeScore: null,
        awayScore: null,
        createdAt: now(),
        updatedAt: now(),
      }
      db.matches.push(created)
      return delay(created)
    }))
  },
  update(id, input) {
    const check = () => {
      assertMatchOwner(id)
      if (input.tournamentId) assertTournamentWritable(input.tournamentId)
      const current = getDb().matches.find((m) => m.id === id)!
      const next = { ...current, ...input }
      const inPlay = next.status === 'live' || next.status === 'finished'
      if (inPlay && (next.status !== current.status || next.tournamentId !== current.tournamentId)) {
        assertTournamentStarted(next.tournamentId)
      }
      // Mismas reglas que el backend: un partido con resultado no se pospone/cancela/reprograma.
      const hasResult = current.homeScore !== null || getDb().playerMatchStats.some((st) => st.matchId === id)
      if (input.status && input.status !== current.status && !['live', 'finished'].includes(input.status) && hasResult) {
        throw new MockHttpError(409, `El partido ya tiene resultado: no puede pasar a ${input.status}`)
      }
      if (next.status !== 'cancelled') assertRoundAvailable(next, id)
    }
    return guard(check, () => mutate((db) => {
      const match = db.matches.find((m) => m.id === id)
      if (!match) return Promise.reject(new MockNotFoundError('Partido', id))
      if (input.round) ensureRound(input.tournamentId ?? match.tournamentId, input.round)
      Object.assign(match, plain(input), { updatedAt: now() })
      return delay(match)
    }))
  },
  // Modo demo: sin canchas ni árbitros, no hay nada que liberar.
  reschedulePreview(_id, input) {
    return delay({ date: input.date, time: input.time, reserves: true, field: null, referees: [], release: { field: false, assignmentIds: [] }, needsConfirmation: false })
  },
  listStats(matchId) {
    const all = getDb().playerMatchStats
    return delay(matchId ? all.filter((s) => s.matchId === matchId) : all)
  },
  saveResult(id, result) {
    const check = () => {
      assertMatchOwner(id)
      assertTournamentStarted(getDb().matches.find((m) => m.id === id)!.tournamentId)
    }
    return guard(check, () => mutate((db) => {
      const match = db.matches.find((m) => m.id === id)
      if (!match) return Promise.reject(new MockNotFoundError('Partido', id))
      Object.assign(match, {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        status: result.status,
        penalties: result.penalties ?? null,
        updatedAt: now(),
      })
      const stats: PlayerMatchStats[] = plain(result.stats).map((s) => ({ ...s, id: createId('pms'), matchId: id }))
      db.playerMatchStats = [...db.playerMatchStats.filter((s) => s.matchId !== id), ...stats]
      return delay({ match, stats })
    }))
  },
  remove(id) {
    const check = () => {
      assertMatchOwner(id)
      assertRemovable(id)
    }
    return guard(check, () => {
      mutate((db) => {
        db.matches = db.matches.filter((m) => m.id !== id)
      })
      return delay(undefined)
    })
  },
  generateSchedule(tournamentId, options) {
    const check = () => {
      assertTournamentWritable(tournamentId)
      const db = getDb()
      const teams = db.tournamentTeams.filter((tt) => tt.tournamentId === tournamentId)
      if (teams.length < 2) throw new MockHttpError(400, 'Se necesitan al menos 2 equipos inscritos')
      const existing = db.matches.filter((m) => m.tournamentId === tournamentId)
      const history = existing.some(
        (m) => m.status === 'finished' || m.status === 'live' || m.homeScore !== null || db.playerMatchStats.some((st) => st.matchId === m.id),
      )
      if (history) throw new MockHttpError(409, 'El torneo ya tiene partidos jugados o en juego: su calendario no se puede regenerar')
      if (existing.length && !options.replaceExisting) {
        throw new MockHttpError(409, `El torneo ya tiene ${existing.length} partidos programados. Confirma el reemplazo`)
      }
    }
    return guard(check, () =>
      mutate((db) => {
        const name = (id: ID) => db.teams.find((t) => t.id === id)?.name ?? ''
        const teamIds = db.tournamentTeams
          .filter((tt) => tt.tournamentId === tournamentId)
          .map((tt) => tt.teamId)
          .sort((a, b) => name(a).localeCompare(name(b)))
        const generated = generateRoundRobin(teamIds, options.legs)
        const plan = planMatches(tournamentId, generated, options)
        db.matches = db.matches.filter((m) => m.tournamentId !== tournamentId)
        db.rounds = db.rounds.filter((r) => r.tournamentId !== tournamentId)
        const rounds: Round[] = generated.map((r) => ({
          id: createId('r'),
          tournamentId,
          number: r.number,
          name: null,
          date: plan.find((m) => m.round === r.number)?.date ?? null,
        }))
        const matches: Match[] = plan.map((input) => ({ ...input, id: createId('m'), homeScore: null, awayScore: null, createdAt: now(), updatedAt: now() }))
        db.rounds.push(...rounds)
        db.matches.push(...matches)
        return delay({ rounds, matches })
      }),
    )
  },
}

/** Un equipo no juega dos partidos vigentes en la misma jornada. */
function assertRoundAvailable(m: Pick<Match, 'tournamentId' | 'round' | 'homeTeamId' | 'awayTeamId'>, excludeId?: ID) {
  const teams = [m.homeTeamId, m.awayTeamId]
  const clash = getDb().matches.find(
    (o) =>
      o.id !== excludeId &&
      o.tournamentId === m.tournamentId &&
      o.round === m.round &&
      o.status !== 'cancelled' &&
      (teams.includes(o.homeTeamId) || teams.includes(o.awayTeamId)),
  )
  if (clash) throw new MockHttpError(409, `Un equipo ya juega otro partido en la jornada ${m.round}`)
}

/** Toda jornada usada por un partido tiene su registro (como en el backend). */
function ensureRound(tournamentId: ID, number: number) {
  const db = getDb()
  if (!db.rounds.some((r) => r.tournamentId === tournamentId && r.number === number)) {
    db.rounds.push({ id: createId('r'), tournamentId, number, name: null, date: null })
  }
}

/** Igual que el backend: solo se eliminan partidos sin resultado ni estadísticas. */
function assertRemovable(matchId: ID) {
  const db = getDb()
  const match = db.matches.find((m) => m.id === matchId)
  if (!match) throw new MockNotFoundError('Partido', matchId)
  if (match.status === 'finished' || match.homeScore !== null || db.playerMatchStats.some((s) => s.matchId === matchId)) {
    throw new MockHttpError(409, 'El partido tiene resultado o estadísticas y no puede eliminarse')
  }
}

export const matchService: MatchService = USE_MOCKS ? mock : http
