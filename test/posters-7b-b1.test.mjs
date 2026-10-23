import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 7B-B1: datos del cartel de un partido. Solo lo que el partido tiene: sin horario, «por confirmar».
let server, d
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  d = await server.ssrLoadModule('/src/posters/data.ts')
})
after(async () => server?.close())

const input = (match = {}, extra = {}) => ({
  match: { round: 10, date: '2026-10-25', time: '16:00', venue: 'Unidad Deportiva · Cancha 2', status: 'scheduled', ...match },
  home: { name: 'Halcones de Mazatlán', shortName: null, colors: { primary: '#b91c1c', secondary: '#fde047' } },
  away: { name: 'Peñarol Ñuu Savi', shortName: 'PÑS', colors: { primary: '#111827', secondary: '#facc15' } },
  crests: { home: 'data:image/png;base64,AAAA', away: null },
  tournament: { name: 'Liga Municipal 2026', startDate: '2026-08-01', endDate: null },
  leagueName: 'Liga Peñasco',
  logo: null,
  roundLabel: 'Jornada 10',
  ...extra,
})

test('programado: fecha, hora, sede y equipos reales', () => {
  const p = d.buildMatchPoster(input())
  assert.equal(p.dateLabel, 'Domingo 25 de octubre')
  assert.equal(p.timeLabel, '16:00')
  assert.equal(p.venue, 'Unidad Deportiva · Cancha 2')
  assert.equal(p.scheduleNote, null)
  assert.equal(p.roundLabel, 'Jornada 10')
  assert.equal(p.season, '2026')
  assert.deepEqual([p.home.name, p.home.crest !== null, p.away.initials, p.away.crest], ['Halcones de Mazatlán', true, 'PÑS', null])
})

test('pospuesto o sin horario (pendingSchedule): no muestra su fecha de referencia', () => {
  for (const m of [{ status: 'postponed' }, { status: 'postponed', pendingSchedule: true }, { status: 'scheduled', pendingSchedule: true }]) {
    const p = d.buildMatchPoster(input(m))
    assert.equal(p.dateLabel, null)
    assert.equal(p.timeLabel, null)
    assert.equal(p.scheduleNote, 'Fecha y hora por confirmar')
  }
})

test('sin sede o sin hora válida: no se inventa', () => {
  assert.equal(d.buildMatchPoster(input({ venue: null })).venue, null)
  assert.equal(d.buildMatchPoster(input({ venue: '   ' })).venue, null)
  const noTime = d.buildMatchPoster(input({ time: '' }))
  assert.equal(noTime.timeLabel, null)
  assert.equal(noTime.dateLabel, 'Domingo 25 de octubre')
  assert.equal(noTime.scheduleNote, 'Hora por confirmar')
})

test('grupo, textos ajustables (texto plano) y nombre de archivo', () => {
  const p = d.buildMatchPoster(input({ stage: { group: 'B' } }, { overrides: { title: '  Copa Barrio  ', roundLabel: 'Clásico' } }))
  assert.equal(p.groupLabel, 'Grupo B')
  assert.equal(p.tournamentName, 'Copa Barrio')
  assert.equal(p.roundLabel, 'Clásico')
  assert.equal(d.matchFileNameOf(p, 'urban-black'), 'partido-halcones-de-mazatlan-vs-penarol-nuu-savi-j10-urban-black.png')
})

test('solo se anuncian partidos programados o pospuestos', () => {
  assert.deepEqual(['scheduled', 'postponed', 'live', 'finished', 'cancelled', 'suspended'].map((status) => d.canAnnounce({ status })), [true, true, false, false, false, false])
})
