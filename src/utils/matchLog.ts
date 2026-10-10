import type { EvidenceKind, IncidentType, MatchLog, MatchLogEntry, MatchStatus, RefereeRole, SuspensionDecision } from '@/types'
import { EVIDENCE_KIND, INCIDENT_TYPE, MATCH_STATUS, REFEREE_ROLE, SUSPENSION_DECISION } from './labels'
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
    REFEREE_CORRECTED: () => {
      const absence = c.absence?.from as { refereeId: string; role: string } | undefined
      const voided = c.voided?.from as { refereeId: string; role: string } | undefined
      const sub = c.substitute?.to as { refereeId: string } | undefined
      const parts = [
        absence ? `se anuló la ausencia de ${ref(absence.refereeId)} (${role(absence.role)})` : null,
        voided ? `se anuló la sustitución de ${ref(voided.refereeId)}` : null,
        sub ? `sustituto correcto: ${ref(sub.refereeId)}` : null,
      ].filter(Boolean)
      return `Corrección arbitral: ${parts.join('; ')}`
    },
    INCIDENT_REPORTED: () => {
      const inc = c.incident?.to as { type: IncidentType; description: string } | undefined
      return `${inc?.type === 'SUSPENSION' ? 'Partido suspendido' : `Incidencia: ${INCIDENT_TYPE[inc?.type ?? 'OTHER']}`}${inc?.description ? ` · ${inc.description}` : ''}`
    },
    INCIDENT_RESOLVED: () => `Incidencia resuelta (${INCIDENT_TYPE[(c.incident?.to as { type: IncidentType } | undefined)?.type ?? 'OTHER']})`,
    INCIDENT_VOIDED: () => {
      const type = (c.incident?.to as { type: IncidentType } | undefined)?.type ?? 'OTHER'
      return type === 'SUSPENSION' ? 'Suspensión anulada (registrada por error)' : `Incidencia anulada (${INCIDENT_TYPE[type]})`
    },
    SUSPENSION_RESOLVED: () => `Suspensión: ${SUSPENSION_DECISION[c.decision?.to as SuspensionDecision] ?? 'decisión tomada'}`,
    SHEET_LINEUP_SAVED: () => {
      const to = c.lineup?.to as { teamId: string; players: unknown[]; substitutions: unknown[] } | undefined
      const corrected = c.lineup?.from ? 'corregida' : 'registrada'
      return `Alineación ${corrected}${to ? ` de ${team(to.teamId)}: ${to.players.length} jugadores, ${to.substitutions.length} sustituciones` : ''}`
    },
    SHEET_OBSERVATIONS_SAVED: () => (c.observations?.to ? 'Observaciones del partido actualizadas' : 'Observaciones del partido borradas'),
    SHEET_CLOSED: () => {
      const score = c.score?.to as { home: number; away: number } | undefined
      return `Ficha técnica cerrada${score ? ` con ${score.home}–${score.away}` : ''}`
    },
    SHEET_REOPENED: () => 'Ficha técnica reabierta',
    EVIDENCE_ADDED: () => `Fotografía agregada: ${EVIDENCE_KIND[(c.evidence?.to as { kind: EvidenceKind } | undefined)?.kind ?? 'OTHER']}`,
    EVIDENCE_REMOVED: () => `Fotografía retirada: ${EVIDENCE_KIND[(c.evidence?.to as { kind: EvidenceKind } | undefined)?.kind ?? 'OTHER']}`,
    DELETED: () => `Partido eliminado: ${e.cause ? CAUSE[e.cause] : ''}`,
    SCHEDULE_REPLACED: () => `Calendario reemplazado (${e.cause ? CAUSE[e.cause] : ''}): ${e.deleted?.length ?? 0} partidos eliminados`,
  }

  const details: string[] = []
  if ((e.action === 'SUSPENSION_RESOLVED' || e.action === 'INCIDENT_VOIDED') && c.status) details.push(`Estado: ${status(c.status.from)} → ${status(c.status.to)}`)
  if (e.action === 'SUSPENSION_RESOLVED' && (c.date || c.time)) details.push(`Nueva fecha: ${when('to')}`)
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
