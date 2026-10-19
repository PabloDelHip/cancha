import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 5B — correcciones de la auditoría 5A en el front (docs/audit-5.md).
let server, analytics, finance
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  analytics = await server.ssrLoadModule('/src/services/analytics.ts')
  finance = await server.ssrLoadModule('/src/utils/finance.ts')
})
after(async () => server?.close())

test('P2-5: el token de invitación a colaborar (/invite/:token) nunca sale hacia la analítica', () => {
  const token = 'Zx9-secretoDeInvitacion_123'
  assert.equal(analytics.redactUrl(`https://kisokar.app/invite/${token}`), 'https://kisokar.app/invite/:token')
  assert.equal(analytics.redactUrl(`https://kisokar.app/invite/${token}?x=1#y`), 'https://kisokar.app/invite/:token?x=1#y')
  assert.equal(analytics.redactUrl(`/login?redirect=%2Finvite%2F${token}`), '/login?redirect=%2Finvite%2F%3Atoken')
  // El de inscripción por enlace sigue igual.
  assert.equal(analytics.redactUrl(`/join/${token}`), '/join/:token')
  assert.equal(analytics.isSecretPath(`/invite/${token}`), true)
  assert.equal(analytics.isSecretPath('/tournaments/abc'), false)

  // Un evento completo: URL actual, referrer, ruta y propiedades de persona.
  const event = analytics.scrubEvent({
    properties: { $current_url: `https://kisokar.app/invite/${token}`, $referrer: `https://kisokar.app/invite/${token}`, $pathname: `/invite/${token}`, title: 'Nombre' },
    $set_once: { $initial_current_url: `https://kisokar.app/invite/${token}` },
  })
  assert.ok(!JSON.stringify(event).includes(token), JSON.stringify(event))
  assert.equal(event.properties.title, undefined)
})

test('corrección financiera: el vínculo del original se ofrece aunque ya no esté en la lista', () => {
  const options = [{ id: 'a' }, { id: 'b' }]
  assert.equal(finance.keptLink('zz', options), 'zz')
  assert.equal(finance.keptLink('a', options), null)
  assert.equal(finance.keptLink(null, options), null)
  assert.equal(finance.keptLink(undefined, []), null)
})
