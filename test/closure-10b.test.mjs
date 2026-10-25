import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 10B: qué pide el diálogo de cierre y qué valida «Crear siguiente temporada».
let server, c
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  c = await server.ssrLoadModule('/src/utils/closure.ts')
})
after(async () => server?.close())

const preview = (over = {}) => ({ canFinish: true, requiresConfirmation: false, blockers: [], warnings: [], ...over })

test('cierre: bloqueantes impiden finalizar; siempre hay confirmación explícita', () => {
  assert.equal(c.closureConfirmation(preview({ canFinish: false, blockers: [{ code: 'LIVE_MATCHES', message: 'Hay 1 partido en juego' }] })).blocked, true)
  const ready = c.closureConfirmation(preview())
  assert.equal(ready.blocked, false)
  assert.equal(ready.allowPendingMatches, false)
  assert.match(ready.label, /no podrá reabrirse/)
})

test('cierre: con advertencias se confirma sobre ellas; pendientes viajan como allowPendingMatches', () => {
  const w = c.closureConfirmation(preview({ requiresConfirmation: true, warnings: [{ code: 'SCHEDULED_MATCHES', message: '2 partidos programados sin jugar' }] }))
  assert.equal(w.blocked, false)
  assert.equal(w.allowPendingMatches, true)
  assert.match(w.label, /Revisé las advertencias/)
  // Advertencias sin partidos pendientes (adeudos, sanciones): se confirman, pero no hay pendientes que permitir.
  assert.equal(c.closureConfirmation(preview({ warnings: [{ code: 'OUTSTANDING_BALANCES', message: 'Adeudo' }] })).allowPendingMatches, false)
})

test('nueva temporada: equipos por defecto = los que no se retiraron, solo del torneo de origen', () => {
  const rows = [
    { tournamentId: 't1', teamId: 'a', withdrawnAt: null },
    { tournamentId: 't1', teamId: 'b', withdrawnAt: '2026-03-01' },
    { tournamentId: 't2', teamId: 'c', withdrawnAt: null },
  ]
  assert.deepEqual(c.continuingTeams(rows, 't1'), ['a'])
  assert.deepEqual(c.continuingTeams(rows, 'x'), [])
})

test('nueva temporada: nombre, fechas y cupo', () => {
  const ok = c.nextSeasonErrors({ name: 'Clausura', startDate: '2027-08-01', endDate: '' }, 4, 8)
  assert.ok(Object.values(ok).every((e) => e === null))
  const bad = c.nextSeasonErrors({ name: '   ', startDate: '', endDate: '2027-01-01' }, 9, 8)
  assert.match(bad.name, /nombre/)
  assert.match(bad.startDate, /inicio/)
  assert.equal(bad.endDate, null) // sin inicio no se compara
  assert.match(bad.teams, /hasta 8/)
  assert.match(c.nextSeasonErrors({ name: 'X', startDate: '2027-08-01', endDate: '2027-07-01' }, 0, null).endDate, /anterior/)
  assert.match(c.nextSeasonErrors({ name: 'x'.repeat(121), startDate: '2027-08-01', endDate: '' }, 0, null).name, /120/)
  assert.equal(c.nextSeasonErrors({ name: 'X', startDate: '2027-08-01', endDate: '' }, 50, null).teams, null)
})
