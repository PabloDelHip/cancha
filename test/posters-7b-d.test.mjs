import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 7B-D: horarios de la jornada. Solo partidos por jugar; sin horario confirmado, «Por confirmar».
let server, d
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  d = await server.ssrLoadModule('/src/posters/data.ts')
})
after(async () => server?.close())

const teams = { a: { name: 'Halcones de Mazatlán' }, b: { name: 'Peñarol Ñuu Savi', shortName: 'PÑS' } }
const m = (id, over = {}) => ({ id, status: 'scheduled', date: '2026-10-25', time: '16:00', venue: 'Unidad Deportiva · Cancha 2', homeTeamId: 'a', awayTeamId: 'b', homeScore: null, awayScore: null, ...over })
const input = (matches, extra = {}) => ({ matches, teams, crests: {}, tournament: { name: 'Liga Municipal 2026', startDate: '2026-08-01', endDate: null }, leagueName: null, logo: null, roundNumber: 10, roundLabel: 'Jornada 10', format: 'portrait', ...extra })

test('solo programados y pospuestos; finalizados en la nota; en vivo y cancelados fuera', () => {
  const [p] = d.buildFixturePages(input([m('1'), m('2', { status: 'postponed' }), m('3', { status: 'finished', homeScore: 1, awayScore: 0 }), m('4', { status: 'live' }), m('5', { status: 'cancelled' })]))
  assert.equal(p.mode, 'fixtures')
  assert.deepEqual(p.rows.map((r) => [r.id, r.kind]), [['1', 'fixture'], ['2', 'fixture']])
  assert.equal(p.note, '1 partido ya jugado')
  assert.equal(d.hasFixtures([m('1', { status: 'finished' })]), false)
  assert.equal(d.hasFixtures([m('1', { status: 'postponed' })]), true)
})

test('sin horario confirmado no se muestra hora ni cancha de referencia; los confirmados primero y en orden', () => {
  const [p] = d.buildFixturePages(input([m('late', { time: '18:00' }), m('tbd', { status: 'postponed', pendingSchedule: true }), m('early', { time: '09:00' }), m('nopending', { status: 'scheduled', pendingSchedule: true }), m('notime', { time: '' })]))
  assert.deepEqual(p.rows.map((r) => r.id), ['early', 'late', 'notime', 'tbd', 'nopending'])
  const byId = Object.fromEntries(p.rows.map((r) => [r.id, r]))
  assert.equal(byId.early.time, '09:00')
  assert.equal(byId.early.detail, 'Unidad Deportiva · Cancha 2')
  assert.deepEqual([byId.tbd.time, byId.tbd.detail], [null, null])
  assert.deepEqual([byId.nopending.time, byId.nopending.detail], [null, null])
  assert.equal(byId.notime.time, null)
  assert.equal(p.dateLabel, 'Domingo 25 de octubre')
})

test('en varios días, el día va en cada partido y la cabecera no lleva fecha; grupo y sede', () => {
  const [p] = d.buildFixturePages(input([m('1'), m('2', { date: '2026-10-24', venue: null, stage: { group: 'B' } })]))
  assert.equal(p.dateLabel, null)
  assert.deepEqual(p.rows.map((r) => r.detail), ['Sáb 24 oct · Grupo B', 'Dom 25 oct · Unidad Deportiva · Cancha 2'])
})

test('una imagen hasta el máximo y nombre de archivo', () => {
  const ten = Array.from({ length: 10 }, (_, i) => m(String(i)))
  assert.deepEqual(d.buildFixturePages(input(ten, { format: 'square' })).map((p) => p.rows.length), [10])
  const [p] = d.buildFixturePages(input(ten))
  assert.equal(d.fixturesFileNameOf(p, 'urban-black'), 'horarios-liga-municipal-2026-j10-urban-black.png')
})
