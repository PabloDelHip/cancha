import type { TournamentInformation, TournamentRegistrationInfo } from '@/types'

export function informationProblems(info: TournamentInformation, registration: TournamentRegistrationInfo): string[] {
  const errors: string[] = []
  if (info.enrollment.opensOn && registration.deadline && info.enrollment.opensOn > registration.deadline) errors.push('La apertura de inscripciones debe ser anterior o igual a la fecha límite.')
  const times = [info.schedule.startTime, info.schedule.endTime]
  if (times.some((t) => t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) errors.push('Usa horarios válidos en formato HH:mm.')
  if (times[0] && times[1] && times[1] <= times[0]) errors.push('La hora habitual de término debe ser posterior a la de inicio.')
  const amounts = [info.enrollment.teamFee, info.enrollment.playerFee, info.costs.refereeFee, info.costs.venueFee, info.costs.adminFee]
  if (amounts.some((n) => n !== null && (!Number.isFinite(n) || n < 0 || n > 1000000000 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001))) errors.push('Los importes deben ser números no negativos, con hasta dos decimales.')
  if (!/^[A-Z]{3}$/.test(info.costs.currency)) errors.push('Usa una moneda de tres letras, por ejemplo MXN.')
  if (info.schedule.durationMinutes !== null && (!Number.isInteger(info.schedule.durationMinutes) || info.schedule.durationMinutes < 1 || info.schedule.durationMinutes > 1440)) errors.push('La duración debe ser un número entero entre 1 y 1440 minutos.')
  if (registration.maxTeams !== null && (!Number.isInteger(registration.maxTeams) || registration.maxTeams < 2 || registration.maxTeams > 128)) errors.push('El cupo debe ser un número entero entre 2 y 128 equipos.')
  if (info.enrollment.paymentMode === 'free' && amounts.slice(0, 2).some((n) => n !== null && n > 0)) errors.push('Una inscripción gratuita no puede tener cuotas de inscripción.')
  if (info.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.contact.email)) errors.push('Escribe un correo electrónico válido.')
  if (info.contact.phone && !/^[+()\d .-]{7,30}$/.test(info.contact.phone)) errors.push('Escribe un teléfono válido, con código de país si corresponde.')
  for (const value of [info.contact.facebook, info.contact.instagram]) {
    if (!value) continue
    try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error() } catch { errors.push('Las redes sociales deben ser URLs completas que comiencen con https:// o http://.') }
  }
  return errors
}
