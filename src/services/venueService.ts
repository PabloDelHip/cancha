import type { FieldAvailability, ID, SlotCheck, Venue } from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/** Sedes y canchas del organizador (/venues). El servidor valida conflictos y permisos. */
export interface VenueService {
  list(): Promise<Venue[]>
  /** Sedes del propietario del torneo (para quien asigna canchas en él). */
  forTournament(tournamentId: ID): Promise<Venue[]>
  create(input: { name: string; address: string | null; bufferMinutes: number; fields: { name: string }[] }): Promise<Venue>
  update(id: ID, input: Partial<{ name: string; address: string | null; bufferMinutes: number; active: boolean }>): Promise<Venue>
  remove(id: ID): Promise<{ archived: boolean }>
  addField(id: ID, input: { name: string; availability?: FieldAvailability }): Promise<Venue>
  updateField(id: ID, fieldId: ID, input: Partial<{ name: string; active: boolean; availability: FieldAvailability }>): Promise<Venue>
  removeField(id: ID, fieldId: ID): Promise<{ archived: boolean; venue: Venue }>
  check(params: { fieldId: ID; tournamentId: ID; date: string; time: string; matchId?: ID }): Promise<SlotCheck>
}

const http: VenueService = {
  async list() {
    return (await api.get<Venue[]>('/venues')).data
  },
  async forTournament(tournamentId) {
    return (await api.get<Venue[]>(`/tournaments/${tournamentId}/venues`)).data
  },
  async create(input) {
    return (await api.post<Venue>('/venues', input)).data
  },
  async update(id, input) {
    return (await api.patch<Venue>(`/venues/${id}`, input)).data
  },
  async remove(id) {
    return (await api.delete<{ archived: boolean }>(`/venues/${id}`)).data
  },
  async addField(id, input) {
    return (await api.post<Venue>(`/venues/${id}/fields`, input)).data
  },
  async updateField(id, fieldId, input) {
    return (await api.patch<Venue>(`/venues/${id}/fields/${fieldId}`, input)).data
  },
  async removeField(id, fieldId) {
    return (await api.delete<{ archived: boolean; venue: Venue }>(`/venues/${id}/fields/${fieldId}`)).data
  },
  async check(params) {
    return (await api.get<SlotCheck>('/venues/check', { params })).data
  },
}

export const VENUES_REQUIRE_SERVER = 'Las sedes y canchas requieren el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, VENUES_REQUIRE_SERVER))
const mock: VenueService = {
  list: unsupported,
  forTournament: unsupported,
  create: unsupported,
  update: unsupported,
  remove: unsupported,
  addField: unsupported,
  updateField: unsupported,
  removeField: unsupported,
  check: unsupported,
}

export const venueService: VenueService = USE_MOCKS ? mock : http
