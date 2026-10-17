import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 3E: textos del historial de plantillas y P1 (clasificados efectivos de la eliminatoria guardada).
let server, h, effectiveQualified
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  h = await server.ssrLoadModule('/src/utils/rosterHistory.ts')
  ;({ effectiveQualified } = await server.ssrLoadModule('/src/utils/qualification.ts'))
})
after(async () => server?.close())

const refs = { players: { p: 'Pablo Pérez' }, teams: { A: 'Águilas', B: 'Búhos' }, users: { u: 'Liga Norte' } }
const ev = (x) => ({ id: 'x', at: '2027-02-01T18:00:00.000Z', date: '2027-02-01', playerId: 'p', teamId: 'B', fromTeamId: null, reason: null, by: { userId: 'u', role: 'ADMIN' }, legacy: false, details: {}, ...x })

test('cambio de equipo y anulación: origen y destino; la transferencia anulada se marca', () => {
  assert.match(h.eventSummary(ev({ action: 'TRANSFER', fromTeamId: 'A' }), refs), /^Águilas → Búhos · desde el/)
  assert.match(h.eventSummary(ev({ action: 'TRANSFER_ANNULLED', teamId: 'A', fromTeamId: 'B', details: { jerseyCleared: 9 } }), refs), /Vuelve a Águilas \(se anula el cambio a Búhos\) · el #9 estaba ocupado/)
  assert.deepEqual(h.eventTags(ev({ action: 'TRANSFER', details: { annulled: true } })), ['Anulado después'])
})

test('autor y rol; lo anterior a 3A no inventa autor', () => {
  assert.equal(h.eventAuthor(ev({ action: 'REGISTERED' }), refs), 'Liga Norte (administrador)')
  assert.equal(h.eventAuthor(ev({ action: 'REGISTERED', by: { userId: 'u', role: 'TEAM' } }), refs), 'Liga Norte (equipo)')
  const legacy = ev({ action: 'UNREGISTERED', at: null, by: null, legacy: true })
  assert.equal(h.eventAuthor(legacy, refs), 'Sin registro de autor')
  assert.equal(h.eventTitle(legacy), 'Fin de participación')
  assert.deepEqual(h.eventTags(legacy), ['Registro anterior'])
})

test('excepciones, dorsal, bloqueo retroactivo, retiro y equipo quitado', () => {
  assert.equal(h.eventTitle(ev({ action: 'EXCEPTION', details: { kind: 'OVER_LIMIT' } })), 'Excepción: por encima del máximo de jugadores')
  assert.match(h.eventSummary(ev({ action: 'EXCEPTION', details: { kind: 'OVER_LIMIT', max: 20, count: 20 } }), refs), /máximo 20, ya tenía 20/)
  assert.match(h.eventSummary(ev({ action: 'JERSEY_CHANGED', details: { from: null, to: 7 } }), refs), /sin dorsal → #7/)
  assert.match(h.eventSummary(ev({ action: 'BLOCKED', details: { retroactive: true } }), refs), /fecha retroactiva/)
  assert.match(h.eventSummary(ev({ action: 'TEAM_WITHDRAWN', playerId: null, details: { cancelledMatches: 2, closedMemberships: 5 } }), refs), /2 partidos pendientes cancelados · 5 jugadores/)
  assert.match(h.eventSummary(ev({ action: 'TEAM_REMOVED', teamId: 'X', playerId: null, details: { memberships: 3 } }), { ...refs, teams: {} }), /^Equipo eliminado · no había jugado; 3 participaciones/)
})

test('el filtro por acción cubre todas las acciones exactamente una vez', () => {
  const covered = h.ROSTER_ACTION_FILTERS.flatMap((f) => f.actions).sort()
  assert.deepEqual(covered, Object.keys(h.ROSTER_ACTION_LABEL).sort())
})

test('P1: con la eliminatoria generada, los clasificados son su siembra (aunque se retiraran después)', () => {
  const table = { index: 0, type: 'league', generated: true, complete: true, pending: 0, table: [], qualification: { count: 2, teamIds: ['B', 'C'], unresolved: [] } }
  const knockout = (x) => ({ index: 1, type: 'knockout', generated: true, manual: false, reseed: false, complete: false, legs: 1, seeds: [], rounds: [], championTeamId: null, ...x })
  const structure = (next) => ({ phases: [table, next], withdrawnTeamIds: ['A'] })
  // A clasificó, jugó la eliminatoria y después se retiró: sigue marcado; C (el siguiente) no.
  assert.deepEqual(effectiveQualified(structure(knockout({ seeds: [{ seed: 1, teamId: 'A' }, { seed: 2, teamId: 'B' }] })), 0), ['A', 'B'])
  // Cuadro armado a mano: los equipos de su primera ronda.
  assert.deepEqual(effectiveQualified(structure(knockout({ manual: true, rounds: [{ round: 0, name: 'Final', ties: [{ homeTeamId: 'B', awayTeamId: 'D' }] }] })), 0), ['B', 'D'])
  // Sin eliminatoria guardada: la tabla usa su regla (null).
  assert.equal(effectiveQualified(structure(knockout({ generated: false, seeds: [{ seed: 1, teamId: 'B' }] })), 0), null)
  assert.equal(effectiveQualified({ phases: [table] }, 0), null)
})
