import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 3D: el retiro de un equipo llega en la inscripción y en la estructura; sin el campo (backend anterior) = no retirado.
let server, toTournamentTeam, toStructure
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  ;({ toTournamentTeam, toStructure } = await server.ssrLoadModule('/src/services/mappers.ts'))
})
after(async () => server?.close())

test('inscripción: withdrawnAt del servidor; ausente = null', () => {
  const api = { id: 'e', tournamentId: 't', teamId: 'A', createdAt: '2027-01-01T00:00:00Z' }
  assert.equal(toTournamentTeam({ ...api, withdrawnAt: '2027-03-01' }).withdrawnAt, '2027-03-01')
  assert.equal(toTournamentTeam(api).withdrawnAt, null)
})

test('estructura: withdrawnTeamIds del servidor; ausente = []', () => {
  const api = {
    tournamentId: 't',
    status: 'ACTIVE',
    settings: { system: 'LEAGUE', roundRobinLegs: 1, knockoutLegs: 1, groupCount: null, qualifiersPerGroup: null, playoffTeams: null, knockoutTiebreak: 'PENALTIES', finalTiebreak: null, reseed: false },
    phases: [],
    next: null,
    championTeamId: null,
    tiebreaks: [],
    teams: {},
  }
  assert.deepEqual(toStructure({ ...api, withdrawnTeamIds: ['A'] }).withdrawnTeamIds, ['A'])
  assert.deepEqual(toStructure(api).withdrawnTeamIds, [])
})
