import type {
  ID,
  ISODate,
  Player,
  PlayerDetails,
  PlayerInput,
  PlayerProfile,
  ProfileMatch,
  RosterAssignment,
  TeamMembership,
  UploadProgress,
} from '@/types'
import { blobToDataUrl, putImage } from './imageUpload'
import { api, fetchAll, USE_MOCKS } from './api'
import {
  fromPlayerInput,
  toMembership,
  toPlayer,
  toPlayerDetails,
  toPlayerProfile,
  toProfileMatchFromRow,
  type ApiMembership,
  type ApiPlayer,
  type ApiPlayerDetails,
  type ApiPlayerMatchRow,
  type ApiPlayerProfile,
} from './mappers'
import { buildMockProfile, mockPlayerMatches, toPlayerDetails as toMockDetails, toPublicPlayer } from '@/mocks/playerProfile'
import { delay, getDb, MockNotFoundError, mutate, now, plain } from '@/mocks/db'
import { createId } from '@/utils/id'
import { getMockUserId, MockHttpError, requireMockUser } from '@/mocks/session'
import { assertPlayerCustodian, assertTournamentWritable, guard } from '@/mocks/ownership'
import { toISODate } from '@/utils/format'
import type { PlayerRecord } from '@/mocks/seed'

/** Recurso visible en el panel, con permiso de edición de su ficha maestra. */
export interface AdminRef {
  id: ID
  canEdit: boolean
}

/** En el panel, el custodio (canEdit) recibe además la fecha de nacimiento exacta para editarla. */
export interface PlayerAdminRef extends AdminRef {
  birthDate?: ISODate | null
}

export interface PlayerService {
  /** Búsqueda global (representación pública: edad, no fecha de nacimiento). */
  list(): Promise<Player[]>
  /** Búsqueda en el servidor por nombre (GET /players?search=), primeros `limit` resultados. */
  search(query: string, limit?: number): Promise<Player[]>
  /** Jugadores de mis torneos + fichas que registré (canEdit = puedo editar la ficha). */
  listMine(): Promise<PlayerAdminRef[]>
  get(id: ID): Promise<Player>
  /** Perfil deportivo: agregado calculado por el servidor (GET /players/:id/profile). */
  profile(id: ID): Promise<PlayerProfile>
  /** Partidos oficiales del jugador, más recientes primero, paginados en el servidor. */
  matches(id: ID, page: number, limit: number): Promise<{ items: ProfileMatch[]; total: number }>
  /** Crear/editar la ficha: quien lo hace es su custodio y recibe la fecha exacta. */
  /** Con posibles duplicados el servidor responde 409 (ver possibleDuplicates); `confirmNew` crea igual. */
  create(input: PlayerInput, opts?: { confirmNew?: boolean }): Promise<PlayerDetails>
  update(id: ID, input: Partial<PlayerInput>): Promise<PlayerDetails>
  /** Sube (o reemplaza) la foto: el servidor la guarda en Cloudinary y devuelve la ficha con la URL. */
  uploadPhoto(id: ID, image: Blob, onProgress?: UploadProgress): Promise<PlayerDetails>
  /** Quita la foto (y el servidor la borra de Cloudinary). */
  removePhoto(id: ID): Promise<PlayerDetails>
  listMemberships(playerId?: ID): Promise<TeamMembership[]>
  /**
   * Registra al jugador (global) en un equipo de MI torneo, o lo cambia de equipo/dorsal
   * dentro de él. No toca sus participaciones en otros torneos. Devuelve su historial.
   */
  register(playerId: ID, assignment: RosterAssignment): Promise<TeamMembership[]>
  /** Da de baja al jugador de MI torneo (conserva el historial). */
  unregister(tournamentId: ID, playerId: ID): Promise<void>
}

