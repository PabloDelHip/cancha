import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 7B-C: resultados de la jornada. Solo partidos finalizados con marcador; los demás se avisan.
let server, d
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  d = await server.ssrLoadModule('/src/posters/data.ts')
})
after(async () => server?.close())

const teams = { a: { name: 'Halcones de Mazatlán' }, b: { name: 'Peñarol Ñuu Savi', shortName: 'PÑS' }, c: { name: 'Leones' }, e: { name: 'Tigres' } }
const m = (id, over = {}) => ({ id, status: 'finished', date: '2026-10-25', homeTeamId: 'a', awayTeamId: 'b', homeScore: 2, awayScore: 1, ...over })
const input = (matches, extra = {}) => ({ matches, teams, crests: { a: 'data:image/png;base64,AAAA' }, tournament: { name: 'Liga Municipal 2026', startDate: '2026-08-01', endDate: null }, leagueName: null, logo: null, roundNumber: 10, roundLabel: 'Jornada 10', format: 'portrait', ...extra })

test('solo finalizados con marcador; los demás se cuentan como por jugar (cancelados no)', () => {
  const [p] = d.buildResultPages(input([m('1'), m('2', { status: 'scheduled', homeScore: null, awayScore: null }), m('3', { status: 'postponed' }), m('4', { status: 'cancelled' }), m('5', { status: 'finished', homeScore: null, awayScore: null })]))
  assert.deepEqual(p.rows.map((r) => r.id), ['1'])
  assert.equal(p.pendingNote, '3 partidos por jugar')
  assert.equal(d.buildResultPages(input([m('1')]))[0].pendingNote, null)
  assert.equal(d.buildResultPages(input([m('1'), m('2', { status: 'live' })]))[0].pendingNote, '1 partido por jugar')
})

test('ganador por marcador o por penales; empate; detalle de grupo, penales y tiempo extra', () => {
  const [p] = d.buildResultPages(input([m('1'), m('2', { homeScore: 0, awayScore: 3 }), m('3', { homeScore: 1, awayScore: 1 }), m('4', { homeScore: 1, awayScore: 1, penalties: { home: 3, away: 4 }, stage: { group: 'B' } }), m('5', { homeScore: 2, awayScore: 1, extraTime: true })]))
  assert.deepEqual(p.rows.map((r) => r.winner), ['home', 'away', null, 'away', 'home'])
  assert.deepEqual(p.rows.map((r) => r.detail), [null, null, null, 'Grupo B · Penales 3-4', 'Tiempo extra'])
  assert.deepEqual([p.rows[0].home.crest !== null, p.rows[0].away.initials, p.rows[0].away.crest], [true, 'PÑS', null])
})

test('fecha solo si todos se jugaron el mismo día', () => {
  assert.equal(d.buildResultPages(input([m('1'), m('2')]))[0].dateLabel, 'Domingo 25 de octubre')
  assert.equal(d.buildResultPages(input([m('1'), m('2', { date: '2026-10-26' })]))[0].dateLabel, null)
})

test('páginas parejas por formato, textos ajustables y nombre de archivo', () => {
  const ten = Array.from({ length: 10 }, (_, i) => m(String(i)))
  assert.deepEqual(d.buildResultPages(input(ten, { format: 'story' })).map((p) => p.rows.length), [10])
  assert.deepEqual(d.buildResultPages(input(ten, { format: 'portrait' })).map((p) => p.rows.length), [5, 5])
  const sq = d.buildResultPages(input(ten, { format: 'square', overrides: { title: ' Copa Barrio ', roundLabel: 'Clásico' } }))
  assert.deepEqual(sq.map((p) => p.rows.length), [5, 5])
  assert.equal(sq[1].tournamentName, 'Copa Barrio')
  assert.equal(sq[1].roundLabel, 'Clásico')
  assert.equal(d.resultsFileNameOf(sq[1], 'urban-black'), 'resultados-copa-barrio-j10-urban-black-2de2.png')
  assert.equal(d.hasResults([m('1', { status: 'scheduled', homeScore: null, awayScore: null })]), false)
  assert.equal(d.hasResults([m('1')]), true)
})
