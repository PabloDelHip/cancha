import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 3A: la captura y la ficha listan a quien es elegible en la fecha del partido (misma regla que el servidor).
let server, belongsOn
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  ;({ belongsOn } = await server.ssrLoadModule('/src/utils/players.ts'))
})
after(async () => server?.close())

test('desde 3A: solo dentro del periodo efectivo (inscripción tardía no habilita partidos anteriores)', () => {
  const m = { status: 'active', startDate: '2027-02-01', endDate: null, registeredAt: '2027-02-01' }
  assert.equal(belongsOn(m, '2027-01-31'), false)
  assert.equal(belongsOn(m, '2027-02-01'), true)
  assert.equal(belongsOn({ ...m, startDate: '2027-01-10' }, '2027-01-10'), true) // retroactiva
  assert.equal(belongsOn({ status: 'ended', startDate: '2027-01-01', endDate: '2027-01-31', registeredAt: '2027-01-01' }, '2027-02-01'), false)
})

test('anteriores a 3A (sin registeredAt): activa vale en cualquier fecha', () => {
  assert.equal(belongsOn({ status: 'active', startDate: '2027-02-01', endDate: null }, '2026-01-01'), true)
  assert.equal(belongsOn({ status: 'active', startDate: '2027-02-01', endDate: null, registeredAt: null }, '2026-01-01'), true)
})
