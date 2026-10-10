import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// Textos del historial para las acciones de 2C-2 (incidencias, suspensiones, correcciones).
let server, describeEntry, isOpen, hasResult
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  ;({ describeEntry } = await server.ssrLoadModule('/src/utils/matchLog.ts'))
  ;({ isOpen, hasResult } = await server.ssrLoadModule('/src/utils/matches.ts'))
})
after(async () => server?.close())

const refs = { teams: {}, referees: { r1: 'Ana Pérez', r2: 'Luis Gómez' }, users: { u1: 'Dueña Liga' } }
const entry = (action, changes, extra = {}) => ({ id: 'e', matchId: 'm', action, source: 'USER', cause: null, actorId: 'u1', reason: null, changes, snapshot: null, released: null, createdAt: '2027-01-01T10:00:00Z', ...extra })

test('suspensión registrada, anulada y resuelta', () => {
  const reported = describeEntry(entry('INCIDENT_REPORTED', { status: { from: 'LIVE', to: 'SUSPENDED' }, incident: { from: null, to: { type: 'SUSPENSION', description: 'Tormenta' } } }), refs)
  assert.equal(reported.title, 'Partido suspendido · Tormenta')
  assert.equal(reported.by, 'Dueña Liga')
  assert.equal(describeEntry(entry('INCIDENT_REPORTED', { incident: { from: null, to: { type: 'DELAY', description: 'Llegó tarde el árbitro' } } }), refs).title, 'Incidencia: Retraso · Llegó tarde el árbitro')
  const voided = describeEntry(entry('INCIDENT_VOIDED', { status: { from: 'SUSPENDED', to: 'SCHEDULED' }, incident: { from: null, to: { type: 'SUSPENSION' } } }), refs)
  assert.equal(voided.title, 'Suspensión anulada (registrada por error)')
  assert.deepEqual(voided.details, ['Estado: Suspendido → Programado'])
  const decided = describeEntry(entry('SUSPENSION_RESOLVED', { status: { from: 'SUSPENDED', to: 'SCHEDULED' }, date: { from: '2027-04-17', to: '2027-04-24' }, decision: { from: null, to: 'RESCHEDULED' } }), refs)
  assert.equal(decided.title, 'Suspensión: Se reprogramó')
  assert.ok(decided.details.some((d) => d.startsWith('Nueva fecha:')))
})

test('corrección arbitral y liberación al reprogramar', () => {
  const corrected = describeEntry(
    entry('REFEREE_CORRECTED', { absence: { from: { refereeId: 'r1', role: 'CENTRAL' }, to: {} }, voided: { from: { refereeId: 'r2', role: 'CENTRAL' }, to: {} } }, { reason: 'Sí llegó' }),
    refs,
  )
  assert.equal(corrected.title, 'Corrección arbitral: se anuló la ausencia de Ana Pérez (Central); se anuló la sustitución de Luis Gómez')
  const moved = describeEntry(entry('RESCHEDULED', { time: { from: '10:00', to: '12:00' } }, { released: [{ matchId: 'm', fieldId: 'f', venue: 'Sede · Cancha 1', referees: [{ refereeId: 'r2', role: 'CENTRAL' }] }] }), refs)
  assert.ok(moved.details.includes('Se liberó: cancha Sede · Cancha 1, Luis Gómez (Central)'))
})

test('un suspendido está pendiente y cuenta como iniciado', () => {
  const m = { status: 'suspended', homeScore: null, awayScore: null }
  assert.equal(isOpen(m), true)
  assert.equal(hasResult(m), true)
})
