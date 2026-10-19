import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 4C: importes, saldo acumulado, estado de pago, saldo a favor y validación de los formularios de finanzas.
let server, f
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  f = await server.ssrLoadModule('/src/utils/finance.ts')
})
after(async () => server?.close())

test('importe escrito → centavos exactos; rechaza vacío, cero, negativos y más de 2 decimales', () => {
  assert.equal(f.parseMoneyInput('1500'), 150000)
  assert.equal(f.parseMoneyInput('1,500.50'), 150050)
  assert.equal(f.parseMoneyInput('$1 500.5'), 150050)
  assert.equal(f.parseMoneyInput('0.1'), 10)
  assert.equal(f.parseMoneyInput('19.99'), 1999)
  for (const bad of ['', '0', '0.00', '-5', '1.234', 'abc', '1.2.3', '1e3']) assert.equal(f.parseMoneyInput(bad), null, bad)
  assert.equal(f.centsToInput(150050), '1500.50')
  assert.match(f.formatMoney(150050, 'MXN'), /^\$1,500\.50 MXN$/)
})

test('saldo acumulado cronológico: cargos y devoluciones suben, pagos y descuentos bajan; anulados no cuentan', () => {
  const entries = [
    { kind: 'CHARGE', amount: 1000 },
    { kind: 'DISCOUNT', amount: 200 },
    { kind: 'PAYMENT', amount: 1300 }, // excedente → saldo a favor
    { kind: 'REFUND', amount: 100 },
    { kind: 'CHARGE', amount: 500, voidedAt: '2026-01-01' },
  ]
  assert.deepEqual(f.runningBalances(entries), [1000, 800, -500, -400, -400])
  assert.equal(f.entryTitle({ kind: 'CHARGE', category: 'FINE' }), 'Multa')
  assert.equal(f.entryTitle({ kind: 'CHARGE', category: 'ENROLLMENT' }), 'Cargo · Inscripción')
  assert.equal(f.entryTitle({ kind: 'REFUND', category: null }), 'Devolución')
})

test('estado de pago y saldo a favor que dejaría un pago', () => {
  assert.equal(f.paymentState({ due: 150000, credit: 0, entries: 1 }).label, 'Debe $1,500.00 MXN')
  assert.equal(f.paymentState({ due: 0, credit: 500, entries: 2 }).tone, 'blue')
  assert.equal(f.paymentState({ due: 0, credit: 0, entries: 3 }).label, 'Al corriente')
  assert.equal(f.paymentState({ due: 0, credit: 0, entries: 0 }).label, 'Sin movimientos')
  assert.equal(f.creditAfterPayment(1000, { due: 1500, credit: 0 }), 0)
  assert.equal(f.creditAfterPayment(1500, { due: 1500, credit: 0 }), 0)
  assert.equal(f.creditAfterPayment(2000, { due: 1500, credit: 0 }), 500)
  assert.equal(f.creditAfterPayment(100, { due: 0, credit: 300 }), 400)
})

test('validación de formularios: las mismas reglas que el servidor', () => {
  const base = { kind: 'CHARGE', amount: '100', concept: 'Arbitraje', category: 'OTHER', method: '', reason: '', date: '2026-10-18' }
  const today = '2026-10-18'
  assert.deepEqual(f.entryFormErrors(base, today), {})
  assert.ok(f.entryFormErrors({ ...base, amount: '0' }, today).amount)
  assert.ok(f.entryFormErrors({ ...base, concept: 'ab' }, today).concept)
  assert.ok(f.entryFormErrors({ ...base, date: '2026-10-19' }, today).date)
  assert.ok(f.entryFormErrors({ ...base, category: 'FINE' }, today).reason)
  assert.ok(f.entryFormErrors({ ...base, kind: 'DISCOUNT' }, today).reason)
  assert.match(f.entryFormErrors({ ...base, kind: 'PAYMENT' }, today).method, /método de pago/)
  assert.match(f.entryFormErrors({ ...base, kind: 'REFUND' }, today).method, /devolvió/)
  // Topes con el saldo conocido: descuento ≤ adeudo, devolución ≤ saldo a favor; el pago excedente no es error (se confirma).
  const totals = { due: 5000, credit: 0 }
  assert.match(f.entryFormErrors({ ...base, kind: 'DISCOUNT', reason: 'Beca', amount: '50.01' }, today, totals).amount, /adeudo/)
  assert.deepEqual(f.entryFormErrors({ ...base, kind: 'DISCOUNT', reason: 'Beca', amount: '50' }, today, totals), {})
  assert.match(f.entryFormErrors({ ...base, kind: 'REFUND', method: 'CASH', amount: '1' }, today, totals).amount, /saldo a favor/)
  assert.deepEqual(f.entryFormErrors({ ...base, kind: 'PAYMENT', method: 'CASH', amount: '999' }, today, totals), {})
})
