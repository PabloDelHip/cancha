import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 6B: reglas generales como preferencia en el resumen y en el historial.
let server, s
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  s = await server.ssrLoadModule('/src/utils/scheduling.ts')
})
after(async () => server?.close())

const rules = { timeZone: null, days: [6], startTime: '08:00', endTime: '22:00', fieldGapMinutes: null, maxMatchesPerDay: 4, maxSimultaneous: null, fieldAvailability: 'WARN' }

test('resumen: las preferencias se nombran; sin ellas (o en datos anteriores a 6B) nada cambia', () => {
  assert.deepEqual(s.tournamentRulesSummary({ ...rules, softRules: ['DAYS', 'DAILY_LIMIT'] }, 60).at(-1), 'Como preferencia: días, máximo por día')
  assert.ok(!s.tournamentRulesSummary({ ...rules, softRules: [] }, 60).some((x) => x.startsWith('Como preferencia')))
  assert.ok(!s.tournamentRulesSummary(rules, 60).some((x) => x.startsWith('Como preferencia')))
})

test('historial: cambio de preferencias', () => {
  assert.equal(s.ruleChangeText('softRules', ['HOURS']), 'preferencias: horario')
  assert.equal(s.ruleChangeText('softRules', []), 'preferencias: sin restricción')
})

test('solo días, horario y máximo diario pueden ser preferencia', () => {
  assert.deepEqual(s.SOFT_RULE_OPTIONS.map((o) => o.value), ['DAYS', 'HOURS', 'DAILY_LIMIT'])
})
