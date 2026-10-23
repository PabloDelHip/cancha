import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 6C: «por programar» se distingue de «pospuesto»; los datos anteriores (sin el campo) no cambian.
let server, labels, mappers
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  labels = await server.ssrLoadModule('/src/utils/labels.ts')
  mappers = await server.ssrLoadModule('/src/services/mappers.ts')
})
after(async () => server?.close())

test('etiqueta: por programar, pospuesto y programado', () => {
  assert.deepEqual(labels.matchStatusBadge({ status: 'postponed', pendingSchedule: true }), { label: 'Por programar', tone: 'amber' })
  assert.equal(labels.matchStatusBadge({ status: 'postponed', pendingSchedule: false }).label, 'Pospuesto')
  assert.equal(labels.matchStatusBadge({ status: 'postponed' }).label, 'Pospuesto')
  assert.equal(labels.matchStatusBadge({ status: 'scheduled' }).label, 'Programado')
})

test('mapeo: un partido sin el campo (anterior a 6C) no queda por programar', () => {
  const base = { id: 'm', tournamentId: 't', round: 1, homeTeamId: 'a', awayTeamId: 'b', date: '2027-01-01', time: '10:00', venue: null, status: 'POSTPONED', homeScore: null, awayScore: null, createdAt: '', updatedAt: '' }
  assert.equal(mappers.toMatch(base).pendingSchedule, false)
  assert.equal(mappers.toMatch({ ...base, pendingSchedule: true }).pendingSchedule, true)
})
