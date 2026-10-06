import type { ID, PendingRegistrationSummary, RegistrationDraftSummary, Team, TeamInput, TournamentStatus, UserHome } from '@/types'
import { api, USE_MOCKS } from './api'
import { fromTeamInput } from './mappers'
import { teamService } from './teamService'

type ApiTournamentRef = { id: string; name: string; status: string }
type ApiHome = Omit<UserHome, 'registrations'> & {
  registrations: {
    drafts: (Omit<RegistrationDraftSummary, 'tournament'> & { tournament: ApiTournamentRef })[]
    pendingRequests: (Omit<PendingRegistrationSummary, 'tournament'> & { tournament: ApiTournamentRef })[]
  }
}
const toTournamentRef = (t: ApiTournamentRef) => ({ ...t, status: t.status.toLowerCase() as TournamentStatus })

export interface MeService {
  home(): Promise<UserHome>
  /** "Quiero organizar un torneo". */
  enableOrganizer(): Promise<void>
  /** Equipo nuevo del que quedo como propietario. */
  createTeam(input: TeamInput): Promise<Team>
  cancelDraft(tournamentId: ID): Promise<void>
}

const http: MeService = {
  async home() {
    const { data } = await api.get<ApiHome>('/me/home')
    return {
      ...data,
      registrations: {
        drafts: data.registrations.drafts.map((d) => ({ ...d, tournament: toTournamentRef(d.tournament) })),
        pendingRequests: data.registrations.pendingRequests.map((r) => ({ ...r, tournament: toTournamentRef(r.tournament) })),
      },
    }
  },
  async enableOrganizer() {
    await api.post('/me/organizer')
  },
  async createTeam(input) {
    const { data } = await api.post<{ id: string }>('/me/teams', fromTeamInput(input))
    return teamService.get(data.id)
  },
  async cancelDraft(tournamentId) {
    await api.delete(`/me/registration-drafts/${tournamentId}`)
  },
}

/** Modo demo: la cuenta demo organiza (los datos de ejemplo son de un organizador). */
const mock: MeService = {
  async home() {
    return { organizer: { canOrganize: true, enabled: true, tournaments: 0 }, teams: { total: 0, owner: 0, manager: 0 }, registrations: { drafts: [], pendingRequests: [] } }
  },
  async enableOrganizer() {},
  createTeam: (input) => teamService.create(input),
  async cancelDraft() {},
}

export const meService: MeService = USE_MOCKS ? mock : http
