/**
 * 8B — lógica de la pantalla de reportes, sin Vue ni red (probada en test/reports-8b.test.mjs):
 * qué parámetros se envían, cómo se valida el periodo, qué nombre de archivo es seguro y cómo se
 * explica cada error del servidor. Los reportes, permisos y filtros vienen del catálogo (8A).
 */
import type { ReportCatalog, ReportFilterKey, ReportFilters, ReportFormat, ReportId, ReportMatchStatus } from '@/types'

export type ReportEntry = ReportCatalog['reports'][number]

/** Categoría visual de cada reporte. */
export type ReportCategory = 'sports' | 'admin' | 'finance'
export const REPORT_CATEGORY: Record<ReportId, ReportCategory> = {
  standings: 'sports',
  matches: 'sports',
  players: 'sports',
  summary: 'sports',
  rosters: 'admin',
  discipline: 'admin',
  finance: 'finance',
}
export const CATEGORY_LABEL: Record<ReportCategory, string> = { sports: 'Deportivo', admin: 'Administrativo', finance: 'Financiero' }

/** Qué contiene el archivo (texto llano para el organizador). */
export const REPORT_CONTENTS: Record<ReportId, string> = {
  standings: 'Posición, equipo, partidos jugados, ganados, empatados, perdidos, goles y puntos.',
  matches: 'Jornada, fecha, hora, equipos, marcador, estado, cancha y árbitro de cada partido.',
  players: 'Partidos, goles, asistencias, autogoles y tarjetas de cada jugador (solo partidos finalizados).',
  rosters: 'Equipos inscritos y jugadores con dorsal, posición y estado de inscripción. Sin fecha de nacimiento ni datos de contacto.',
  discipline: 'Sanciones con su cumplimiento y tarjetas por jugador.',
  finance: 'Resumen, saldos por equipo, cargos por concepto, pagos por método y movimientos.',
  summary: 'Datos generales, partidos y goles, equipos, tabla de posiciones y goleadores.',
}

export const FORMAT_LABEL: Record<ReportFormat, { label: string; hint: string }> = {
  pdf: { label: 'PDF', hint: 'Para imprimir o compartir' },
  xlsx: { label: 'Excel', hint: 'Para analizar (.xlsx)' },
  csv: { label: 'CSV', hint: 'Datos en texto plano' },
}

export const FILTER_LABEL: Record<ReportFilterKey, string> = {
  phase: 'Fase',
  group: 'Grupo',
  round: 'Jornada',
  teamId: 'Equipo',
  from: 'Desde',
  to: 'Hasta',
  status: 'Estado del partido',
  includeInactive: 'Incluir bajas',
}

