import type { SchedulingRules, SoftRule, TeamSchedulingRules, TeamTimeRange } from '@/types'

/**
 * Restricciones de calendario (6A): etiquetas y resúmenes para la interfaz. Días 0 = domingo … 6 =
 * sábado (como el servidor y las canchas); en pantalla la semana empieza en lunes.
 */
export const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const
export const WEEKDAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

/** Zonas de México (la de las ligas por defecto es Cancún). */
export const TIME_ZONES: { value: string; label: string }[] = [
  { value: 'America/Cancun', label: 'Cancún (Quintana Roo)' },
  { value: 'America/Mexico_City', label: 'Centro (CDMX, Guadalajara, Monterrey)' },
  { value: 'America/Mazatlan', label: 'Pacífico (Sinaloa, Nayarit, BCS)' },
  { value: 'America/Hermosillo', label: 'Sonora' },
  { value: 'America/Chihuahua', label: 'Chihuahua' },
  { value: 'America/Ciudad_Juarez', label: 'Ciudad Juárez' },
  { value: 'America/Tijuana', label: 'Noroeste (Baja California)' },
]
export const timeZoneLabel = (tz: string) => TIME_ZONES.find((z) => z.value === tz)?.label ?? tz

export const emptyTeamRules = (): TeamSchedulingRules => ({
  unavailableDays: [],
  unavailableDates: [],
  unavailableTimes: [],
  minRestHours: null,
  maxMatchesPerDay: null,
  strict: true,
  notes: null,
})

/** Días ordenados de lunes a domingo, en texto ("lun, mié y sáb"). */
export function daysText(days: number[], long = false) {
  const names = WEEK_ORDER.filter((d) => days.includes(d)).map((d) => (long ? WEEKDAY_LONG[d] : WEEKDAY_SHORT[d].toLowerCase()))
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : (names[0] ?? '')
}

export const rangeText = (r: TeamTimeRange) => `${r.day === null ? 'a diario' : WEEKDAY_SHORT[r.day].toLowerCase()} ${r.from}–${r.to}`

/** Resumen corto de las reglas de un equipo (chips de la lista). Vacío = sin restricciones. */
export function teamRulesSummary(r: TeamSchedulingRules): string[] {
  const out: string[] = []
  if (r.unavailableDays.length) out.push(`No juega ${daysText(r.unavailableDays)}`)
  if (r.unavailableDates.length) out.push(r.unavailableDates.length === 1 ? '1 fecha bloqueada' : `${r.unavailableDates.length} fechas bloqueadas`)
  for (const t of r.unavailableTimes) out.push(`No juega ${rangeText(t)}`)
  if (r.minRestHours) out.push(`Descanso ${r.minRestHours} h`)
  if (r.maxMatchesPerDay) out.push(`Máx. ${r.maxMatchesPerDay} por día`)
  return out
}

/** Resumen de las reglas del torneo (una línea por regla configurada). */
export function tournamentRulesSummary(r: SchedulingRules, duration: number): string[] {
  const out: string[] = []
  out.push(r.days.length ? `Días: ${daysText(r.days, true)}` : 'Cualquier día')
  if (r.startTime || r.endTime) out.push(`Horario: ${r.startTime ?? 'sin inicio'} a ${r.endTime ?? 'sin fin'}`)
  out.push(`Partidos de ${duration} min`)
  if (r.fieldGapMinutes) out.push(`${r.fieldGapMinutes} min entre partidos de una cancha`)
  if (r.maxMatchesPerDay) out.push(`Máximo ${r.maxMatchesPerDay} por día`)
  if (r.maxSimultaneous) out.push(`Máximo ${r.maxSimultaneous} a la vez`)
  if (r.fieldAvailability === 'BLOCK') out.push('Disponibilidad de canchas obligatoria')
  const soft = SOFT_RULE_OPTIONS.filter((o) => r.softRules?.includes(o.value)).map((o) => o.label.toLowerCase())
  if (soft.length) out.push(`Como preferencia: ${soft.join(', ')}`)
  return out
}

/** 6B: reglas generales que pueden ser preferencia (avisan, no bloquean). */
export const SOFT_RULE_OPTIONS: { value: SoftRule; label: string }[] = [
  { value: 'DAYS', label: 'Días' },
  { value: 'HOURS', label: 'Horario' },
  { value: 'DAILY_LIMIT', label: 'Máximo por día' },
]

const RULE_LABEL: Record<string, string> = {
  timeZone: 'zona horaria',
  days: 'días',
  startTime: 'inicio',
  endTime: 'fin',
  fieldGapMinutes: 'separación en cancha',
  maxMatchesPerDay: 'máximo por día',
  maxSimultaneous: 'simultáneos',
  fieldAvailability: 'disponibilidad de canchas',
  softRules: 'preferencias',
  durationMinutes: 'duración',
}

/** Detalle de una entrada del historial: qué reglas cambiaron y a qué valor. */
export function ruleChangeText(key: string, to: unknown): string {
  const label = RULE_LABEL[key] ?? key
  if (to === null || (Array.isArray(to) && !to.length)) return `${label}: sin restricción`
  if (key === 'days') return `${label}: ${daysText(to as number[])}`
  if (key === 'fieldAvailability') return `${label}: ${to === 'BLOCK' ? 'obligatoria' : 'solo aviso'}`
  if (key === 'timeZone') return `${label}: ${timeZoneLabel(String(to))}`
  if (key === 'fieldGapMinutes' || key === 'durationMinutes') return `${label}: ${to} min`
  if (key === 'softRules') return `${label}: ${SOFT_RULE_OPTIONS.filter((o) => (to as string[]).includes(o.value)).map((o) => o.label.toLowerCase()).join(', ')}`
  return `${label}: ${String(to)}`
}
