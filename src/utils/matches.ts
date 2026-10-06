import type { Match } from '@/types'

/** Fecha y hora del partido como Date local. */
export function kickoff(match: Pick<Match, 'date' | 'time'>): Date {
  return new Date(`${match.date}T${match.time}`)
}

/** En juego, o programado cuya hora ya pasó: está esperando que el organizador capture el resultado. */
export function isPendingCapture(match: Match, now = new Date()): boolean {
  return match.status === 'live' || (match.status === 'scheduled' && kickoff(match) < now)
}

/** Programado y todavía por jugarse. */
export function isUpcoming(match: Match, now = new Date()): boolean {
  return match.status === 'scheduled' && kickoff(match) >= now
}

/** Todavía por jugarse (o jugándose): cuenta como pendiente al cerrar un torneo. */
export function isOpen(match: Match): boolean {
  return match.status === 'scheduled' || match.status === 'live' || match.status === 'postponed'
}

/** Ya tiene marcador o estadísticas: no puede borrarse al regenerar el calendario. */
export function hasResult(match: Match): boolean {
  return match.status === 'finished' || match.status === 'live' || match.homeScore !== null || match.awayScore !== null
}
