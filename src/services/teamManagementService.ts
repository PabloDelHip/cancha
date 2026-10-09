import type { AdministeredTeam, ID, PlayerInput, RosterPeriod, RosterView, TeamAdmins, TeamAdminEntry, TeamRole, TeamTournamentEntry } from '@/types'
import { api, fetchAll, USE_MOCKS } from './api'
import { fromPlayerInput, MODALITY_IN, T_STATUS_IN, toPlayer, toTeam, type ApiPlayer, type ApiTeam, type ApiTournament } from './mappers'
import { MockHttpError } from '@/mocks/session'

/**
 * Administración GLOBAL del equipo (6A + 6B). Solo contratos reales del backend:
 * - GET /admin/teams (myRole, canEdit, globalRosterSize)
 * - /teams/:id/admins · /teams/:id/managers
 * - /teams/:id/global-roster (plantilla global; NO /teams/:id/roster, que deriva de torneos)
 * - /teams/:id/global-roster/players (crear jugador y agregarlo, 6E)
 * - /teams/:id/tournaments (torneos del equipo y su plantilla en cada uno: alta/baja desde el equipo)
 * La autorización la decide el servidor; la UI solo oculta lo que el rol no puede hacer.
 */
export interface TeamManagementService {
  listAdministered(): Promise<AdministeredTeam[]>
  admins(teamId: ID): Promise<TeamAdmins>
  addManager(teamId: ID, email: string): Promise<TeamAdmins>
  removeManager(teamId: ID, userId: ID): Promise<void>
  roster(teamId: ID, view: RosterView): Promise<RosterPeriod[]>
  /** Alta o reincorporación (el servidor abre un periodo nuevo). */
  addToRoster(teamId: ID, playerId: ID): Promise<RosterPeriod>
  /**
   * Crea un jugador NUEVO (global, sin cuenta) y lo agrega a la plantilla en una sola operación.
   * `requestId`: uno por formulario; reintentar con el mismo no crea otro jugador.
   */
  createInRoster(teamId: ID, input: PlayerInput, requestId: string, opts?: { confirmNew?: boolean }): Promise<RosterPeriod>
  removeFromRoster(teamId: ID, playerId: ID): Promise<void>
  /** Torneos donde está inscrito el equipo (en curso primero) con su plantilla en cada uno. */
  tournaments(teamId: ID): Promise<TeamTournamentEntry[]>
  /** Inscribe a un jugador de la plantilla en el torneo (o cambia su dorsal). */
  registerInTournament(teamId: ID, tournamentId: ID, playerId: ID, jerseyNumber: number | null): Promise<TeamTournamentEntry[]>
  unregisterFromTournament(teamId: ID, tournamentId: ID, playerId: ID): Promise<void>
}

type ApiRole = 'OWNER' | 'MANAGER'
type ApiAdmin = Omit<TeamAdminEntry, 'role'> & { role: ApiRole }
interface ApiAdmins {
  teamId: string
  owner: ApiAdmin | null
  managers: ApiAdmin[]
}
interface ApiPeriod {
  periodId: string
  player: ApiPlayer
  status: 'ACTIVE' | 'INACTIVE'
  joinedAt: string
  leftAt: string | null
}

interface ApiTeamTournament {
  tournament: Pick<ApiTournament, 'id' | 'name' | 'format' | 'category' | 'status' | 'startDate' | 'endDate' | 'dataCoverage'>
  minPlayers: number | null
  maxPlayers: number | null
  editable: boolean
  players: { player: ApiPlayer; membership: { jerseyNumber: number | null } }[]
}

const toTeamTournament = ({ tournament: t, players, ...rest }: ApiTeamTournament): TeamTournamentEntry => ({
  ...rest,
  tournament: {
    id: t.id,
    name: t.name,
    modality: MODALITY_IN[t.format],
    category: t.category,
    status: T_STATUS_IN[t.status],
    startDate: t.startDate,
    endDate: t.endDate,
    dataCoverage: 'full',
  },
  players: players.map((p) => ({ player: toPlayer(p.player), jerseyNumber: p.membership.jerseyNumber })),
})

