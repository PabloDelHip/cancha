import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// Ficha técnica (2D): textos del historial y etiquetas de evidencias.
let server, describeEntry, EVIDENCE_KINDS
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  ;({ describeEntry } = await server.ssrLoadModule('/src/utils/matchLog.ts'))
  ;({ EVIDENCE_KINDS } = await server.ssrLoadModule('/src/utils/labels.ts'))
})
after(async () => server?.close())

const refs = { teams: { t1: 'Halcones' }, referees: {}, users: { u1: 'Dueña' } }
const entry = (action, changes, extra = {}) => ({ id: 'e', matchId: 'm', action, source: 'USER', cause: null, actorId: 'u1', reason: null, changes, snapshot: null, released: null, createdAt: '2027-01-01T10:00:00Z', ...extra })

test('alineación registrada y corregida, cierre con marcador, reapertura', () => {
  const lineup = { teamId: 't1', players: [{}, {}, {}], substitutions: [{}] }
  assert.equal(describeEntry(entry('SHEET_LINEUP_SAVED', { lineup: { from: null, to: lineup } }), refs).title, 'Alineación registrada de Halcones: 3 jugadores, 1 sustituciones')
  assert.equal(describeEntry(entry('SHEET_LINEUP_SAVED', { lineup: { from: lineup, to: lineup } }), refs).title, 'Alineación corregida de Halcones: 3 jugadores, 1 sustituciones')
  assert.equal(describeEntry(entry('SHEET_CLOSED', { sheet: { from: 'OPEN', to: 'CLOSED' }, score: { from: null, to: { home: 2, away: 1 } } }), refs).title, 'Ficha técnica cerrada con 2–1')
  assert.equal(describeEntry(entry('SHEET_REOPENED', { sheet: { from: {}, to: 'OPEN' } }, { reason: 'Marcador' }), refs).title, 'Ficha técnica reabierta')
})

test('fotografías agregadas y retiradas', () => {
  assert.equal(describeEntry(entry('EVIDENCE_ADDED', { evidence: { from: null, to: { kind: 'REFEREE_REPORT' } } }), refs).title, 'Fotografía agregada: Cédula arbitral')
  assert.equal(describeEntry(entry('EVIDENCE_REMOVED', { evidence: { from: {}, to: { kind: 'SCOREBOARD' } } }), refs).title, 'Fotografía retirada: Marcador')
  assert.deepEqual(EVIDENCE_KINDS.map((k) => k.value), ['REFEREE_REPORT', 'LINEUP', 'INCIDENT', 'SCOREBOARD', 'OTHER'])
})

test('3A: corrección administrativa de la misma fecha deportiva', () => {
  assert.equal(describeEntry(entry('ELIGIBILITY_OVERRIDE', { sameDate: { from: null, to: [{}, {}] } }, { reason: 'Junta' }), refs).title, 'Corrección administrativa: 2 jugadores figuran con otro equipo en la misma fecha')
  assert.equal(describeEntry(entry('ELIGIBILITY_OVERRIDE', { sameDate: { from: null, to: [{}] } }), refs).title, 'Corrección administrativa: 1 jugador figura con otro equipo en la misma fecha')
})
