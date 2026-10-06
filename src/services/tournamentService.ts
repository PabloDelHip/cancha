import type { AdvancePhaseInput, ID, Standing, TieInput, Tournament, TournamentInput, TournamentStructure, TournamentTeam, TrackedSummary } from '@/types'
import { api, fetchAll, USE_MOCKS } from './api'
import {
  fromTournamentInput,
  toStanding,
  toStructure,
  toTournament,
  toTrackedSummary,
  type ApiTrackedSummary,
  type ApiStructure,
  toTournamentTeam,
  type ApiStanding,
  type ApiTournament,
  type ApiTournamentTeam,
} from './mappers'
import { defaultSettings } from '@/utils/labels'
import { computeStandings } from '@/utils/stats'
import { buildMockTrackedSummary } from '@/mocks/teamProfile'
import { delay, getDb, MockNotFoundError, mutate, now, plain } from '@/mocks/db'
import { createId } from '@/utils/id'
import { getMockUserId, MockHttpError, requireMockUser } from '@/mocks/session'
import { assertTournamentOwner, assertTournamentWritable, guard } from '@/mocks/ownership'

export interface TournamentService {
  list(): Promise<Tournament[]>
  /** Torneos del organizador autenticado. */
  listMine(): Promise<Tournament[]>
  get(id: ID): Promise<Tournament>
  create(input: TournamentInput): Promise<Tournament>
  /** `resetSchedule`: confirma cambiar el formato borrando un calendario generado y SIN jugar. */
  update(id: ID, input: Partial<TournamentInput>, options?: { resetSchedule?: boolean }): Promise<Tournament>
  /** Inscripciones de equipos (todas o de un torneo). */
  listTeams(tournamentId?: ID): Promise<TournamentTeam[]>
  addTeam(tournamentId: ID, teamId: ID): Promise<TournamentTeam>
  removeTeam(tournamentId: ID, teamId: ID): Promise<void>
  /** DRAFT → ACTIVE. */
  start(id: ID): Promise<Tournament>
  /**
   * ACTIVE → FINISHED (terminal). Con partidos sin jugar el backend exige
   * `allowPendingMatches: true` (409 si no).
   */
  finish(id: ID, allowPendingMatches: boolean): Promise<{ tournament: Tournament; summary: TournamentSummary }>
  /**
   * Tabla de posiciones. Con backend real la calcula el servidor (GET /standings: puntuación
   * de Tournament.settings, desempate PTS → DG → GF); el frontend no la recalcula.
   */
  standings(id: ID): Promise<Standing[]>
  /** Estructura del formato: fases, grupos, cuadro y campeón (GET /tournaments/:id/structure). */
  structure(id: ID): Promise<TournamentStructure>
  /** 6G: tarjetas de TODOS los equipos en seguimiento en una sola petición (nunca una por equipo). */
  trackedSummary(id: ID): Promise<TrackedSummary>
  /** Genera la eliminatoria desde la tabla o los grupos terminados (o un cuadro vacío, a mano). */
  advance(id: ID, input: AdvancePhaseInput): Promise<TournamentStructure>
  /** Cuadro armado a mano: agregar o quitar un cruce (con sus partidos). */
  createTie(id: ID, phase: number, input: TieInput): Promise<TournamentStructure>
  deleteTie(id: ID, phase: number, round: number, slot: number): Promise<TournamentStructure>
}

export interface TournamentSummary {
  total: number
  scheduled: number
  live: number
  postponed: number
  finished: number
  cancelled: number
  pending: number
}

