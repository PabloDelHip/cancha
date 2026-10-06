import type { ISODate } from '@/types'

const LOCALE = 'es-MX'

/** Parsea `YYYY-MM-DD` como fecha local (evita desfases por zona horaria). */
export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(value: ISODate | null | undefined, style: 'short' | 'long' = 'short'): string {
  if (!value) return '—'
  const options: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
  return parseISODate(value).toLocaleDateString(LOCALE, options)
}

/** "sáb 16 ene" */
export function formatMatchDay(value: ISODate): string {
  return parseISODate(value)
    .toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
}

export function formatDateRange(start: ISODate, end: ISODate | null): string {
  return end ? `${formatDate(start)} – ${formatDate(end)}` : `Desde ${formatDate(start)}`
}

export function ageFrom(birthDate: ISODate | null, now = new Date()): number | null {
  if (!birthDate) return null
  const b = parseISODate(birthDate)
  let age = now.getFullYear() - b.getFullYear()
  const beforeBirthday =
    now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  if (beforeBirthday) age--
  return age
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
