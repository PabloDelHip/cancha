import type { MatchLog, MatchLogEntry, MatchStatus, RefereeRole } from '@/types'
import { MATCH_STATUS, REFEREE_ROLE } from './labels'
import { formatDate } from './format'

/**
 * Texto legible de una entrada del historial: un titular y el detalle de cada cambio. El
 * servidor guarda ids y enums; aquí se traducen con los nombres que trae `refs`.
 */
const CAUSE: Record<NonNullable<MatchLogEntry['cause']>, string> = {
  MANUAL: 'eliminado por el organizador',
  SCHEDULE_REGENERATED: 'se regeneró el calendario',
  FORMAT_CHANGED: 'cambió el formato del torneo',
  TIE_REMOVED: 'se quitó el cruce',
  BRACKET_SYNC: 'el cuadro de eliminatoria ya no lo necesita',
}

export function describeEntry(e: MatchLogEntry, refs: MatchLog['refs']) {
  const team = (id: unknown) => (typeof id === 'string' ? (refs.teams[id] ?? 'Equipo') : '—')
  const ref = (id: unknown) => (typeof id === 'string' ? (refs.referees[id] ?? 'Árbitro') : '—')
  const status = (s: unknown) => (typeof s === 'string' ? (MATCH_STATUS[s.toLowerCase() as MatchStatus]?.label ?? s) : '—')
  const role = (r: unknown) => (typeof r === 'string' ? (REFEREE_ROLE[r.toLowerCase() as RefereeRole] ?? r) : '')
  const c = e.changes ?? {}
  const when = (side: 'from' | 'to') => {
    const date = (c.date?.[side] ?? null) as string | null
    const time = (c.time?.[side] ?? null) as string | null
    return [date ? formatDate(date) : null, time].filter(Boolean).join(' ')
  }
  const score = (side: 'from' | 'to') => `${c.homeScore?.[side] ?? '–'}–${c.awayScore?.[side] ?? '–'}`
  const released = (e.released ?? []).flatMap((r) => [r.venue ? `cancha ${r.venue}` : null, ...r.referees.map((x) => `${ref(x.refereeId)} (${role(x.role)})`)].filter(Boolean))

  const titles: Record<MatchLogEntry['action'], () => string> = {
    CREATED: () => `Partido programado para el ${formatDate(String(e.snapshot?.date))} a las ${e.snapshot?.time}`,
    RESCHEDULED: () => `Reprogramado: ${when('from') || 'sin fecha'} → ${when('to')}`,
    STATUS_CHANGED: () => `Estado: ${status(c.status?.from)} → ${status(c.status?.to)}`,
    FIELD_CHANGED: () => `Cancha: ${(c.venue?.from as string) ?? 'sin cancha'} → ${(c.venue?.to as string) ?? 'sin cancha'}`,
    TEAMS_CHANGED: () => (e.source === 'SYSTEM' ? 'El cuadro de eliminatoria actualizó los equipos del cruce' : 'Equipos cambiados'),
    UPDATED: () => 'Datos del partido actualizados',
    RESULT_CAPTURED: () => `Resultado capturado: ${score('to')}${c.status ? ` (${status(c.status.to)})` : ''}`,
    RESULT_CORRECTED: () => (c.homeScore || c.awayScore ? `Resultado corregido: ${score('from')} → ${score('to')}` : `Resultado: ${status(c.status?.from)} → ${status(c.status?.to)}`),
    REFEREE_ASSIGNED: () => {
      const to = c.referee?.to as { refereeId: string; role: string }
      return `Árbitro asignado: ${ref(to?.refereeId)} (${role(to?.role)})`
    },
    REFEREE_REMOVED: () => {
      const from = c.referee?.from as { refereeId: string; role: string }
      return `Árbitro quitado: ${ref(from?.refereeId)} (${role(from?.role)})`
    },
    REFEREE_ABSENT: () => {
      const from = c.referee?.from as { refereeId: string; role: string }
      const sub = c.substitute?.to as { refereeId: string } | undefined
      return `${ref(from?.refereeId)} no se presentó (${role(from?.role)})${sub ? `; lo sustituye ${ref(sub.refereeId)}` : ''}`
    },
    DELETED: () => `Partido eliminado: ${e.cause ? CAUSE[e.cause] : ''}`,
    SCHEDULE_REPLACED: () => `Calendario reemplazado (${e.cause ? CAUSE[e.cause] : ''}): ${e.deleted?.length ?? 0} partidos eliminados`,
  }

  const details: string[] = []
  if (e.action === 'RESCHEDULED' && c.status) details.push(`Estado: ${status(c.status.from)} → ${status(c.status.to)}`)
  if (e.action !== 'FIELD_CHANGED' && c.venue) details.push(`Cancha: ${(c.venue.from as string) ?? 'sin cancha'} → ${(c.venue.to as string) ?? 'sin cancha'}`)
  if (c.round) details.push(`Jornada ${c.round.from} → ${c.round.to}`)
  if (c.homeTeamId) details.push(`Local: ${team(c.homeTeamId.from)} → ${team(c.homeTeamId.to)}`)
  if (c.awayTeamId) details.push(`Visitante: ${team(c.awayTeamId.from)} → ${team(c.awayTeamId.to)}`)
  if (e.action === 'DELETED' && e.snapshot) {
    details.push(`${team(e.snapshot.homeTeamId)} vs ${team(e.snapshot.awayTeamId)} · ${formatDate(String(e.snapshot.date))} ${e.snapshot.time} · ${status(e.snapshot.status)}`)
  }
  if (released.length) details.push(`Se liberó: ${released.join(', ')}`)

  return { title: titles[e.action](), details, system: e.source === 'SYSTEM', by: refs.users[e.actorId] ?? null }
}
