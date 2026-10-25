import type { ClosurePreview, ID, TournamentTeam } from '@/types'

/**
 * 10B — decisiones de la interfaz de cierre y temporadas (puras, probadas en test/closure-10b).
 * Las reglas viven en el servidor (closure.ts del backend): aquí solo se decide qué pedir al usuario.
 */

/** Qué exige el diálogo de cierre según la vista previa. */
export function closureConfirmation(p: ClosurePreview) {
  return {
    /** Con bloqueantes no se ofrece «Finalizar». */
    blocked: !p.canFinish,
    /** Siempre una confirmación explícita (acción irreversible); con advertencias, sobre ellas. */
    label: p.warnings.length ? 'Revisé las advertencias y quiero finalizar el torneo de todos modos.' : 'Entiendo que el torneo quedará cerrado y no podrá reabrirse.',
    /** El servidor exige `allowPendingMatches` solo si quedan partidos sin jugar. */
    allowPendingMatches: p.requiresConfirmation,
  }
}

/** Equipos marcados al abrir «Crear siguiente temporada»: los que no se retiraron. */
export function continuingTeams(enrollments: TournamentTeam[], tournamentId: ID): ID[] {
  return enrollments.filter((e) => e.tournamentId === tournamentId && !e.withdrawnAt).map((e) => e.teamId)
}

/** Errores del formulario de nueva temporada (los mismos límites que valida el servidor). */
export function nextSeasonErrors(form: { name: string; startDate: string; endDate: string }, teams: number, maxTeams: number | null) {
  return {
    name: !form.name.trim() ? 'Escribe el nombre de la nueva temporada.' : form.name.trim().length > 120 ? 'Máximo 120 caracteres.' : null,
    startDate: !form.startDate ? 'Indica la fecha de inicio.' : null,
    endDate: form.endDate && form.startDate && form.endDate < form.startDate ? 'La fecha de fin no puede ser anterior a la de inicio.' : null,
    teams: maxTeams && teams > maxTeams ? `El torneo admite hasta ${maxTeams} equipos.` : null,
  }
}
