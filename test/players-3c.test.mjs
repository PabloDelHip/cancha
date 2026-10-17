import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 3C: el panel ofrece anular un cambio de equipo solo si la participación viene de uno (transferredFrom).
let server, toMembership
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  ;({ toMembership } = await server.ssrLoadModule('/src/services/mappers.ts'))
})
after(async () => server?.close())

const api = { id: 'm1', playerId: 'p', teamId: 'B', tournamentId: 't', jerseyNumber: 4, startDate: '2027-01-01', endDate: null, active: true, registeredAt: '2027-01-01', createdAt: '', updatedAt: '' }

test('transferredFrom llega del servidor; ausente (backend anterior o alta normal) = null', () => {
  assert.equal(toMembership({ ...api, transferredFrom: 'A' }).transferredFrom, 'A')
  assert.equal(toMembership(api).transferredFrom, null)
  assert.equal(toMembership({ ...api, transferredFrom: null }).transferredFrom, null)
})
