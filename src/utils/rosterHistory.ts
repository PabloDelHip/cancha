import type { RosterEvent, RosterEventAction, RosterHistoryPage } from '@/types'
import { ROLE_LABEL } from '@/utils/labels'
import { formatDate } from '@/utils/format'

/** 3E — textos del historial de plantillas. El servidor deriva los eventos; aquí solo se nombran. */
export const ROSTER_ACTION_LABEL: Record<RosterEventAction, string> = {
  REGISTERED: 'Alta',
  REJOINED: 'Reincorporación',
  TRANSFER: 'Cambio de equipo',
  TRANSFER_ANNULLED: 'Cambio anulado',
  UNREGISTERED: 'Baja',
  EXCEPTION: 'Excepción',
  JERSEY_CHANGED: 'Cambio de dorsal',
  BLOCKED: 'Bloqueo',
  UNBLOCKED: 'Desbloqueo',
  TEAM_WITHDRAWN: 'Equipo retirado',
  TEAM_REINSTATED: 'Equipo reincorporado',
  TEAM_REMOVED: 'Equipo quitado del torneo',
}

/** Opciones del filtro por acción (cada una puede agrupar varias). */
export const ROSTER_ACTION_FILTERS: { value: string; label: string; actions: RosterEventAction[] }[] = [
  { value: 'registrations', label: 'Altas y reincorporaciones', actions: ['REGISTERED', 'REJOINED'] },
  { value: 'transfers', label: 'Cambios de equipo y anulaciones', actions: ['TRANSFER', 'TRANSFER_ANNULLED'] },
  { value: 'unregistered', label: 'Bajas', actions: ['UNREGISTERED'] },
  { value: 'exceptions', label: 'Excepciones', actions: ['EXCEPTION'] },
  { value: 'jersey', label: 'Dorsales', actions: ['JERSEY_CHANGED'] },
  { value: 'blocks', label: 'Bloqueos y desbloqueos', actions: ['BLOCKED', 'UNBLOCKED'] },
  { value: 'teams', label: 'Retiros y equipos quitados', actions: ['TEAM_WITHDRAWN', 'TEAM_REINSTATED', 'TEAM_REMOVED'] },
]

const EXCEPTION_LABEL = {
  RETROACTIVE: 'Elegibilidad retroactiva',
  OVER_LIMIT: 'Por encima del máximo de jugadores',
  KNOCKOUT: 'Cambio con la eliminatoria iniciada',
  SAME_DATE: 'Dos equipos en la misma fecha deportiva',
} as const

type Refs = RosterHistoryPage['refs']
const team = (refs: Refs, id: string | null) => (id ? (refs.teams[id] ?? 'Equipo eliminado') : null)
const jersey = (v: unknown) => (v === null || v === undefined ? 'sin dorsal' : `#${v}`)

/** Título del evento: la acción y, si aplica, el tipo de excepción. */
export function eventTitle(e: RosterEvent): string {
  if (e.action === 'EXCEPTION' && e.details.kind) return `Excepción: ${EXCEPTION_LABEL[e.details.kind].toLowerCase()}`
  if (e.legacy && e.action === 'UNREGISTERED') return 'Fin de participación'
  return ROSTER_ACTION_LABEL[e.action]
}

/** Qué pasó, en una línea: equipos, fechas efectivas, dorsales, partidos cancelados… */
export function eventSummary(e: RosterEvent, refs: Refs): string {
  const to = team(refs, e.teamId)
  const from = team(refs, e.fromTeamId)
  const d = e.details
  switch (e.action) {
    case 'REGISTERED':
    case 'REJOINED':
      return [to, `elegible desde el ${formatDate(e.date)}`, d.viaRequest && 'por inscripción con enlace'].filter(Boolean).join(' · ')
    case 'TRANSFER':
      return [`${from ?? '—'} → ${to ?? '—'}`, `desde el ${formatDate(e.date)}`, d.afterUnregister && 'después de una baja'].filter(Boolean).join(' · ')
    case 'TRANSFER_ANNULLED':
      return [`Vuelve a ${to ?? '—'} (se anula el cambio a ${from ?? '—'})`, d.jerseyCleared != null && `el #${d.jerseyCleared} estaba ocupado`].filter(Boolean).join(' · ')
    case 'UNREGISTERED':
      return [to, `hasta el ${formatDate(e.date)}`, d.teamWithdrawn && 'por el retiro del equipo'].filter(Boolean).join(' · ')
    case 'EXCEPTION':
      if (d.kind === 'RETROACTIVE') return [to, `elegible desde el ${formatDate(String(d.to))}`].filter(Boolean).join(' · ')
      if (d.kind === 'OVER_LIMIT') return [to, `máximo ${d.max}, ya tenía ${d.count}`].filter(Boolean).join(' · ')
      return to ?? ''
    case 'JERSEY_CHANGED':
      return [to, `${jersey(d.from)} → ${jersey(d.to)}`].filter(Boolean).join(' · ')
    case 'BLOCKED':
      return [to, `desde el ${formatDate(e.date)}`, d.retroactive && 'fecha retroactiva'].filter(Boolean).join(' · ')
    case 'UNBLOCKED':
      return [to, `habilitado desde el ${formatDate(e.date)}`, d.retroactive && 'fecha retroactiva'].filter(Boolean).join(' · ')
    case 'TEAM_WITHDRAWN':
      return `${to} · ${d.cancelledMatches ?? 0} partidos pendientes cancelados · ${d.closedMemberships ?? 0} jugadores dados de baja`
    case 'TEAM_REINSTATED':
      return to ?? ''
    case 'TEAM_REMOVED':
      return `${to} · no había jugado; ${d.memberships ?? 0} participaciones guardadas en este historial`
  }
}

/** Quién y con qué rol; nunca se inventa un autor para lo anterior a 3A. */
export function eventAuthor(e: RosterEvent, refs: Refs): string {
  if (!e.by) return 'Sin registro de autor'
  const name = refs.users[e.by.userId] ?? 'Usuario'
  const role = e.by.role === 'TEAM' ? 'equipo' : e.by.role === 'REQUEST' ? 'aprobó la solicitud' : e.by.role ? ROLE_LABEL[e.by.role as keyof typeof ROLE_LABEL]?.toLowerCase() : null
  return role ? `${name} (${role})` : name
}

/** Marcas del evento (anulado, de un equipo quitado, registro anterior). */
export function eventTags(e: RosterEvent): string[] {
  return [e.details.annulled && 'Anulado después', e.details.removedTeam && 'Equipo quitado', e.legacy && 'Registro anterior'].filter((x): x is string => Boolean(x))
}