const http: TournamentService = {
  async list() {
    return (await fetchAll<ApiTournament>('/tournaments')).map(toTournament)
  },
  async listMine() {
    return (await fetchAll<ApiTournament>('/admin/tournaments')).map(toTournament)
  },
  async get(id) {
    return toTournament((await api.get<ApiTournament>(`/tournaments/${id}`)).data)
  },
  async create(input) {
    return toTournament((await api.post<ApiTournament>('/tournaments', fromTournamentInput(input, { withStatus: true }))).data)
  },
  async update(id, input, options) {
    const body = { ...fromTournamentInput(input), ...(options?.resetSchedule ? { resetSchedule: true } : {}) }
    return toTournament((await api.patch<ApiTournament>(`/tournaments/${id}`, body)).data)
  },
  async listTeams(tournamentId) {
    const rows = tournamentId
      ? (await api.get<ApiTournamentTeam[]>(`/tournaments/${tournamentId}/teams`)).data
      : await fetchAll<ApiTournamentTeam>('/tournament-teams')
    return rows.map(toTournamentTeam)
  },
  async addTeam(tournamentId, teamId) {
    return toTournamentTeam((await api.post<ApiTournamentTeam>(`/tournaments/${tournamentId}/teams/${teamId}`)).data)
  },
  async removeTeam(tournamentId, teamId) {
    await api.delete(`/tournaments/${tournamentId}/teams/${teamId}`)
  },
  async start(id) {
    return toTournament((await api.post<ApiTournament>(`/tournaments/${id}/start`)).data)
  },
  async finish(id, allowPendingMatches) {
    const { data } = await api.post<{ tournament: ApiTournament; summary: TournamentSummary }>(`/tournaments/${id}/finish`, {
      allowPendingMatches,
    })
    return { tournament: toTournament(data.tournament), summary: data.summary }
  },
  async standings(id) {
    return (await api.get<ApiStanding[]>(`/tournaments/${id}/standings`)).data.map(toStanding)
  },
  async structure(id) {
    return toStructure((await api.get<ApiStructure>(`/tournaments/${id}/structure`)).data)
  },
  async trackedSummary(id) {
    return toTrackedSummary((await api.get<ApiTrackedSummary>(`/tournaments/${id}/tracked-summary`)).data)
  },
  async advance(id, input) {
    return toStructure((await api.post<ApiStructure>(`/tournaments/${id}/phases/advance`, input)).data)
  },
  async createTie(id, phase, input) {
    return toStructure((await api.post<ApiStructure>(`/tournaments/${id}/phases/${phase}/ties`, input)).data)
  },
  async deleteTie(id, phase, round, slot) {
    return toStructure((await api.delete<ApiStructure>(`/tournaments/${id}/phases/${phase}/ties/${round}/${slot}`)).data)
  },
}

