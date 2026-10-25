/**
 * B1 — mezclar en los stores lo que llega de UN torneo sin perder lo de los demás (funciones puras).
 * Los stores son cachés de colecciones: cada pantalla aporta su parte y nada queda duplicado.
 */

/**
 * Agrega o reemplaza por id. `keepExisting`: si ya está, se conserva la versión cargada (los
 * jugadores de un torneo finalizado llegan con su nombre histórico y no deben pisar la ficha actual).
 */
export function upsertById<T extends { id: string }>(current: T[], incoming: T[], keepExisting = false): T[] {
  if (!incoming.length) return current
  const byId = new Map(incoming.map((x) => [x.id, x]))
  const out = current.map((x) => {
    const next = byId.get(x.id)
    if (!next) return x
    byId.delete(x.id)
    return keepExisting ? x : next
  })
  return [...out, ...byId.values()]
}

/**
 * Reemplaza todo lo de un ámbito (p. ej. los partidos de un torneo) por lo que devolvió el servidor:
 * lo que ya no está desaparece, y un elemento que cambió de ámbito no queda repetido.
 */
export function replaceScope<T extends { id: string }>(current: T[], incoming: T[], inScope: (x: T) => boolean): T[] {
  const fresh = new Set(incoming.map((x) => x.id))
  return [...current.filter((x) => !inScope(x) && !fresh.has(x.id)), ...incoming]
}
