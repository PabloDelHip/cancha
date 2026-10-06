import type { ID, MyRegistrationTeam, RegistrationDraft, RegistrationDraftStep, PublicRegistration, RegistrationAdminState, RegistrationRequestDetail, RegistrationRequestStatus, RegistrationRequestSummary, RegistrationSettings, TeamInput } from '@/types'
import { api, USE_MOCKS } from './api'
import {
  fromTeamInput,
  toMyRegistrationTeam,
  toPublicRegistration,
  toRegistrationAdminState,
  toRequestDetail,
  toRequestSummary,
  type ApiMyRegistrationTeam,
  type ApiPublicRegistration,
  type ApiRegistrationAdminState,
  type ApiRequestDetail,
  type ApiRequestSummary,
} from './mappers'
import { MockHttpError } from '@/mocks/session'

/**
 * Inscripción de equipos por link (Etapa 7). Organizador: /tournaments/:id/registration*. Quien
 * inscribe: /tournament-registration/:token/*. El servidor decide todos los permisos: el enlace
 * solo da acceso al flujo; enviar exige ser propietario o delegado del equipo.
 */
export interface RegistrationService {
  // Organizador
  state(tournamentId: ID): Promise<RegistrationAdminState>
  updateSettings(tournamentId: ID, input: Partial<Omit<RegistrationSettings, 'approvalRequired'>>): Promise<RegistrationAdminState>
  generateLink(tournamentId: ID): Promise<RegistrationAdminState>
  revokeLink(tournamentId: ID): Promise<void>
  requests(tournamentId: ID, status?: RegistrationRequestStatus): Promise<{ counts: RegistrationAdminState['counts']; requests: RegistrationRequestSummary[] }>
  request(tournamentId: ID, requestId: ID): Promise<RegistrationRequestDetail>
  approve(tournamentId: ID, requestId: ID): Promise<RegistrationRequestDetail>
  reject(tournamentId: ID, requestId: ID, reason: string | null): Promise<RegistrationRequestDetail>
  // Por enlace
  resolve(token: string): Promise<PublicRegistration>
  myTeams(token: string): Promise<MyRegistrationTeam[]>
  submit(token: string, teamId: ID, playerIds: ID[]): Promise<RegistrationRequestSummary>
  cancel(token: string, requestId: ID): Promise<void>
  createTeam(token: string, input: TeamInput): Promise<MyRegistrationTeam>
  // Inscripción incompleta (se guarda mientras se avanza; se borra al enviar)
  getDraft(token: string): Promise<RegistrationDraft | null>
  saveDraft(token: string, draft: { teamId: ID | null; playerIds: ID[]; step: RegistrationDraftStep }): Promise<RegistrationDraft | null>
  deleteDraft(token: string): Promise<void>
}

const base = (id: ID) => `/tournaments/${id}`
const link = (token: string) => `/tournament-registration/${encodeURIComponent(token)}`

const http: RegistrationService = {
  async state(id) {
    return toRegistrationAdminState((await api.get<ApiRegistrationAdminState>(`${base(id)}/registration`)).data)
  },
  async updateSettings(id, input) {
    return toRegistrationAdminState((await api.patch<ApiRegistrationAdminState>(`${base(id)}/registration`, input)).data)
  },
  async generateLink(id) {
    return toRegistrationAdminState((await api.post<ApiRegistrationAdminState>(`${base(id)}/registration-link`)).data)
  },
  async revokeLink(id) {
    await api.delete(`${base(id)}/registration-link`)
  },
  async requests(id, status) {
    const { data } = await api.get<{ counts: Record<string, number>; requests: ApiRequestSummary[] }>(`${base(id)}/registration-requests`, {
      params: status ? { status: status.toUpperCase() } : {},
    })
    return {
      counts: Object.fromEntries(Object.entries(data.counts).map(([k, v]) => [k.toLowerCase(), v])) as RegistrationAdminState['counts'],
      requests: data.requests.map(toRequestSummary),
    }
  },
  async request(id, requestId) {
    return toRequestDetail((await api.get<ApiRequestDetail>(`${base(id)}/registration-requests/${requestId}`)).data)
  },
  async approve(id, requestId) {
    return toRequestDetail((await api.post<ApiRequestDetail>(`${base(id)}/registration-requests/${requestId}/approve`)).data)
  },
  async reject(id, requestId, reason) {
    return toRequestDetail((await api.post<ApiRequestDetail>(`${base(id)}/registration-requests/${requestId}/reject`, reason ? { reason } : {})).data)
  },
  async resolve(token) {
    return toPublicRegistration((await api.get<ApiPublicRegistration>(link(token))).data)
  },
  async myTeams(token) {
    return (await api.get<{ teams: ApiMyRegistrationTeam[] }>(`${link(token)}/my-teams`)).data.teams.map(toMyRegistrationTeam)
  },
  async submit(token, teamId, playerIds) {
    return toRequestSummary((await api.post<ApiRequestSummary>(`${link(token)}/requests`, { teamId, playerIds })).data)
  },
  async cancel(token, requestId) {
    await api.post(`${link(token)}/requests/${requestId}/cancel`)
  },
  async createTeam(token, input) {
    return toMyRegistrationTeam((await api.post<ApiMyRegistrationTeam>(`${link(token)}/teams`, fromTeamInput(input))).data)
  },
  async getDraft(token) {
    return (await api.get<{ draft: RegistrationDraft | null }>(`${link(token)}/draft`)).data.draft
  },
  async saveDraft(token, draft) {
    return (await api.put<{ draft: RegistrationDraft | null }>(`${link(token)}/draft`, draft)).data.draft
  },
  async deleteDraft(token) {
    await api.delete(`${link(token)}/draft`)
  },
}

/** Modo demo: la inscripción por link (varios usuarios, permisos y transacciones) requiere el servidor. */
export const REGISTRATION_REQUIRES_SERVER = 'Las inscripciones por enlace requieren el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, REGISTRATION_REQUIRES_SERVER))
const mock: RegistrationService = {
  state: unsupported,
  updateSettings: unsupported,
  generateLink: unsupported,
  revokeLink: unsupported,
  requests: unsupported,
  request: unsupported,
  approve: unsupported,
  reject: unsupported,
  resolve: unsupported,
  myTeams: unsupported,
  submit: unsupported,
  cancel: unsupported,
  createTeam: unsupported,
  getDraft: unsupported,
  saveDraft: unsupported,
  deleteDraft: unsupported,
}

export const registrationService: RegistrationService = USE_MOCKS ? mock : http