const http: PlayerService = {
  async list() {
    return (await fetchAll<ApiPlayer>('/players')).map(toPlayer)
  },
  async search(query, limit = 20) {
    const { data } = await api.get<{ data: ApiPlayer[] }>('/players', { params: { search: query, limit } })
    return data.data.map(toPlayer)
  },
  async listMine() {
    const rows = await fetchAll<ApiPlayer & { canEdit: boolean; birthDate?: string | null }>('/admin/players')
    // La fecha solo llega si registré la ficha; editar por el equipo no la trae (y no debe borrarse).
    return rows.map((p) => ({ id: p.id, canEdit: p.canEdit, ...(p.birthDate !== undefined ? { birthDate: p.birthDate } : {}) }))
  },
  async get(id) {
    return toPlayer((await api.get<ApiPlayer>(`/players/${id}`)).data)
  },
  async profile(id) {
    return toPlayerProfile((await api.get<ApiPlayerProfile>(`/players/${id}/profile`)).data)
  },
  async matches(id, page, limit) {
    const { data } = await api.get<{ data: ApiPlayerMatchRow[]; meta: { total: number } }>(`/players/${id}/matches`, {
      params: { page, limit },
    })
    return { items: data.data.map(toProfileMatchFromRow), total: data.meta.total }
  },
  async create(input, opts) {
    const body = { ...fromPlayerInput(input), ...(opts?.confirmNew ? { confirmNew: true } : {}) }
    return toPlayerDetails((await api.post<ApiPlayerDetails>('/players', body)).data)
  },
  async update(id, input) {
    return toPlayerDetails((await api.patch<ApiPlayerDetails>(`/players/${id}`, fromPlayerInput(input))).data)
  },
  async uploadPhoto(id, image, onProgress) {
    return toPlayerDetails(await putImage<ApiPlayerDetails>(`/players/${id}/photo`, image, onProgress))
  },
  async removePhoto(id) {
    return toPlayerDetails((await api.delete<ApiPlayerDetails>(`/players/${id}/photo`)).data)
  },
  async listMemberships(playerId) {
    const rows = playerId
      ? (await api.get<ApiMembership[]>(`/players/${playerId}/memberships`)).data
      : await fetchAll<ApiMembership>('/memberships')
    return rows.map(toMembership)
  },
  async register(playerId, { tournamentId, teamId, shirtNumber }) {
    const { data } = await api.put<ApiMembership[]>(`/tournaments/${tournamentId}/players/${playerId}`, {
      teamId,
      jerseyNumber: shirtNumber,
    })
    return data.map(toMembership)
  },
  async unregister(tournamentId, playerId) {
    await api.delete(`/tournaments/${tournamentId}/players/${playerId}`)
  },
}

