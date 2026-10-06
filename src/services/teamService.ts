import type { ID, Team, TeamInput, TeamMatch, TeamProfile, UploadProgress } from '@/types'
import { blobToDataUrl, putImage } from './imageUpload'
import { api, fetchAll, USE_MOCKS } from './api'
import type { AdminRef } from './playerService'
import { fromTeamInput, toTeam, toTeamMatch, toTeamProfile, type ApiTeam, type ApiTeamMatch, type ApiTeamProfile } from './mappers'
import { buildMockTeamProfile, mockTeamMatches } from '@/mocks/teamProfile'
import { delay, getDb, MockNotFoundError, mutate, now, plain } from '@/mocks/db'
import { createId } from '@/utils/id'
import { getMockUserId, requireMockUser } from '@/mocks/session'
import { assertTeamCustodian, guard } from '@/mocks/ownership'
import { MockHttpError } from '@/mocks/session'

export interface TeamService {
  list(): Promise<Team[]>
  /** Equipos inscritos en mis torneos + fichas que registré (canEdit = puedo editar la ficha). */
  listMine(): Promise<AdminRef[]>
  get(id: ID): Promise<Team>
  /** Perfil histórico: agregado calculado por el servidor (GET /teams/:id/profile). */
  profile(id: ID): Promise<TeamProfile>
  /** Partidos oficiales del equipo, más recientes primero, paginados en el servidor. */
  matches(id: ID, page: number, limit: number): Promise<{ items: TeamMatch[]; total: number }>
  create(input: TeamInput): Promise<Team>
  update(id: ID, input: Partial<TeamInput>): Promise<Team>
  /** Sube (o reemplaza) el logo: el servidor lo guarda en Cloudinary y devuelve el equipo con la URL. */
  uploadLogo(id: ID, image: Blob, onProgress?: UploadProgress): Promise<Team>
  /** Quita el logo (y el servidor lo borra de Cloudinary). */
  removeLogo(id: ID): Promise<Team>
  /** Solo equipos sin historia (lo decide el servidor: 409 con el motivo). */
  remove(id: ID): Promise<void>
}

const http: TeamService = {
  async list() {
    return (await fetchAll<ApiTeam>('/teams')).map(toTeam)
  },
  async listMine() {
    return (await fetchAll<ApiTeam & { canEdit: boolean }>('/admin/teams')).map((t) => ({ id: t.id, canEdit: t.canEdit }))
  },
  async get(id) {
    return toTeam((await api.get<ApiTeam>(`/teams/${id}`)).data)
  },
  async profile(id) {
    return toTeamProfile((await api.get<ApiTeamProfile>(`/teams/${id}/profile`)).data)
  },
  async matches(id, page, limit) {
    const { data } = await api.get<{ data: ApiTeamMatch[]; meta: { total: number } }>(`/teams/${id}/matches`, { params: { page, limit } })
    return { items: data.data.map(toTeamMatch), total: data.meta.total }
  },
  async create(input) {
    return toTeam((await api.post<ApiTeam>('/teams', fromTeamInput(input))).data)
  },
  async update(id, input) {
    return toTeam((await api.patch<ApiTeam>(`/teams/${id}`, fromTeamInput(input))).data)
  },
  async uploadLogo(id, image, onProgress) {
    return toTeam(await putImage<ApiTeam>(`/teams/${id}/logo`, image, onProgress))
  },
  async removeLogo(id) {
    return toTeam((await api.delete<ApiTeam>(`/teams/${id}/logo`)).data)
  },
  async remove(id) {
    await api.delete(`/teams/${id}`)
  },
}

const mock: TeamService = {
  list: () => delay(getDb().teams),
  listMine: () =>
    guard(requireMockUser, () => {
      const db = getDb()
      const me = getMockUserId()
      const mine = new Set(db.tournaments.filter((t) => t.organizerId === me).map((t) => t.id))
      const enrolled = new Set(db.tournamentTeams.filter((tt) => mine.has(tt.tournamentId)).map((tt) => tt.teamId))
      return delay(
        db.teams.filter((t) => enrolled.has(t.id) || t.createdBy === me).map((t) => ({ id: t.id, canEdit: t.createdBy === me })),
      )
    }),
  profile(id) {
    const profile = buildMockTeamProfile(id)
    return profile ? delay(profile) : Promise.reject(new MockNotFoundError('Equipo', id))
  },
  matches(id, page, limit) {
    return getDb().teams.some((t) => t.id === id) ? delay(mockTeamMatches(id, page, limit)) : Promise.reject(new MockNotFoundError('Equipo', id))
  },
  get(id) {
    const found = getDb().teams.find((t) => t.id === id)
    return found ? delay(found) : Promise.reject(new MockNotFoundError('Equipo', id))
  },
  create(input) {
    return guard(requireMockUser, () =>
      mutate((db) => {
        const created: Team = { ...plain(input), logoUrl: input.logoUrl ?? null, id: createId('team'), createdBy: getMockUserId(), createdAt: now(), updatedAt: now() }
        db.teams.push(created)
        return delay(created)
      }),
    )
  },
  update(id, input) {
    return guard(() => assertTeamCustodian(id), () =>
      mutate((db) => {
        const team = db.teams.find((t) => t.id === id)
        if (!team) return Promise.reject(new MockNotFoundError('Equipo', id))
        Object.assign(team, plain(input), { updatedAt: now() })
        return delay(team)
      }),
    )
  },
  async uploadLogo(id, image, onProgress) {
    const logoUrl = await blobToDataUrl(image)
    onProgress?.(100)
    return mock.update(id, { logoUrl })
  },
  removeLogo(id) {
    return mock.update(id, { logoUrl: null })
  },
  // Solo se usa desde la administración de equipos, que en modo demo requiere el servidor.
  remove: () => Promise.reject(new MockHttpError(501, 'Eliminar equipos requiere el servidor')),
}

export const teamService: TeamService = USE_MOCKS ? mock : http
