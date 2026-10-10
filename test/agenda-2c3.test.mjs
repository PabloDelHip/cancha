import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// Agenda (2C-3): visible para organizadores y para quien solo colabora.
let server, ADMIN_NAV, roundLabel
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  ;({ ADMIN_NAV } = await server.ssrLoadModule('/src/components/layout/nav.ts'))
  ;({ roundLabel } = await server.ssrLoadModule('/src/stores/rounds.ts'))
})
after(async () => server?.close())

test('la Agenda está en el menú del panel, también para colaboradores', () => {
  const item = ADMIN_NAV.find((i) => i.label === 'Agenda')
  assert.ok(item)
  assert.deepEqual(item.to, { name: 'admin-agenda' })
  assert.equal(item.forCollaborators, true)
  assert.ok(ADMIN_NAV.indexOf(item) === ADMIN_NAV.findIndex((i) => i.label === 'Mis torneos') + 1)
})

test('la jornada de cada fila usa el nombre de la jornada si existe', () => {
  assert.equal(roundLabel(3, null), 'Jornada 3')
  assert.equal(roundLabel(3, 'Clásico'), 'Clásico')
})
