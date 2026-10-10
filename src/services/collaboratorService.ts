import type { CollaboratorRole, Collaborators, ID, OwnerInvitation, ReceivedInvitation } from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/** Colaboradores e invitaciones (RBAC). El servidor decide todos los permisos. */
export interface CollaboratorService {
  members(tournamentId: ID): Promise<Collaborators>
  changeRole(tournamentId: ID, userId: ID, role: CollaboratorRole): Promise<Collaborators>
  revokeMember(tournamentId: ID, userId: ID): Promise<Collaborators>
  invitations(tournamentId: ID): Promise<OwnerInvitation[]>
  invite(tournamentId: ID, input: { kind: 'LINK'; role: CollaboratorRole } | { kind: 'ACCOUNT'; role: CollaboratorRole; email: string }): Promise<OwnerInvitation>
  revokeInvitation(tournamentId: ID, invitationId: ID): Promise<OwnerInvitation[]>
  preview(token: string): Promise<ReceivedInvitation>
  acceptLink(token: string): Promise<{ tournamentId: ID }>
  mine(): Promise<ReceivedInvitation[]>
  acceptMine(invitationId: ID): Promise<{ tournamentId: ID }>
  decline(invitationId: ID): Promise<void>
}

const base = (id: ID) => `/tournaments/${id}`

const http: CollaboratorService = {
  async members(id) {
    return (await api.get<Collaborators>(`${base(id)}/members`)).data
  },
  async changeRole(id, userId, role) {
    return (await api.patch<Collaborators>(`${base(id)}/members/${userId}`, { role })).data
  },
  async revokeMember(id, userId) {
    return (await api.delete<Collaborators>(`${base(id)}/members/${userId}`)).data
  },
  async invitations(id) {
    return (await api.get<OwnerInvitation[]>(`${base(id)}/invitations`)).data
  },
  async invite(id, input) {
    return (await api.post<OwnerInvitation>(`${base(id)}/invitations`, input)).data
  },
  async revokeInvitation(id, invitationId) {
    return (await api.delete<OwnerInvitation[]>(`${base(id)}/invitations/${invitationId}`)).data
  },
  async preview(token) {
    return (await api.get<ReceivedInvitation>(`/invitations/${encodeURIComponent(token)}`)).data
  },
  async acceptLink(token) {
    return (await api.post<{ tournamentId: ID }>(`/invitations/${encodeURIComponent(token)}/accept`)).data
  },
  async mine() {
    return (await api.get<ReceivedInvitation[]>('/me/invitations')).data
  },
  async acceptMine(invitationId) {
    return (await api.post<{ tournamentId: ID }>(`/me/invitations/${invitationId}/accept`)).data
  },
  async decline(invitationId) {
    await api.post(`/me/invitations/${invitationId}/decline`)
  },
}

export const COLLABORATORS_REQUIRE_SERVER = 'Los colaboradores requieren el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, COLLABORATORS_REQUIRE_SERVER))
const mock: CollaboratorService = {
  members: unsupported,
  changeRole: unsupported,
  revokeMember: unsupported,
  invitations: unsupported,
  invite: unsupported,
  revokeInvitation: unsupported,
  preview: unsupported,
  acceptLink: unsupported,
  mine: () => Promise.resolve([]),
  acceptMine: unsupported,
  decline: unsupported,
}

export const collaboratorService: CollaboratorService = USE_MOCKS ? mock : http
