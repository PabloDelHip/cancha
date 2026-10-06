import type { ID, Player, TeamMembership } from '@/types'

export function fullName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`.trim()
}

/** Nombre con apodo, como se presenta en el perfil y en las búsquedas: José Luis Hernández "Bigotes". */
export function displayName(player: Pick<Player, 'firstName' | 'lastName'> & { nickname?: string | null }): string {
  return player.nickname ? `${fullName(player)} “${player.nickname}”` : fullName(player)
}

/**
 * Búsqueda local de jugadores con las MISMAS reglas que GET /players?search=: nombre, apellidos y
 * apodo, sin acentos, cada palabra en cualquier orden, sin comillas.
 */
export function matchesPlayerSearch(player: Pick<Player, 'firstName' | 'lastName'> & { nickname?: string | null }, query: string): boolean {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const words = norm(query.replace(/["'“”‘’«»]/g, ' ')).split(/\s+/).filter(Boolean)
  const haystack = norm(`${player.firstName} ${player.lastName} ${player.nickname ?? ''}`)
  return words.every((w) => haystack.includes(w))
}

/** Nombre corto para tablas en móvil: "P. Hipólito". */
export function shortName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  const first = player.firstName.charAt(0)
  const last = player.lastName.split(' ')[0] ?? ''
  return first ? `${first}. ${last}` : last
}

export function activeMembership(memberships: TeamMembership[], playerId: ID): TeamMembership | undefined {
  return memberships.find((m) => m.playerId === playerId && m.status === 'active')
}
