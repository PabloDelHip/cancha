import { publicTournament } from '@/types/tournamentInformation'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ID, Tournament, TournamentInput, TournamentPermission, TournamentRole, TournamentTeam } from '@/types'
import { leagueService, tournamentService } from '@/services'
import { createLoader, createOwnership } from './loader'
import { useTeamsStore } from './teams'

export const useTournamentsStore = defineStore('tournaments', () => {
  const items = ref<Tournament[]>([])
  const enrollments = ref<TournamentTeam[]>([])

  const { loaded, ensure } = createLoader(async () => {
    const [tournaments, tournamentTeams] = await Promise.all([tournamentService.list(), tournamentService.listTeams()])
    items.value = tournaments
    enrollments.value = tournamentTeams
  })

  /** Mi rol y permisos por torneo (RBAC). Sin entrada y siendo mío (recién creado, demo): propietario. */
  const access = ref(new Map<ID, { role: TournamentRole; permissions: TournamentPermission[] }>())
  const ownership = createOwnership(async () => {
    const list = await tournamentService.listMine()
    access.value = new Map(list.filter((t) => t.myRole).map((t) => [t.id, { role: t.myRole!, permissions: t.permissions ?? [] }]))
    return list.map((t) => ({ id: t.id, canEdit: true }))
  })
  function roleOf(id: ID): TournamentRole | null {
    return access.value.get(id)?.role ?? (ownership.isMine(id) ? 'OWNER' : null)
  }
  /** La interfaz muestra solo lo permitido; el servidor lo vuelve a validar siempre. */
  function can(id: ID, permission: TournamentPermission) {
    const a = access.value.get(id)
    return a ? a.permissions.includes(permission) : ownership.isMine(id)
  }

  const byId = computed(() => new Map(items.value.map((t) => [t.id, t])))
  /** Activos primero, luego borradores, luego finalizados; dentro, por fecha desc. */
  const sorted = computed(() => {
    const order = { active: 0, draft: 1, finished: 2 } as const
    return [...items.value].sort((a, b) => order[a.status] - order[b.status] || b.startDate.localeCompare(a.startDate))
  })
  const active = computed(() => sorted.value.filter((t) => t.status === 'active'))
  /** Torneos del organizador autenticado (panel /admin). */
  const mine = computed(() => sorted.value.filter((t) => ownership.ownedIds.value.has(t.id)))
  /** Panel: los que organizo y aquellos donde colaboro. */
  const organized = computed(() => mine.value.filter((t) => roleOf(t.id) === 'OWNER'))
  const collaborating = computed(() => mine.value.filter((t) => roleOf(t.id) !== 'OWNER'))

  function get(id: ID) {
    return byId.value.get(id)
  }
  function teamIdsOf(tournamentId: ID): ID[] {
    return enrollments.value.filter((e) => e.tournamentId === tournamentId).map((e) => e.teamId)
  }
  function tournamentsOfTeam(teamId: ID): Tournament[] {
    return enrollments.value
      .filter((e) => e.teamId === teamId)
      .map((e) => byId.value.get(e.tournamentId))
      .filter((t): t is Tournament => Boolean(t))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

  /** "Nueva liga…" en el formulario: se crea primero y el torneo va dentro. */
  async function withLeague<T extends Partial<TournamentInput>>(input: T): Promise<T> {
    if (!input.newLeagueName) return input
    const league = await leagueService.create({ name: input.newLeagueName, city: null, description: null })
    return { ...input, leagueId: league.id, newLeagueName: undefined }
  }
  async function create(input: TournamentInput) {
    const created = await tournamentService.create(await withLeague(input))
    items.value.push(publicTournament(created))
    ownership.markMine(created.id)
    return created
  }
  async function update(id: ID, input: Partial<TournamentInput>, options?: { resetSchedule?: boolean; releaseAssignments?: boolean }) {
    const updated = await tournamentService.update(id, await withLeague(input), options)
    items.value = items.value.map((t) => (t.id === id ? publicTournament(updated) : t))
    return updated
  }
  function replace(updated: Tournament) {
    items.value = items.value.map((t) => (t.id === updated.id ? publicTournament(updated) : t))
  }
  async function start(id: ID) {
    const updated = await tournamentService.start(id)
    replace(updated)
    return updated
  }
  async function finish(id: ID, allowPendingMatches: boolean) {
    const { tournament, summary } = await tournamentService.finish(id, allowPendingMatches)
    replace(tournament)
    return summary
  }
  async function enrollTeam(tournamentId: ID, teamId: ID) {
    const created = await tournamentService.addTeam(tournamentId, teamId)
    if (!enrollments.value.some((e) => e.id === created.id)) enrollments.value.push(created)
    // Aparece en el panel ("equipos de mis torneos") aunque su ficha sea de otro organizador.
    const teams = useTeamsStore()
    if (!teams.isMine(teamId)) teams.markMine(teamId, false)
  }
  async function unenrollTeam(tournamentId: ID, teamId: ID) {
    await tournamentService.removeTeam(tournamentId, teamId)
    enrollments.value = enrollments.value.filter((e) => !(e.tournamentId === tournamentId && e.teamId === teamId))
    // El servidor también lo quita de los equipos en seguimiento (6G): mismo estado aquí.
    items.value = items.value.map((t) => (t.id === tournamentId ? { ...t, trackedTeamIds: t.trackedTeamIds.filter((id) => id !== teamId) } : t))
  }

  return {
    items,
    enrollments,
    loaded,
    ensure,
    sorted,
    active,
    mine,
    organized,
    collaborating,
    roleOf,
    can,
    ensureMine: ownership.ensureMine,
    isMine: ownership.isMine,
    resetMine: ownership.resetMine,
    get,
    teamIdsOf,
    tournamentsOfTeam,
    create,
    replace,
    update,
    start,
    finish,
    enrollTeam,
    unenrollTeam,
  }
})
