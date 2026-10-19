import type { FinanceAccountStatus, FinanceCategory, FinanceEntry, FinanceEntryKind, FinanceTotals, PaymentMethod } from '@/types'
import type { Tone } from './labels'

/**
 * Módulo 4 — textos y cálculos de finanzas para la interfaz. Los importes viajan en CENTAVOS
 * enteros; el saldo lo calcula el servidor y aquí solo se presenta (y se acumula por renglón).
 */

/** $1,500.00 MXN (sin el código con `withCode = false`, p. ej. en tarjetas donde la moneda ya se indica). */
export function formatMoney(cents: number, currency = 'MXN', withCode = true): string {
  const value = new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100)
  return withCode ? `${value} ${currency}` : value
}

/**
 * Importe escrito por el usuario → centavos enteros, sin pasar por punto flotante.
 * Acepta "1500", "1,500.50", "$1 500.5". null si está vacío, no es un número positivo o
 * trae más de 2 decimales.
 */
export function parseMoneyInput(raw: string): number | null {
  const text = raw.replace(/[$\s,]/g, '')
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(text)
  if (!m) return null
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}

/** Centavos → texto para un campo de importe ("1500.50"). */
export const centsToInput = (cents: number) => (cents / 100).toFixed(2)

export const ENTRY_KIND: Record<FinanceEntryKind, { label: string; tone: Tone; sign: 1 | -1 }> = {
  CHARGE: { label: 'Cargo', tone: 'red', sign: 1 },
  PAYMENT: { label: 'Pago', tone: 'green', sign: -1 },
  DISCOUNT: { label: 'Descuento', tone: 'lime', sign: -1 },
  REFUND: { label: 'Devolución', tone: 'blue', sign: 1 },
}

export const CATEGORY_LABEL: Record<FinanceCategory, string> = {
  ENROLLMENT: 'Inscripción',
  PLAYER_FEE: 'Cuota por jugador',
  REFEREE: 'Arbitraje',
  FINE: 'Multa',
  OTHER: 'Otro',
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
}

export const ACCOUNT_STATUS: Record<FinanceAccountStatus, { label: string; tone: Tone } | null> = {
  ENROLLED: null,
  WITHDRAWN: { label: 'Retirado', tone: 'amber' },
  NOT_ENROLLED: { label: 'Ya no inscrito', tone: 'neutral' },
}

/** Título del renglón: «Multa», «Pago», «Cargo · Inscripción»… */
export function entryTitle(e: Pick<FinanceEntry, 'kind' | 'category'>): string {
  if (e.kind === 'CHARGE') return e.category === 'FINE' ? 'Multa' : `Cargo · ${CATEGORY_LABEL[e.category ?? 'OTHER']}`
  return ENTRY_KIND[e.kind].label
}

const isVoided = (e: Pick<FinanceEntry, 'voidedAt' | 'voided'>) => Boolean(e.voidedAt || e.voided)

/** Efecto del movimiento en el saldo (centavos con signo): + aumenta el adeudo. */
export const entryEffect = (e: Pick<FinanceEntry, 'kind' | 'amount' | 'voidedAt' | 'voided'>) => (isVoided(e) ? 0 : ENTRY_KIND[e.kind].sign * e.amount)

/** Saldo acumulado tras cada movimiento, en el orden recibido (cronológico). */
export function runningBalances(entries: Pick<FinanceEntry, 'kind' | 'amount' | 'voidedAt' | 'voided'>[]): number[] {
  let balance = 0
  return entries.map((e) => (balance += entryEffect(e)))
}

/** Adeudo y saldo a favor a partir de un saldo (positivo debe, negativo a favor). */
export const totalsWithBalance = (balance: number): Pick<FinanceTotals, 'balance' | 'due' | 'credit'> => ({ balance, due: Math.max(balance, 0), credit: Math.max(-balance, 0) })

/** Estado de pago de una cuenta. */
export function paymentState(t: Pick<FinanceTotals, 'due' | 'credit'> & { entries?: number }, currency = 'MXN'): { label: string; tone: Tone } {
  if (t.due > 0) return { label: `Debe ${formatMoney(t.due, currency)}`, tone: 'red' }
  if (t.credit > 0) return { label: `Saldo a favor ${formatMoney(t.credit, currency)}`, tone: 'blue' }
  if (!t.entries) return { label: 'Sin movimientos', tone: 'neutral' }
  return { label: 'Al corriente', tone: 'green' }
}

/**
 * Lo que quedaría como saldo a favor si se registra este pago (0 si no supera el adeudo). La
 * interfaz lo usa para pedir la confirmación; el servidor lo vuelve a comprobar con el saldo real.
 */
export function creditAfterPayment(amount: number, t: Pick<FinanceTotals, 'due' | 'credit'>): number {
  return amount > t.due ? t.credit + amount - t.due : 0
}

/** Validación del formulario (la misma que aplica el servidor): mensaje por campo. */
export interface EntryForm {
  kind: FinanceEntryKind
  amount: string
  concept: string
  category: FinanceCategory
  method: PaymentMethod | ''
  reason: string
  date: string
}
export function entryFormErrors(f: EntryForm, today: string, t?: Pick<FinanceTotals, 'due' | 'credit'>): Partial<Record<keyof EntryForm, string>> {
  const errors: Partial<Record<keyof EntryForm, string>> = {}
  const cents = parseMoneyInput(f.amount)
  if (cents === null) errors.amount = 'Escribe un importe mayor que cero, con hasta 2 decimales.'
  if (f.concept.trim().length < 3) errors.concept = 'El concepto necesita al menos 3 caracteres.'
  if ((f.kind === 'PAYMENT' || f.kind === 'REFUND') && !f.method) errors.method = f.kind === 'PAYMENT' ? 'Indica el método de pago.' : 'Indica cómo se devolvió el dinero.'
  const needsReason = f.kind === 'DISCOUNT' || (f.kind === 'CHARGE' && f.category === 'FINE')
  if (needsReason && f.reason.trim().length < 3) errors.reason = 'El motivo es obligatorio (al menos 3 caracteres).'
  if (!f.date) errors.date = 'Indica la fecha.'
  else if (f.date > today) errors.date = 'La fecha no puede ser futura.'
  if (t && cents !== null) {
    if (f.kind === 'DISCOUNT' && cents > t.due) errors.amount = t.due > 0 ? 'El descuento no puede superar el adeudo pendiente.' : 'El equipo no tiene adeudo pendiente.'
    if (f.kind === 'REFUND' && cents > t.credit) errors.amount = t.credit > 0 ? 'La devolución no puede superar el saldo a favor.' : 'El equipo no tiene saldo a favor.'
  }
  return errors
}

/**
 * 5B — vínculo (partido o jugador) de un movimiento que se corrige y que ya no aparece entre las
 * opciones disponibles: se ofrece conservarlo tal cual (el servidor lo acepta sin revalidarlo).
 */
export function keptLink(original: string | null | undefined, available: { id: string }[]): string | null {
  return original && !available.some((o) => o.id === original) ? original : null
}
