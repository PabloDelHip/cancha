import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ID, Tournament, TournamentInput, TournamentTeam } from '@/types'
import { tournamentService } from '@/services'
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

  const ownership = createOwnership(async () =>
    (await tournamentService.listMine()).map((t) => ({ id: t.id, canEdit: true })),
  )

  const byId = computed(() => new Map(items.value.map((t) => [t.id, t])))
  /** Activos primero, luego borradores, luego finalizados; dentro, por fecha desc. */
  const sorted = computed(() => {
    const order = { active: 0, draft: 1, finished: 2 } as const
    return [...items.value].sort((a, b) => order[a.status] - order[b.status] || b.startDate.localeCompare(a.startDate))
  })
  const active = computed(() => sorted.value.filter((t) => t.status === 'active'))
  /** Torneos del organizador autenticado (panel /admin). */
  const mine = computed(() => sorted.value.filter((t) => ownership.ownedIds.value.has(t.id)))

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

  async function create(input: TournamentInput) {
    const created = await tournamentService.create(input)
    items.value.push(created)
    ownership.markMine(created.id)
    return created
  }
  async function update(id: ID, input: Partial<TournamentInput>, options?: { resetSchedule?: boolean }) {
    const updated = await tournamentService.update(id, input, options)
    items.value = items.value.map((t) => (t.id === id ? updated : t))
    return updated
  }
  function replace(updated: Tournament) {
    items.value = items.value.map((t) => (t.id === updated.id ? updated : t))
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
    ensureMine: ownership.ensureMine,
    isMine: ownership.isMine,
    resetMine: ownership.resetMine,
    get,
    teamIdsOf,
    tournamentsOfTeam,
    create,
    update,
    start,
    finish,
    enrollTeam,
    unenrollTeam,
  }
})
