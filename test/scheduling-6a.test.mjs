import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 6A: resúmenes de las restricciones de calendario y su entrada en el historial.
let server, s, describeEntry
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  s = await server.ssrLoadModule('/src/utils/scheduling.ts')
  ;({ describeEntry } = await server.ssrLoadModule('/src/utils/matchLog.ts'))
})
after(async () => server?.close())

test('días de lunes a domingo (0 = domingo, como el servidor)', () => {
  assert.equal(s.daysText([0, 6]), 'sáb y dom')
  assert.equal(s.daysText([3, 1, 5], true), 'lunes, miércoles y viernes')
  assert.equal(s.daysText([]), '')
})

test('resumen de un equipo: vacío sin restricciones; chips con lo configurado', () => {
  assert.deepEqual(s.teamRulesSummary(s.emptyTeamRules()), [])
  const r = { ...s.emptyTeamRules(), unavailableDays: [6], unavailableDates: ['2027-02-06', '2027-02-13'], unavailableTimes: [{ day: null, from: '06:00', to: '09:00' }], minRestHours: 48, maxMatchesPerDay: 1 }
  assert.deepEqual(s.teamRulesSummary(r), ['No juega sáb', '2 fechas bloqueadas', 'No juega a diario 06:00–09:00', 'Descanso 48 h', 'Máx. 1 por día'])
})

test('resumen del torneo', () => {
  const rules = { timeZone: null, days: [6, 0], startTime: '08:00', endTime: '24:00', fieldGapMinutes: 15, maxMatchesPerDay: 6, maxSimultaneous: null, fieldAvailability: 'BLOCK' }
  assert.deepEqual(s.tournamentRulesSummary(rules, 90), [
    'Días: sábado y domingo',
    'Horario: 08:00 a 24:00',
    'Partidos de 90 min',
    '15 min entre partidos de una cancha',
    'Máximo 6 por día',
    'Disponibilidad de canchas obligatoria',
  ])
  assert.deepEqual(s.tournamentRulesSummary({ ...rules, days: [], startTime: null, endTime: null, fieldGapMinutes: null, maxMatchesPerDay: null, fieldAvailability: 'WARN' }, 60), ['Cualquier día', 'Partidos de 60 min'])
})

test('historial: cambios del torneo y de un equipo', () => {
  const refs = { teams: { t1: 'Tigres' }, referees: {}, users: {} }
  const base = { id: 'e1', tournamentId: 'x', matchId: null, affectedMatchIds: [], action: 'SCHEDULING_RULES_UPDATED', source: 'USER', cause: null, actorId: 'u', actorRole: 'OWNER', reason: null, snapshot: null, released: null, createdAt: '2026-10-19T00:00:00Z' }
  const t = describeEntry({ ...base, changes: { days: { from: [], to: [6] }, timeZone: { from: null, to: 'America/Mazatlan' }, maxSimultaneous: { from: 2, to: null } } }, refs)
  assert.equal(t.title, 'Restricciones de calendario del torneo actualizadas')
  assert.deepEqual(t.details, ['días: sáb', 'zona horaria: Pacífico (Sinaloa, Nayarit, BCS)', 'simultáneos: sin restricción'])
  const team = describeEntry({ ...base, changes: { teamId: { from: 't1', to: 't1' }, teamRules: { from: null, to: { ...s.emptyTeamRules(), unavailableDays: [0], strict: false } } } }, refs)
  assert.equal(team.title, 'Restricciones de calendario de Tigres actualizadas')
  assert.deepEqual(team.details, ['No juega dom · preferencia'])
})
