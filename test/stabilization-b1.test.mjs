import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// B1: la carga por torneo se mezcla en los stores sin duplicar, sin dejar datos viejos y sin pisar fichas actuales.
let server, m
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  m = await server.ssrLoadModule('/src/utils/merge.ts')
})
after(async () => server?.close())

test('upsertById: agrega lo nuevo y reemplaza lo que ya estaba, sin duplicar ni reordenar', () => {
  const current = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }]
  const out = m.upsertById(current, [{ id: 'b', v: 2 }, { id: 'c', v: 2 }])
  assert.deepEqual(out, [{ id: 'a', v: 1 }, { id: 'b', v: 2 }, { id: 'c', v: 2 }])
  assert.equal(m.upsertById(current, []), current)
})

test('upsertById con keepExisting: una ficha histórica no pisa la actual, pero sí se agrega si falta', () => {
  const current = [{ id: 'p1', name: 'Josué Renombrado' }]
  const out = m.upsertById(current, [{ id: 'p1', name: 'José Núñez' }, { id: 'p2', name: 'Iván' }], true)
  assert.deepEqual(out, [{ id: 'p1', name: 'Josué Renombrado' }, { id: 'p2', name: 'Iván' }])
})

test('replaceScope: lo del torneo se reemplaza entero; lo de otros torneos queda intacto', () => {
  const current = [
    { id: 'm1', t: 'A', s: 'scheduled' },
    { id: 'm2', t: 'A', s: 'scheduled' }, // borrado en el servidor
    { id: 'x1', t: 'B', s: 'finished' },
  ]
  const out = m.replaceScope(current, [{ id: 'm1', t: 'A', s: 'finished' }, { id: 'm3', t: 'A', s: 'scheduled' }], (x) => x.t === 'A')
  assert.deepEqual(out, [{ id: 'x1', t: 'B', s: 'finished' }, { id: 'm1', t: 'A', s: 'finished' }, { id: 'm3', t: 'A', s: 'scheduled' }])
})

test('replaceScope: un elemento que cambió de torneo no queda repetido', () => {
  const current = [{ id: 'm1', t: 'B' }, { id: 'x', t: 'B' }]
  const out = m.replaceScope(current, [{ id: 'm1', t: 'A' }], (x) => x.t === 'A')
  assert.deepEqual(out, [{ id: 'x', t: 'B' }, { id: 'm1', t: 'A' }])
  assert.equal(new Set(out.map((x) => x.id)).size, out.length)
})

test('replaceScope: cargar dos veces el mismo torneo deja exactamente lo mismo', () => {
  const incoming = [{ id: 'm1', t: 'A' }, { id: 'm2', t: 'A' }]
  const once = m.replaceScope([{ id: 'x', t: 'B' }], incoming, (x) => x.t === 'A')
  assert.deepEqual(m.replaceScope(once, incoming, (x) => x.t === 'A'), once)
})