/** Mismas reglas que el backend: solo el organizador del torneo toca sus participaciones. */
const mock: PlayerService = {
  list: () => delay(getDb().players.map(toPublicPlayer)),
  search: (query, limit = 20) => {
    const q = query.trim().toLowerCase()
    return delay(getDb().players.map(toPublicPlayer).filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)).slice(0, limit))
  },
  listMine: () =>
    guard(requireMockUser, () => {
      const db = getDb()
      const me = getMockUserId()
      const mine = new Set(db.tournaments.filter((t) => t.organizerId === me).map((t) => t.id))
      const participants = new Set(
        db.memberships.filter((m) => m.status === 'active' && mine.has(m.tournamentId)).map((m) => m.playerId),
      )
      return delay(
        db.players
          .filter((p) => participants.has(p.id) || p.createdBy === me)
          .map((p) => ({ id: p.id, canEdit: p.createdBy === me, ...(p.createdBy === me ? { birthDate: p.birthDate } : {}) })),
      )
    }),
  get(id) {
    const found = getDb().players.find((p) => p.id === id)
    return found ? delay(toPublicPlayer(found)) : Promise.reject(new MockNotFoundError('Jugador', id))
  },
  profile(id) {
    const profile = buildMockProfile(id)
    return profile ? delay(profile) : Promise.reject(new MockNotFoundError('Jugador', id))
  },
  matches(id, page, limit) {
    return getDb().players.some((p) => p.id === id)
      ? delay(mockPlayerMatches(id, page, limit))
      : Promise.reject(new MockNotFoundError('Jugador', id))
  },
  create(input) {
    return guard(requireMockUser, () =>
      mutate((db) => {
        const created: PlayerRecord = {
          ...plain(input),
          birthDate: input.birthDate ?? null,
          photoUrl: input.photoUrl ?? null,
          nickname: input.nickname ?? null,
          id: createId('p'),
          userId: null,
          createdBy: getMockUserId(),
          createdAt: now(),
          updatedAt: now(),
        }
        db.players.push(created)
        return delay(toMockDetails(created))
      }),
    )
  },
  update(id, input) {
    return guard(
      () => assertPlayerCustodian(id),
      () =>
        mutate((db) => {
          const player = db.players.find((p) => p.id === id)
          if (!player) return Promise.reject(new MockNotFoundError('Jugador', id))
          Object.assign(player, plain(input), { updatedAt: now() })
          return delay(toMockDetails(player))
        }),
    )
  },
  async uploadPhoto(id, image, onProgress) {
    const photoUrl = await blobToDataUrl(image)
    onProgress?.(100)
    return mock.update(id, { photoUrl })
  },
  removePhoto(id) {
    return mock.update(id, { photoUrl: null })
  },
  listMemberships(playerId) {
    const all = getDb().memberships
    return delay(playerId ? all.filter((m) => m.playerId === playerId) : all)
  },
  register(playerId, { tournamentId, teamId, shirtNumber }) {
    const check = () => {
      assertTournamentWritable(tournamentId)
      const db = getDb()
      if (!db.players.some((p) => p.id === playerId)) throw new MockNotFoundError('Jugador', playerId)
      if (!db.tournamentTeams.some((tt) => tt.tournamentId === tournamentId && tt.teamId === teamId)) {
        throw new MockHttpError(400, 'El equipo no está inscrito en este torneo')
      }
      const taken = db.memberships.some(
        (m) =>
          m.tournamentId === tournamentId &&
          m.teamId === teamId &&
          m.status === 'active' &&
          shirtNumber !== null &&
          m.shirtNumber === shirtNumber &&
          m.playerId !== playerId,
      )
      if (taken) throw new MockHttpError(409, `El dorsal #${shirtNumber} ya está ocupado en ese equipo`)
    }
    return guard(check, () =>
      mutate((db) => {
        const current = db.memberships.find(
          (m) => m.tournamentId === tournamentId && m.playerId === playerId && m.status === 'active',
        )
        const today = toISODate(new Date())
        const changeDate = current && current.startDate > today ? current.startDate : today
        if (current && current.teamId === teamId) {
          current.shirtNumber = shirtNumber
          current.updatedAt = now()
        } else {
          if (current) Object.assign(current, { status: 'ended', endDate: changeDate, updatedAt: now() })
          db.memberships.push({
            id: createId('tm'),
            playerId,
            teamId,
            tournamentId,
            shirtNumber,
            startDate: changeDate,
            endDate: null,
            status: 'active',
            createdAt: now(),
            updatedAt: now(),
          })
        }
        return delay(db.memberships.filter((m) => m.playerId === playerId))
      }),
    )
  },
  unregister(tournamentId, playerId) {
    return guard(
      () => assertTournamentWritable(tournamentId),
      () => {
        mutate((db) => {
          const current = db.memberships.find(
            (m) => m.tournamentId === tournamentId && m.playerId === playerId && m.status === 'active',
          )
          if (current) {
            const today = toISODate(new Date())
            Object.assign(current, {
              status: 'ended',
              endDate: current.startDate > today ? current.startDate : today,
              updatedAt: now(),
            })
          }
        })
        return delay(undefined)
      },
    )
  },
}

export const playerService: PlayerService = USE_MOCKS ? mock : http
