import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 4D: saldo de la cuenta sin el movimiento que se corrige, y efecto de anulados/correcciones.
let server, f
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  f = await server.ssrLoadModule('/src/utils/finance.ts')
})
after(async () => server?.close())

test('cuenta sin el original (corrección): adeudo y saldo a favor a partir del saldo', () => {
  // Debe 1000 con un pago de 400 → sin ese pago debería 1400.
  const balance = 600
  const original = { kind: 'PAYMENT', amount: 400 }
  assert.deepEqual(f.totalsWithBalance(balance - f.entryEffect(original)), { balance: 1000, due: 1000, credit: 0 })
  assert.deepEqual(f.totalsWithBalance(-250), { balance: -250, due: 0, credit: 250 })
  // Un movimiento anulado no cambia nada.
  assert.equal(f.entryEffect({ kind: 'CHARGE', amount: 500, voidedAt: '2026-10-18T00:00:00Z' }), 0)
  assert.equal(f.entryEffect({ kind: 'REFUND', amount: 500, voided: true }), 0)
})

test('validación de una corrección contra la cuenta sin el original', () => {
  const today = '2026-10-18'
  const form = { kind: 'DISCOUNT', amount: '900', concept: 'Beca', category: 'OTHER', method: '', reason: 'Beca', date: today }
  // Cargo 1000 y descuento 100: corrigiendo el descuento, el tope es 1000 (no 900).
  assert.deepEqual(f.entryFormErrors(form, today, f.totalsWithBalance(900 * 100 + 100 * 100 - 0)), {})
  assert.ok(f.entryFormErrors({ ...form, amount: '1000.01' }, today, f.totalsWithBalance(100000)).amount)
})

test('saldo acumulado de una página = saldo inicial + movimientos de la página', () => {
  const page = [{ kind: 'PAYMENT', amount: 300 }, { kind: 'CHARGE', amount: 100, voidedAt: 'x' }, { kind: 'REFUND', amount: 50 }]
  const opening = 1000
  assert.deepEqual(f.runningBalances(page).map((b) => b + opening), [700, 700, 750])
})
