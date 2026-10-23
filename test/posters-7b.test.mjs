import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 7B-A: datos de las publicaciones (paginación, textos, tablas y corte). Nada se recalcula.
let server, d
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  d = await server.ssrLoadModule('/src/posters/data.ts')
})
after(async () => server?.close())

const standing = (i, extra = {}) => ({ position: i + 1, teamId: `t${i}`, played: 9, won: 5, drawn: 2, lost: 2, goalsFor: 20, goalsAgainst: 11, goalDifference: 9, points: 17, form: [], ...extra })
const table = (n) => Array.from({ length: n }, (_, i) => standing(i))
const base = (n, format, extra = {}) => ({
  table: table(n),
  teams: Object.fromEntries(table(n).map((s) => [s.teamId, { name: `Equipo ${s.position}`, shortName: null, colors: { primary: '#111111', secondary: '#ffffff' } }])),
  crests: {},
  qualifyCount: 4,
  withdrawn: ['t5'],
  tournament: { name: 'Liga Peñasco · Apertura', startDate: '2026-08-01', endDate: '2027-01-15' },
  leagueName: null,
  logo: null,
  lastRound: { number: 9, label: 'Jornada 9' },
  lastPlayedDate: '2026-10-18',
  groupLabel: null,
  format,
  formatDate: (x) => x,
  ...extra,
})

test('paginación pareja y legible por formato (8, 16 y 24 equipos)', () => {
  const sizes = (n, f) => d.paginate(table(n), f).map((p) => p.length)
  assert.deepEqual(sizes(8, 'square'), [8])
  assert.deepEqual(sizes(16, 'square'), [8, 8])
  assert.deepEqual(sizes(24, 'square'), [8, 8, 8])
  assert.deepEqual(sizes(16, 'portrait'), [16])
  assert.deepEqual(sizes(24, 'portrait'), [12, 12])
  assert.deepEqual(sizes(24, 'story'), [24])
  assert.deepEqual(sizes(11, 'square'), [6, 5])
})

test('las filas copian la tabla del servidor tal cual (posición, números, zona, retirados)', () => {
  const [page] = d.buildPosterPages(base(8, 'portrait'))
  const r = page.rows[0]
  assert.deepEqual([r.position, r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, r.goalDifference, r.points], [1, 9, 5, 2, 2, 20, 11, 9, 17])
  assert.deepEqual(page.rows.map((x) => x.qualifies), [true, true, true, true, false, false, false, false])
  assert.equal(page.rows[5].withdrawn, true)
  assert.equal(page.rows[0].crest, null)
})

test('textos: temporada, jornada, corte, grupo y ajustes en texto plano', () => {
  const [p] = d.buildPosterPages(base(8, 'square'))
  assert.equal(p.season, '2026–2027')
  assert.equal(p.roundLabel, 'Jornada 9')
  assert.equal(p.cutLabel, 'Actualizado al 2026-10-18')
  const [empty] = d.buildPosterPages(base(8, 'square', { lastRound: null, lastPlayedDate: null }))
  assert.equal(empty.roundLabel, 'Antes de la jornada 1')
  assert.equal(empty.cutLabel, null)
  assert.equal(empty.roundNumber, null)
  const [g] = d.buildPosterPages(base(8, 'square', { groupLabel: 'Grupo A' }))
  assert.equal(g.roundLabel, 'Grupo A · Jornada 9')
  const [o] = d.buildPosterPages(base(8, 'square', { overrides: { title: '  Copa Ñandú ', season: '', roundLabel: 'Jornada 9 · Cierre' } }))
  assert.deepEqual([o.tournamentName, o.season, o.roundLabel], ['Copa Ñandú', '2026–2027', 'Jornada 9 · Cierre'])
})

test('páginas: índice, total y equipos totales', () => {
  const pages = d.buildPosterPages(base(24, 'square'))
  assert.deepEqual(pages.map((p) => [p.page.index, p.page.total, p.rows[0].position, p.totalTeams]), [[0, 3, 1, 24], [1, 3, 9, 24], [2, 3, 17, 24]])
})

test('iniciales para escudos de reserva y nombres de archivo sin acentos', () => {
  assert.equal(d.initialsOf('Club Deportivo Águilas del Norte'), 'ÁN')
  assert.equal(d.initialsOf('Leones'), 'LEO')
  assert.equal(d.initialsOf('Real Xochimilco F.C.'), 'RX')
  assert.equal(d.initialsOf('Cualquiera', 'TIG'), 'TIG')
  assert.equal(d.fileNameOf({ tournamentName: 'Liga Peñasco · Apertura', roundNumber: 9, page: { index: 1, total: 2 } }, 'urban-black'), 'tabla-liga-penasco-apertura-j9-urban-black-2de2.png')
  assert.equal(d.signed(5), '+5')
  assert.equal(d.signed(-3), '−3')
})

test('tablas disponibles: liga y grupos (sin eliminatoria ni tablas vacías)', () => {
  const opts = d.tableOptions([
    { index: 0, type: 'groups', groups: [{ key: 'A', table: table(4), qualification: { count: 2 } }, { key: 'B', table: [], qualification: { count: 2 } }] },
    { index: 1, type: 'knockout' },
  ])
  assert.deepEqual(opts.map((o) => [o.key, o.label, o.qualifyCount]), [['p0-A', 'Grupo A', 2]])
  assert.deepEqual(d.tableOptions([{ index: 0, type: 'league', table: table(6), qualification: null }]).map((o) => o.label), ['Tabla general'])
})

test('corte: última jornada con un partido finalizado de esa tabla', () => {
  const ms = [
    { status: 'finished', round: 3, date: '2026-09-01', stage: null },
    { status: 'finished', round: 5, date: '2026-09-15', stage: null },
    { status: 'scheduled', round: 6, date: '2026-09-22', stage: null },
  ]
  assert.deepEqual(d.lastPlayed(ms, { phase: 0, group: null }), { round: 5, date: '2026-09-15' })
  assert.equal(d.lastPlayed([{ status: 'scheduled', round: 1, date: '2026-09-01', stage: null }], { phase: 0, group: null }), null)
  const grouped = [{ status: 'finished', round: 2, date: '2026-09-08', stage: { phase: 0, group: 'B' } }]
  assert.equal(d.lastPlayed(grouped, { phase: 0, group: 'A' }), null)
  assert.deepEqual(d.lastPlayed(grouped, { phase: 0, group: 'B' }), { round: 2, date: '2026-09-08' })
})

test('la temporada no se repite si el nombre ya la tiene', () => {
  assert.equal(d.withSeason('Liga Norte', '2027'), 'Liga Norte · 2027')
  assert.equal(d.withSeason('Liga Dominical Cancún 2027', '2027'), 'Liga Dominical Cancún 2027')
})