const role = (r: ApiRole): TeamRole => (r === 'OWNER' ? 'owner' : 'manager')
const toAdmin = (a: ApiAdmin): TeamAdminEntry => ({ ...a, role: role(a.role) })
const toAdmins = (a: ApiAdmins): TeamAdmins => ({ owner: a.owner && toAdmin(a.owner), managers: a.managers.map(toAdmin) })
const toPeriod = (p: ApiPeriod): RosterPeriod => ({
  periodId: p.periodId,
  player: toPlayer(p.player),
  status: p.status === 'ACTIVE' ? 'active' : 'inactive',
  joinedAt: p.joinedAt,
  leftAt: p.leftAt,
})

const http: TeamManagementService = {
  async listAdministered() {
    const rows = await fetchAll<ApiTeam & { myRole: ApiRole | null; canEdit: boolean; globalRosterSize: number }>('/admin/teams')
    return rows.map((t) => ({ team: toTeam(t), myRole: t.myRole && role(t.myRole), canEdit: t.canEdit, globalRosterSize: t.globalRosterSize ?? 0 }))
  },
  async admins(teamId) {
    return toAdmins((await api.get<ApiAdmins>(`/teams/${teamId}/admins`)).data)
  },
  async addManager(teamId, email) {
    return toAdmins((await api.post<ApiAdmins>(`/teams/${teamId}/managers`, { email })).data)
  },
  async removeManager(teamId, userId) {
    await api.delete(`/teams/${teamId}/managers/${userId}`)
  },
  async roster(teamId, view) {
    const { data } = await api.get<{ players: ApiPeriod[] }>(`/teams/${teamId}/global-roster`, { params: { status: view } })
    return data.players.map(toPeriod)
  },
  async addToRoster(teamId, playerId) {
    return toPeriod((await api.post<ApiPeriod>(`/teams/${teamId}/global-roster`, { playerId })).data)
  },
  async createInRoster(teamId, input, requestId, opts) {
    const body = { ...fromPlayerInput(input), requestId, ...(opts?.confirmNew ? { confirmNew: true } : {}) }
    return toPeriod((await api.post<ApiPeriod>(`/teams/${teamId}/global-roster/players`, body)).data)
  },
  async removeFromRoster(teamId, playerId) {
    await api.delete(`/teams/${teamId}/global-roster/${playerId}`)
  },
  async tournaments(teamId) {
    return (await api.get<{ tournaments: ApiTeamTournament[] }>(`/teams/${teamId}/tournaments`)).data.tournaments.map(toTeamTournament)
  },
  async registerInTournament(teamId, tournamentId, playerId, jerseyNumber) {
    const { data } = await api.put<{ tournaments: ApiTeamTournament[] }>(`/teams/${teamId}/tournaments/${tournamentId}/players/${playerId}`, { jerseyNumber })
    return data.tournaments.map(toTeamTournament)
  },
  async unregisterFromTournament(teamId, tournamentId, playerId) {
    await api.delete(`/teams/${teamId}/tournaments/${tournamentId}/players/${playerId}`)
  },
}

/**
 * Modo mock: la administración de equipos depende del servidor real (roles, plantilla global e
 * invariantes viven en el backend). No se replican aquí para no tener dos fuentes de reglas.
 */
export const TEAM_MANAGEMENT_REQUIRES_SERVER = 'La administración de equipos requiere el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, TEAM_MANAGEMENT_REQUIRES_SERVER))
const mock: TeamManagementService = {
  listAdministered: () => Promise.resolve([]),
  admins: unsupported,
  addManager: unsupported,
  removeManager: unsupported,
  roster: unsupported,
  addToRoster: unsupported,
  createInRoster: unsupported,
  removeFromRoster: unsupported,
  tournaments: unsupported,
  registerInTournament: unsupported,
  unregisterFromTournament: unsupported,
}

export const teamManagementService: TeamManagementService = USE_MOCKS ? mock : http
