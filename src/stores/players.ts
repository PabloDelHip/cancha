import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ID, ISODate, Player, PlayerDetails, PlayerInput, RosterAssignment, TeamMembership, UploadProgress } from '@/types'
import { playerService } from '@/services'
import { POSITION_ORDER } from '@/utils/labels'
import { createLoader, createOwnership } from './loader'
import { useTournamentsStore } from './tournaments'

export interface RosterEntry {
  player: Player
  membership: TeamMembership
}

const byPositionAndNumber = (a: RosterEntry, b: RosterEntry) =>
  POSITION_ORDER.indexOf(a.player.position) - POSITION_ORDER.indexOf(b.player.position) ||
  (a.membership.shirtNumber ?? 99) - (b.membership.shirtNumber ?? 99)

/**
 * Jugadores (identidad global) y sus participaciones por torneo (TeamMembership).
 * Un jugador puede estar activo en varios torneos a la vez, con equipos distintos.
 */
export const usePlayersStore = defineStore('players', () => {
  const items = ref<Player[]>([])
  const memberships = ref<TeamMembership[]>([])

  const { loaded, ensure } = createLoader(async () => {
    const [players, allMemberships] = await Promise.all([playerService.list(), playerService.listMemberships()])
    items.value = players
    memberships.value = allMemberships
  })

  /**
   * Fecha de nacimiento exacta de las fichas de las que soy custodio (para el formulario de
   * edición). Nunca viene en las respuestas públicas: ahí solo está la edad.
   */
  const birthDates = ref(new Map<ID, ISODate | null>())
  const ownership = createOwnership(async () => {
    const refs = await playerService.listMine()
    birthDates.value = new Map(refs.filter((r) => r.birthDate !== undefined).map((r) => [r.id, r.birthDate ?? null]))
    return refs
  })

  const byId = computed(() => new Map(items.value.map((p) => [p.id, p])))
  /** Jugadores del panel: participan en mis torneos o registré su ficha. */
  const mine = computed(() => items.value.filter((p) => ownership.ownedIds.value.has(p.id)))
  const active = computed(() => memberships.value.filter((m) => m.status === 'active'))

  function get(id: ID | null | undefined) {
    return id ? byId.value.get(id) : undefined
  }
  /**
   * Participaciones actuales (plural): activas en torneos NO finalizados, más recientes primero.
   * Misma regla que el backend (GET /players/:id y /profile); aquí solo para listados del panel
   * y la búsqueda, que ya trabajan con las colecciones cargadas. El perfil usa el backend.
   */
  function currentParticipations(playerId: ID) {
    const tournaments = useTournamentsStore()
    return active.value
      .filter((m) => m.playerId === playerId && tournaments.get(m.tournamentId)?.status !== 'finished')
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }
  function birthDateOf(playerId: ID) {
    return birthDates.value.get(playerId) ?? null
  }
  /** ¿Se conoce la fecha exacta? Quien edita sin ser custodio (p. ej. el equipo) no la recibe. */
  function knowsBirthDate(playerId: ID) {
    return birthDates.value.has(playerId)
  }
  /** Reemplaza la ficha en memoria (o la agrega: el equipo edita jugadores que no estaban cargados). */
  function replace(updated: Player) {
    items.value = items.value.some((p) => p.id === updated.id) ? items.value.map((p) => (p.id === updated.id ? updated : p)) : [...items.value, updated]
    return updated
  }
  /** Guarda la ficha pública en la colección y la fecha exacta aparte (solo custodio). */
  function keep({ birthDate, ...player }: PlayerDetails): Player {
    birthDates.value = new Map(birthDates.value).set(player.id, birthDate)
    return player
  }
  /** Participación activa del jugador en un torneo concreto. */
  function membershipIn(tournamentId: ID, playerId: ID) {
    return active.value.find((m) => m.tournamentId === tournamentId && m.playerId === playerId)
  }
  function membershipsOf(playerId: ID) {
    return memberships.value
      .filter((m) => m.playerId === playerId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || (a.status === 'active' ? -1 : 1))
  }
  /**
   * Plantilla de un equipo. Con torneo: la de ese torneo. Sin torneo: jugadores activos con
   * el equipo en cualquier torneo (una entrada por jugador, la más reciente).
   */
  function rosterOf(teamId: ID, tournamentId?: ID): RosterEntry[] {
    const seen = new Set<ID>()
    return active.value
      .filter((m) => m.teamId === teamId && (!tournamentId || m.tournamentId === tournamentId))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .filter((m) => !seen.has(m.playerId) && Boolean(seen.add(m.playerId)))
      .map((membership) => ({ membership, player: byId.value.get(membership.playerId) }))
      .filter((e): e is RosterEntry => Boolean(e.player))
      .sort(byPositionAndNumber)
  }
  /** Participantes de un torneo (todos sus equipos). */
  function participantsOf(tournamentId: ID): RosterEntry[] {
    return active.value
      .filter((m) => m.tournamentId === tournamentId)
      .map((membership) => ({ membership, player: byId.value.get(membership.playerId) }))
      .filter((e): e is RosterEntry => Boolean(e.player))
      .sort(byPositionAndNumber)
  }

  /** Crea una ficha nueva (identidad global). Registrarla en un torneo es un paso aparte. */
  async function create(input: PlayerInput, opts?: { confirmNew?: boolean }) {
    const created = keep(await playerService.create(input, opts))
    items.value.push(created)
    ownership.markMine(created.id)
    return created
  }
  async function update(id: ID, input: Partial<PlayerInput>) {
    return replace(keep(await playerService.update(id, input)))
  }
  /** Foto en Cloudinary (vía API): reemplaza la ficha en memoria con la URL que devuelve el servidor. */
  async function setPhoto(id: ID, image: Blob, onProgress?: UploadProgress) {
    return replace(keep(await playerService.uploadPhoto(id, image, onProgress)))
  }
  async function removePhoto(id: ID) {
    return replace(keep(await playerService.removePhoto(id)))
  }
  /** Registra (o mueve) al jugador en un equipo de un torneo propio. */
  async function register(playerId: ID, assignment: RosterAssignment) {
    const current = membershipIn(assignment.tournamentId, playerId)
    if (current && current.teamId === assignment.teamId && current.shirtNumber === assignment.shirtNumber) return
    const updated = await playerService.register(playerId, assignment)
    memberships.value = [...memberships.value.filter((m) => m.playerId !== playerId), ...updated]
    // Ahora participa en uno de mis torneos: aparece en el panel (editable solo si es mío).
    if (!ownership.isMine(playerId)) ownership.markMine(playerId, false)
  }
  async function unregister(tournamentId: ID, playerId: ID) {
    await playerService.unregister(tournamentId, playerId)
    memberships.value = await playerService.listMemberships(playerId).then((own) => [
      ...memberships.value.filter((m) => m.playerId !== playerId),
      ...own,
    ])
  }

  return {
    items,
    memberships,
    loaded,
    ensure,
    mine,
    ensureMine: ownership.ensureMine,
    isMine: ownership.isMine,
    canEdit: ownership.canEdit,
    resetMine: ownership.resetMine,
    get,
    currentParticipations,
    birthDateOf,
    knowsBirthDate,
    membershipIn,
    membershipsOf,
    rosterOf,
    participantsOf,
    create,
    update,
    setPhoto,
    removePhoto,
    register,
    unregister,
  }
})
