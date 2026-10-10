import type { DisciplineAction, RegistrationClosedReason, RegistrationRequestStatus, SanctionCause, SanctionStatus, RefereeRole, CollaboratorRole, TournamentRole } from '@/types'
import type { CompetitionSystem, KnockoutTiebreak, MatchStatus, PlayerPosition, PointsRule, TournamentModality, TournamentSettings, TournamentStatus } from '@/types'

export type Tone = 'neutral' | 'green' | 'lime' | 'amber' | 'red' | 'blue'

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: 'Portero',
  DEF: 'Defensa',
  MID: 'Mediocampista',
  FWD: 'Delantero',
}

export const POSITION_SHORT: Record<PlayerPosition, string> = {
  GK: 'POR',
  DEF: 'DEF',
  MID: 'MED',
  FWD: 'DEL',
}

export const POSITION_ORDER: PlayerPosition[] = ['GK', 'DEF', 'MID', 'FWD']

export const MODALITY_LABELS: Record<TournamentModality, string> = {
  F7: 'Fútbol 7',
  F11: 'Fútbol 11',
}

export const TOURNAMENT_STATUS: Record<TournamentStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  active: { label: 'En curso', tone: 'green' },
  finished: { label: 'Finalizado', tone: 'blue' },
}

/** Estado de una competición visto desde los perfiles públicos (sin jerga de administración). */
export const COMPETITION_STATUS: Record<TournamentStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Próximamente', tone: 'neutral' },
  active: { label: 'En curso', tone: 'green' },
  finished: { label: 'Finalizado', tone: 'blue' },
}

export const MATCH_STATUS: Record<MatchStatus, { label: string; tone: Tone }> = {
  scheduled: { label: 'Programado', tone: 'neutral' },
  live: { label: 'En juego', tone: 'red' },
  finished: { label: 'Finalizado', tone: 'green' },
  postponed: { label: 'Pospuesto', tone: 'amber' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

export const COMPETITION_SYSTEMS: { value: CompetitionSystem; label: string; description: string }[] = [
  { value: 'league', label: 'Liga', description: 'Todos contra todos. Campeón: el líder de la tabla final.' },
  { value: 'knockout', label: 'Eliminación directa', description: 'Llaves a partido único o ida y vuelta. Quien pierde, queda fuera.' },
  { value: 'groups_knockout', label: 'Grupos + eliminación', description: 'Liga dentro de cada grupo; los mejores pasan a llaves.' },
  { value: 'league_playoffs', label: 'Liga + playoffs', description: 'Fase regular y después playoffs con los mejores de la tabla.' },
]

export const SYSTEM_LABELS: Record<CompetitionSystem, string> = {
  league: 'Liga',
  knockout: 'Eliminación directa',
  groups_knockout: 'Grupos + eliminación',
  league_playoffs: 'Liga + playoffs',
}

export const DEFAULT_POINTS: PointsRule = { win: 3, draw: 1, loss: 0 }

export function defaultSettings(): TournamentSettings {
  return {
    system: 'league',
    points: { ...DEFAULT_POINTS },
    roundRobinLegs: 1,
    knockoutLegs: 1,
    knockoutTiebreak: 'penalties',
    finalTiebreak: null,
    reseed: false,
    groupCount: null,
    qualifiersPerGroup: null,
    playoffTeams: null,
  }
}

/** Criterios de desempate V1 (fijos). */
export const TIEBREAKERS = ['Puntos', 'Diferencia de goles', 'Goles a favor'] as const

export function pointsRuleLabel(p: PointsRule): string {
  const shootout = p.shootoutWin ? ` · Empate + penales ganados ${p.draw + p.shootoutWin}` : ''
  return `Victoria ${p.win} · Empate ${p.draw}${shootout} · Derrota ${p.loss}`
}

/** Reglas para una llave de eliminatoria igualada. */
export const KNOCKOUT_TIEBREAKS: { value: KnockoutTiebreak; label: string; description: string }[] = [
  { value: 'penalties', label: 'Penales', description: 'Empate → tanda de penales.' },
  { value: 'extra_time', label: 'Tiempos extra y penales', description: 'Empate → tiempos extra; si siguen empatados, penales.' },
  { value: 'better_position', label: 'Pasa el mejor de la tabla', description: 'Empate → avanza el mejor posicionado de la fase regular.' },
]

// ─── Inscripción por link (Etapa 7) ─────────────────────────────────────────

export const REGISTRATION_STATUS: Record<RegistrationRequestStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pendiente', tone: 'amber' },
  approved: { label: 'Aprobada', tone: 'green' },
  rejected: { label: 'Rechazada', tone: 'red' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
}

export const REGISTRATION_CLOSED: Record<RegistrationClosedReason, string> = {
  disabled: 'Las inscripciones están cerradas',
  deadline: 'Pasó la fecha límite de inscripción',
  full: 'Ya no quedan lugares',
  finished: 'El torneo terminó',
}

/** "12–20 jugadores", "Desde 12 jugadores", "Hasta 20 jugadores" o null. */
export function playersRange(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return min === max ? `${min} jugadores` : `${min}–${max} jugadores`
  if (min !== null) return `Mínimo ${min} jugadores`
  if (max !== null) return `Máximo ${max} jugadores`
  return null
}

// ─── Disciplina ─────────────────────────────────────────────────────────────

export const SANCTION_STATUS: Record<SanctionStatus, { label: string; tone: Tone }> = {
  active: { label: 'Activa', tone: 'red' },
  pending: { label: 'Pendiente', tone: 'amber' },
  served: { label: 'Cumplida', tone: 'green' },
  annulled: { label: 'Anulada', tone: 'neutral' },
}

export const SANCTION_CAUSE: Record<SanctionCause, string> = {
  accumulation: 'Acumulación de amarillas',
  direct_red: 'Roja directa',
  second_yellow: 'Doble amarilla',
  manual: 'Sanción manual',
}

export const DISCIPLINE_ACTION: Record<DisciplineAction, string> = {
  rules_updated: 'Reglamento actualizado',
  sanction_created: 'Sanción registrada',
  sanction_updated: 'Sanción corregida',
  sanction_annulled: 'Sanción anulada',
  sanction_restored: 'Sanción reactivada',
  played_while_suspended: 'Jugó estando suspendido',
}

// ─── Árbitros ───────────────────────────────────────────────────────────────

export const REFEREE_ROLES: { value: RefereeRole; label: string }[] = [
  { value: 'central', label: 'Central' },
  { value: 'assistant_1', label: 'Asistente 1' },
  { value: 'assistant_2', label: 'Asistente 2' },
  { value: 'fourth', label: 'Cuarto árbitro' },
  { value: 'scorekeeper', label: 'Anotador' },
]
export const REFEREE_ROLE: Record<RefereeRole, string> = Object.fromEntries(REFEREE_ROLES.map((r) => [r.value, r.label])) as Record<RefereeRole, string>

// ─── Colaboradores ──────────────────────────────────────────────────────────

export const COLLABORATOR_ROLES: { value: CollaboratorRole; label: string; description: string }[] = [
  { value: 'ADMIN', label: 'Administrador', description: 'Todo menos eliminar el torneo y gestionar colaboradores.' },
  { value: 'COORDINATOR', label: 'Coordinador', description: 'Calendario, partidos, cruces, canchas y árbitros.' },
  { value: 'SCORER', label: 'Anotador', description: 'Captura de resultados y estadísticas.' },
]
export const ROLE_LABEL: Record<TournamentRole, string> = { OWNER: 'Propietario', ADMIN: 'Administrador', COORDINATOR: 'Coordinador', SCORER: 'Anotador' }