/** Estados del filtro de partidos, en el orden en que se muestran (valores del backend). */
export const STATUS_OPTIONS: { value: ReportMatchStatus; label: string }[] = [
  { value: 'SCHEDULED', label: 'Programado' },
  { value: 'LIVE', label: 'En juego' },
  { value: 'FINISHED', label: 'Finalizado' },
  { value: 'POSTPONED', label: 'Pospuesto' },
  { value: 'PENDING_SCHEDULE', label: 'Por programar' },
  { value: 'SUSPENDED', label: 'Suspendido' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

/** Filtros iniciales: sin filtro (todo el torneo). */
export const emptyFilters = (): ReportFilters => ({ phase: '', group: '', round: '', teamId: '', from: '', to: '', status: [], includeInactive: false })

/** Errores del periodo (se muestran junto a los campos; la descarga queda deshabilitada). */
export function filterErrors(report: Pick<ReportEntry, 'filters'>, f: ReportFilters): Partial<Record<ReportFilterKey, string>> {
  const errors: Partial<Record<ReportFilterKey, string>> = {}
  if (report.filters.includes('from') && report.filters.includes('to') && f.from && f.to && f.from > f.to) errors.to = '«Hasta» no puede ser anterior a «Desde».'
  return errors
}

/** Parámetros de la descarga: el formato y SOLO los filtros que el reporte admite y tienen valor. */
export function reportQuery(report: Pick<ReportEntry, 'filters'>, format: ReportFormat, f: ReportFilters): Record<string, string> {
  const q: Record<string, string> = { format }
  for (const key of report.filters) {
    if (key === 'status') {
      if (f.status.length) q.status = f.status.join(',')
    } else if (key === 'includeInactive') {
      if (f.includeInactive) q.includeInactive = 'true'
    } else {
      const v = f[key].trim()
      if (v) q[key] = v
    }
  }
  return q
}

/** Cuántos filtros tienen valor (para «Restablecer»). */
export const activeFilters = (report: Pick<ReportEntry, 'filters'>, f: ReportFilters) => Object.keys(reportQuery(report, 'pdf', f)).length - 1

/**
 * Nombre de archivo seguro a partir de Content-Disposition: el del servidor si es ASCII sencillo
 * (letras, números, punto, guion y guion bajo) y con la extensión pedida; si no, uno genérico.
 * Nunca rutas («../», barras) ni nombres ocultos.
 */
export function safeFilename(disposition: string | null | undefined, format: ReportFormat, fallback = 'reporte'): string {
  const raw = /filename="([^"]*)"/i.exec(disposition ?? '')?.[1] ?? /filename=([^;]+)/i.exec(disposition ?? '')?.[1]?.trim() ?? ''
  const base = raw.split(/[\\/]/).pop() ?? ''
  const ok = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$/.test(base) && base.toLowerCase().endsWith(`.${format}`)
  return ok ? base : `${fallback}.${format}`
}

export type ReportErrorKind = 'forbidden' | 'not_found' | 'invalid' | 'pdf_limit' | 'too_large' | 'busy' | 'session' | 'network' | 'server'

/**
 * Error del servidor → mensaje para el organizador (nunca detalles técnicos). Los mensajes de
 * negocio del backend en español («El torneo no tiene el grupo B») sí se muestran.
 */
export function explainError(status: number | null, message: string | null): { kind: ReportErrorKind; message: string } {
  const msg = (message ?? '').trim()
  if (status === null) return { kind: 'network', message: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' }
  if (status === 401) return { kind: 'session', message: 'Tu sesión expiró. Vuelve a iniciar sesión para descargar.' }
  if (status === 403) return { kind: 'forbidden', message: 'Tu rol en este torneo no permite descargar este reporte.' }
  if (status === 404) return { kind: 'not_found', message: 'El torneo o el reporte ya no existe.' }
  if (status === 429) return { kind: 'busy', message: 'Hay otras descargas en curso. Espera unos segundos e inténtalo de nuevo.' }
  if (status === 400) {
    if (/Excel o CSV/i.test(msg)) return { kind: 'pdf_limit', message: 'El reporte es demasiado grande para un PDF. Descárgalo en Excel o CSV (con los mismos filtros) o aplica filtros para reducirlo.' }
    if (/máximo/i.test(msg)) return { kind: 'too_large', message: 'El reporte es demasiado grande. Aplica filtros (equipo, jornada o periodo) para reducirlo.' }
    // Mensajes de negocio en español sí; los que nombran parámetros (camelCase, MAYÚSCULAS) o reglas de validación, no.
    const technical = /\b(debe|must|should)\b/i.test(msg) || /[a-z][A-Z]/.test(msg) || /\b[A-Z][A-Z_]{3,}\b/.test(msg)
    if (/^(El|La|Los|Las|Hay|No)\s/.test(msg) && !technical) return { kind: 'invalid', message: msg.endsWith('.') ? msg : `${msg}.` }
    return { kind: 'invalid', message: 'Revisa los filtros: alguno no es válido para este reporte.' }
  }
  return { kind: 'server', message: 'El servidor no pudo generar el reporte. Inténtalo de nuevo en unos minutos.' }
}
