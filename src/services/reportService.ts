import { AxiosError } from 'axios'
import type { ID, ReportCatalog, ReportFormat, ReportId } from '@/types'
import { explainError, safeFilename, type ReportErrorKind } from '@/reports/reports'
import { api, USE_MOCKS } from './api'
import { MockHttpError } from '@/mocks/session'

/** Error de una descarga, ya explicado para el organizador. */
export class ReportDownloadError extends Error {
  constructor(
    readonly kind: ReportErrorKind,
    message: string,
    readonly status: number | null,
  ) {
    super(message)
  }
}

/** Módulo 8 — reportes y exportaciones del torneo (8A genera; aquí solo se pide y se descarga). */
export interface ReportService {
  catalog(tournamentId: ID): Promise<ReportCatalog>
  /** Genera el archivo en el servidor y lo descarga en el navegador. Devuelve el nombre usado. */
  download(tournamentId: ID, report: ReportId, query: Record<string, string>, signal?: AbortSignal): Promise<string>
}

/** Mensaje del servidor dentro de una respuesta de error en Blob (descargas). */
async function messageOf(e: AxiosError): Promise<string | null> {
  const data = e.response?.data
  try {
    const text = data instanceof Blob ? await data.text() : typeof data === 'string' ? data : data ? JSON.stringify(data) : ''
    const body = JSON.parse(text) as { message?: string | string[] }
    return Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? null)
  } catch {
    return null
  }
}

/** Entrega el Blob al navegador y libera la URL temporal (también si algo falla). */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename, rel: 'noopener' })
  try {
    document.body.append(a)
    a.click()
  } finally {
    a.remove()
    // Algunos navegadores leen la URL después del clic: se libera un instante después.
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
}

const http: ReportService = {
  async catalog(tournamentId) {
    return (await api.get<ReportCatalog>(`/tournaments/${tournamentId}/reports`)).data
  },
  async download(tournamentId, report, query, signal) {
    try {
      const res = await api.get<Blob>(`/tournaments/${tournamentId}/reports/${report}`, { params: query, responseType: 'blob', signal, timeout: 120_000 })
      const format = (query.format ?? 'pdf') as ReportFormat
      const name = safeFilename(String(res.headers['content-disposition'] ?? ''), format, `${report}`)
      saveBlob(res.data, name)
      return name
    } catch (e) {
      if (e instanceof AxiosError && e.code === AxiosError.ERR_CANCELED) throw e
      const status = e instanceof AxiosError ? (e.response?.status ?? null) : null
      const message = e instanceof AxiosError ? await messageOf(e) : null
      const explained = explainError(status, message)
      throw new ReportDownloadError(explained.kind, explained.message, status)
    }
  },
}

export const REPORTS_REQUIRE_SERVER = 'Los reportes se generan en el servidor (modo demo sin backend)'
const unsupported = () => Promise.reject(new MockHttpError(501, REPORTS_REQUIRE_SERVER))
export const reportService: ReportService = USE_MOCKS ? { catalog: unsupported, download: unsupported } : http
