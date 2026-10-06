import { formatDate } from '@/utils/format'

export { COMPETITION_STATUS } from '@/utils/labels'

/** "16 ene 2027 – Actualidad" / "7 nov 2026 – 12 dic 2026". */
export function stintPeriod(start: string | null, end: string | null): string {
  if (!start) return ''
  return `${formatDate(start)} – ${end ? formatDate(end) : 'Actualidad'}`
}