const mock: TournamentService = {
  list: () => delay(getDb().tournaments),
  listMine: () =>
    guard(requireMockUser, () => delay(getDb().tournaments.filter((t) => t.organizerId === getMockUserId()))),
  get(id) {
    const found = getDb().tournaments.find((t) => t.id === id)
    return found ? delay(found) : Promise.reject(new MockNotFoundError('Torneo', id))
  },
  create(input) {
    return guard(requireMockUser, () => {
    const tournament = mutate((db) => {
      const created: Tournament = {
        ...plain(input),
        trackedTeamIds: [],
        id: createId('t'),
        // Como hará el backend con el JWT: el dueño es quien tiene la sesión, nunca un campo del formulario.
        organizerId: getMockUserId()!,
        createdAt: now(),
        updatedAt: now(),
      }
      db.tournaments.push(created)
      return created
    })
    return delay(tournament)
    })
  },
  update(id, input) {
    return guard(() => assertTournamentWritable(id), () => mutate((db) => {
      const t = db.tournaments.find((x) => x.id === id)
      if (!t) return Promise.reject(new MockNotFoundError('Torneo', id))
      // Igual que el backend: el estado no cambia por aquí (start/finish).
      const rest = plain(input)
      delete rest.status
      // Mismas reglas que el backend (6G): en FULL no hay seguidos; en PARTIAL, solo inscritos.
      const coverage = rest.dataCoverage ?? t.dataCoverage
      if (coverage === 'full') {
        if (rest.trackedTeamIds?.length) return Promise.reject(new MockHttpError(400, 'Los equipos en seguimiento solo existen con cobertura parcial'))
        rest.trackedTeamIds = []
      } else if (rest.trackedTeamIds) {
        const enrolled = new Set(db.tournamentTeams.filter((tt) => tt.tournamentId === id).map((tt) => tt.teamId))
        if (new Set(rest.trackedTeamIds).size !== rest.trackedTeamIds.length) return Promise.reject(new MockHttpError(400, 'trackedTeamIds no puede repetir equipos'))
        if (rest.trackedTeamIds.some((x) => !enrolled.has(x))) return Promise.reject(new MockHttpError(409, 'Solo se puede dar seguimiento a equipos inscritos en este torneo.'))
      }
      Object.assign(t, rest, { updatedAt: now() })
      return delay(t)
    }))
  },
  start(id) {
    const check = () => {
      assertTournamentOwner(id)
      const status = getDb().tournaments.find((t) => t.id === id)?.status
      if (status !== 'draft') throw new MockHttpError(409, status === 'active' ? 'El torneo ya está en curso' : 'El torneo está finalizado y no puede reabrirse')
    }
    return guard(check, () =>
      mutate((db) => {
        const t = db.tournaments.find((x) => x.id === id)!
        Object.assign(t, { status: 'active', updatedAt: now() })
        return delay(t)
      }),
    )
  },
  finish(id, allowPendingMatches) {
    const summary = (): TournamentSummary => {
      const list = getDb().matches.filter((m) => m.tournamentId === id)
      const by = (s: string) => list.filter((m) => m.status === s).length
      const counts = { scheduled: by('scheduled'), live: by('live'), postponed: by('postponed'), finished: by('finished'), cancelled: by('cancelled') }
      return { total: list.length, ...counts, pending: counts.scheduled + counts.live + counts.postponed }
    }
    const check = () => {
      assertTournamentOwner(id)
      const status = getDb().tournaments.find((t) => t.id === id)?.status
      if (status !== 'active') throw new MockHttpError(409, status === 'finished' ? 'El torneo ya está finalizado' : 'Solo se puede finalizar un torneo en curso')
      const pending = summary().pending
      if (pending && !allowPendingMatches) throw new MockHttpError(409, `Quedan ${pending} partidos sin jugar`)
    }
    return guard(check, () =>
      mutate((db) => {
        const t = db.tournaments.find((x) => x.id === id)!
        Object.assign(t, { status: 'finished', updatedAt: now() })
        return delay({ tournament: t, summary: summary() })
      }),
    )
  },
  standings(id) {
    // Sin servidor, el mock hace de backend: única copia local de las reglas de la tabla.
    const db = getDb()
    const tournament = db.tournaments.find((t) => t.id === id)
    if (!tournament) return Promise.reject(new MockNotFoundError('Torneo', id))
    const teamIds = db.tournamentTeams.filter((tt) => tt.tournamentId === id).map((tt) => tt.teamId)
    const nameOf = (teamId: ID) => db.teams.find((t) => t.id === teamId)?.name ?? ''
    const matches = db.matches.filter((m) => m.tournamentId === id)
    return delay(computeStandings(teamIds, matches, nameOf, 5, tournament.settings.points))
  },
  structure(id) {
    // El modo demo solo simula ligas clásicas: su estructura es una única tabla.
    const db = getDb()
    const tournament = db.tournaments.find((t) => t.id === id)
    if (!tournament) return Promise.reject(new MockNotFoundError('Torneo', id))
    const matches = db.matches.filter((m) => m.tournamentId === id)
    const teamIds = db.tournamentTeams.filter((tt) => tt.tournamentId === id).map((tt) => tt.teamId)
    const table = computeStandings(teamIds, matches, (t) => db.teams.find((x) => x.id === t)?.name ?? '', 5, tournament.settings.points)
    const pending = matches.filter((m) => m.status === 'scheduled' || m.status === 'live' || m.status === 'postponed').length
    const complete = matches.length > 0 && pending === 0
    const [first, second] = table
    const tiedTop = !!first && !!second && first.points === second.points && first.goalDifference === second.goalDifference && first.goalsFor === second.goalsFor
    const teams = Object.fromEntries(
      db.teams.filter((t) => teamIds.includes(t.id)).map((t) => [t.id, { id: t.id, name: t.name, shortName: t.shortName, logoUrl: t.logoUrl, colors: t.colors }]),
    )
    const { system, roundRobinLegs, knockoutLegs, knockoutTiebreak, finalTiebreak, reseed, groupCount, qualifiersPerGroup, playoffTeams } = { ...defaultSettings(), ...tournament.settings }
    const settings = { system, roundRobinLegs, knockoutLegs, knockoutTiebreak, finalTiebreak, reseed, groupCount, qualifiersPerGroup, playoffTeams }
    return delay({
      tournamentId: id,
      status: tournament.status,
      settings,
      phases: [{ index: 0, type: 'league' as const, generated: matches.length > 0, complete, pending, table, qualification: null }],
      next: null,
      championTeamId: complete && first && !tiedTop ? first.teamId : null,
      tiebreaks: [],
      teams,
    })
  },
  trackedSummary(id) {
    const summary = buildMockTrackedSummary(id)
    return summary ? delay(summary) : Promise.reject(new MockNotFoundError('Torneo', id))
  },
  advance() {
    return Promise.reject(new MockHttpError(409, 'Los formatos con fases (grupos, eliminatorias, playoffs) requieren el servidor'))
  },
  createTie() {
    return Promise.reject(new MockHttpError(409, 'Los formatos con fases (grupos, eliminatorias, playoffs) requieren el servidor'))
  },
  deleteTie() {
    return Promise.reject(new MockHttpError(409, 'Los formatos con fases (grupos, eliminatorias, playoffs) requieren el servidor'))
  },
  listTeams(tournamentId) {
    const all = getDb().tournamentTeams
    return delay(tournamentId ? all.filter((tt) => tt.tournamentId === tournamentId) : all)
  },
  addTeam(tournamentId, teamId) {
    return guard(() => assertTournamentWritable(tournamentId), () => mutate((db) => {
      const existing = db.tournamentTeams.find((tt) => tt.tournamentId === tournamentId && tt.teamId === teamId)
      if (existing) return delay(existing)
      const created: TournamentTeam = { id: createId('tt'), tournamentId, teamId, joinedAt: now() }
      db.tournamentTeams.push(created)
      return delay(created)
    }))
  },
  removeTeam(tournamentId, teamId) {
    const check = () => {
      assertTournamentWritable(tournamentId)
      const played = getDb().matches.some(
        (m) => m.tournamentId === tournamentId && (m.homeTeamId === teamId || m.awayTeamId === teamId),
      )
      if (played) throw new MockHttpError(409, 'El equipo ya tiene partidos en este torneo y no puede darse de baja')
    }
    return guard(check, () => {
      mutate((db) => {
        db.tournamentTeams = db.tournamentTeams.filter((tt) => !(tt.tournamentId === tournamentId && tt.teamId === teamId))
        // Como el backend (6G): deja de estar en seguimiento en la misma operación.
        const t = db.tournaments.find((x) => x.id === tournamentId)
        if (t) t.trackedTeamIds = (t.trackedTeamIds ?? []).filter((x) => x !== teamId)
        // Igual que el backend: se retiran también sus participaciones en ESTE torneo.
        db.memberships = db.memberships.filter((m) => !(m.tournamentId === tournamentId && m.teamId === teamId))
      })
      return delay(undefined)
    })
  },
}

export const tournamentService: TournamentService = USE_MOCKS ? mock : http
