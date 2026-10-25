import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 7B-E: datos del cartel de resultado final. Marcador, goleadores y tarjetas tal como están en el acta.
let server, d
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  d = await server.ssrLoadModule('/src/posters/data.ts')
})
after(async () => server?.close())

const NAMES = { p1: 'J. Hernández', p2: 'L. Núñez', p3: 'A. Castañeda', p4: 'R. Villaseñor', p5: 'M. Ibáñez' }
const stat = (playerId, teamId, goals = 0, extra = {}) => ({ playerId, teamId, goals, ownGoals: 0, yellowCards: 0, redCards: 0, ...extra })
const input = (match = {}, stats = []) => ({
  match: { round: 10, date: '2026-10-25', time: '16:00', venue: 'Unidad Deportiva · Cancha 2', status: 'finished', homeTeamId: 'H', awayTeamId: 'A', homeScore: 3, awayScore: 1, ...match },
  stats,
  playerName: (id) => NAMES[id] ?? null,
  home: { name: 'Halcones de Mazatlán', shortName: null },
  away: { name: 'Peñarol Ñuu Savi', shortName: null },
  crests: { home: null, away: null },
  tournament: { name: 'Liga Municipal 2026', startDate: '2026-08-01', endDate: null },
  leagueName: null,
  logo: null,
  roundLabel: 'Jornada 10',
})

test('solo un partido finalizado con marcador es resultado final', () => {
  assert.equal(d.isFinal({ status: 'finished', homeScore: 0, awayScore: 0 }), true)
  for (const m of [{ status: 'finished', homeScore: null, awayScore: null }, { status: 'live', homeScore: 1, awayScore: 0 }, { status: 'scheduled' }, { status: 'cancelled', homeScore: 0, awayScore: 0 }]) assert.equal(d.isFinal(m), false)
  // Un programado sigue siendo cartel de próximo partido, sin cambios.
  const next = d.buildMatchPoster(input({ status: 'scheduled', homeScore: null, awayScore: null }))
  assert.equal(next.final, null)
  assert.equal(next.timeLabel, '16:00')
})

test('marcador, ganador, fecha jugada sin hora y nombre de archivo', () => {
  const p = d.buildMatchPoster(input())
  assert.deepEqual([p.final.homeScore, p.final.awayScore, p.final.winner, p.final.detail], [3, 1, 'home', null])
  assert.equal(p.dateLabel, 'Domingo 25 de octubre')
  assert.equal(p.timeLabel, null)
  assert.equal(p.scheduleNote, null)
  assert.equal(d.matchFileNameOf(p, 'urban-black'), 'resultado-halcones-de-mazatlan-vs-penarol-nuu-savi-j10-urban-black.png')
  assert.equal(d.buildMatchPoster(input({ homeScore: 0, awayScore: 2 })).final.winner, 'away')
})

test('empate, penales y tiempo extra', () => {
  const draw = d.buildMatchPoster(input({ homeScore: 1, awayScore: 1 })).final
  assert.deepEqual([draw.winner, draw.detail], [null, null])
  const pens = d.buildMatchPoster(input({ homeScore: 1, awayScore: 1, penalties: { home: 4, away: 3 } })).final
  assert.deepEqual([pens.winner, pens.detail], ['home', 'Penales 4-3'])
  assert.equal(d.buildMatchPoster(input({ homeScore: 2, awayScore: 1, extraTime: true })).final.detail, 'Tiempo extra')
})

test('goleadores ordenados, autogol del lado del rival y tarjetas', () => {
  const p = d.buildMatchPoster(
    input({}, [
      stat('p2', 'H', 1, { yellowCards: 1 }),
      stat('p1', 'H', 2),
      stat('p3', 'A', 1),
      stat('p4', 'A', 0, { ownGoals: 1, yellowCards: 2, redCards: 1 }),
      stat('p5', 'A', 0, { redCards: 1 }),
    ]),
  ).final
  assert.deepEqual(p.home.goals, [
    { name: 'J. Hernández', count: 2, own: false },
    { name: 'L. Núñez', count: 1, own: false },
    { name: 'R. Villaseñor', count: 1, own: true },
  ])
  assert.deepEqual(p.away.goals, [{ name: 'A. Castañeda', count: 1, own: false }])
  assert.deepEqual(p.home.cards, [{ name: 'L. Núñez', yellow: 1, red: 0 }])
  // Expulsados primero.
  assert.deepEqual(p.away.cards.map((c) => c.name), ['R. Villaseñor', 'M. Ibáñez'])
  assert.equal(p.lines, 4)
})

test('sin inventar: sin acta solo el marcador; jugador sin nombre o de otro equipo no aparece', () => {
  const bare = d.buildMatchPoster(input({}, [])).final
  assert.deepEqual([bare.home.goals, bare.away.goals, bare.home.cards, bare.lines], [[], [], [], 0])
  const p = d.buildMatchPoster(input({}, [stat('desconocido', 'H', 2), stat('p1', 'OTRO', 1), stat('p2', 'H', 0)])).final
  assert.deepEqual([p.home.goals, p.away.goals, p.lines], [[], [], 0])
})
