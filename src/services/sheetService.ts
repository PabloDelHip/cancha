import type { EvidenceKind, ID, MatchEvidence, MatchSheet, SheetTeamInput, UploadProgress } from '@/types'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/**
 * Ficha técnica digital del partido (2D) y sus fotografías de evidencia. Las fotos son privadas:
 * para verlas se pide una URL temporal (5 min) cada vez.
 */
export interface SheetService {
  get(matchId: ID): Promise<MatchSheet>
  saveTeam(matchId: ID, teamId: ID, input: SheetTeamInput): Promise<MatchSheet>
  saveObservations(matchId: ID, observations: string | null): Promise<MatchSheet>
  close(matchId: ID): Promise<MatchSheet>
  reopen(matchId: ID, reason: string): Promise<MatchSheet>
  /** `uploadKey`: generada una vez por foto; reintentar con la misma no la duplica. */
  uploadEvidence(matchId: ID, input: { file: Blob; kind: EvidenceKind; description: string; uploadKey: string; incidentId?: ID | null }, onProgress?: UploadProgress): Promise<{ evidence: MatchEvidence; duplicate: boolean }>
  evidenceUrl(matchId: ID, evidenceId: ID): Promise<{ url: string; expiresAt: string }>
  removeEvidence(matchId: ID, evidenceId: ID, reason: string): Promise<void>
}

const http: SheetService = {
  async get(matchId) {
    return (await api.get<MatchSheet>(`/matches/${matchId}/sheet`)).data
  },
  async saveTeam(matchId, teamId, input) {
    return (await api.put<MatchSheet>(`/matches/${matchId}/sheet/teams/${teamId}`, input)).data
  },
  async saveObservations(matchId, observations) {
    return (await api.put<MatchSheet>(`/matches/${matchId}/sheet/observations`, { observations })).data
  },
  async close(matchId) {
    return (await api.post<MatchSheet>(`/matches/${matchId}/sheet/close`)).data
  },
  async reopen(matchId, reason) {
    return (await api.post<MatchSheet>(`/matches/${matchId}/sheet/reopen`, { reason })).data
  },
  async uploadEvidence(matchId, input, onProgress) {
    const form = new FormData()
    // Los campos de texto antes del archivo (multer los lee en orden).
    form.append('kind', input.kind)
    form.append('uploadKey', input.uploadKey)
    if (input.description.trim()) form.append('description', input.description.trim())
    if (input.incidentId) form.append('incidentId', input.incidentId)
    form.append('file', input.file, input.file.type === 'image/png' ? 'evidencia.png' : 'evidencia.jpg')
    const { data } = await api.post<{ evidence: MatchEvidence; duplicate: boolean }>(`/matches/${matchId}/evidence`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
    return data
  },
  async evidenceUrl(matchId, evidenceId) {
    return (await api.get<{ url: string; expiresAt: string }>(`/matches/${matchId}/evidence/${evidenceId}/url`)).data
  },
  async removeEvidence(matchId, evidenceId, reason) {
    await api.post(`/matches/${matchId}/evidence/${evidenceId}/remove`, { reason })
  },
}

export const SHEET_REQUIRES_SERVER = 'La ficha técnica requiere el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, SHEET_REQUIRES_SERVER))
export const sheetService: SheetService = USE_MOCKS
  ? { get: unsupported, saveTeam: unsupported, saveObservations: unsupported, close: unsupported, reopen: unsupported, uploadEvidence: unsupported, evidenceUrl: unsupported, removeEvidence: unsupported }
  : http
