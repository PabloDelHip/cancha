import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 10C: dentro de un torneo finalizado con foto, equipos y jugadores con los nombres con que se jugó.
let server, h
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  h = await server.ssrLoadModule('/src/utils/historicalNames.ts')
})
after(async () => server?.close())

const live = { id: 'a', name: 'Halcones FC', shortName: 'HFC', logoUrl: 'nuevo.png', colors: { primary: '#f00', secondary: '#fff' }, city: 'Cancún' }
const identity = {
  historical: true,
  teams: [{ id: 'a', name: 'Halcones', shortName: 'HAL', logoUrl: null, colors: { primary: '#000', secondary: '#111' } }],
  players: [{ id: 'p', firstName: 'José', lastName: 'Núñez', nickname: null }],
}

test('equipo: nombre, abreviatura, escudo y colores de entonces; lo demás actual', () => {
  assert.deepEqual(h.teamAsPlayed(live, identity, 'a'), { ...live, name: 'Halcones', shortName: 'HAL', logoUrl: null, colors: { primary: '#000', secondary: '#111' } })
  assert.equal(h.teamAsPlayed(live, null, 'a'), live) // sin foto: el actual
  assert.equal(h.teamAsPlayed(live, { ...identity, teams: [] }, 'a'), live) // no está en la foto
  assert.equal(h.teamAsPlayed(undefined, identity, 'a'), undefined) // sin ficha: nada que pintar
})

test('jugador: nombre deportivo de entonces; edad y foto actuales', () => {
  const p = { id: 'p', firstName: 'Josué', lastName: 'Nunez', nickname: 'Pepe', age: 15, photoUrl: 'f.png' }
  assert.deepEqual(h.playerAsPlayed(p, identity, 'p'), { ...p, firstName: 'José', lastName: 'Núñez', nickname: null })
  assert.equal(h.playerAsPlayed(p, null, 'p'), p)
})
