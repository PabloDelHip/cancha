import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ID, Match, MatchInput, MatchResultInput, PlayerMatchStats } from '@/types'
import { matchService } from '@/services'
import type { GenerateScheduleInput } from '@/services/matchService'
import { useRoundsStore } from './rounds'
import { compareMatchesAsc } from '@/utils/stats'
import { createLoader } from './loader'

export const useMatchesStore = defineStore('matches', () => {
  const items = ref<Match[]>([])
  const stats = ref<PlayerMatchStats[]>([])

  const { loaded, ensure } = createLoader(async () => {
    const [matches, allStats] = await Promise.all([matchService.list(), matchService.listStats()])
    items.value = matches
    stats.value = allStats
  })

  const byId = computed(() => new Map(items.value.map((m) => [m.id, m])))
  const chronological = computed(() => [...items.value].sort(compareMatchesAsc))
  const statsByMatch = computed(() => {
    const map = new Map<ID, PlayerMatchStats[]>()
    for (const s of stats.value) {
      const list = map.get(s.matchId) ?? []
      list.push(s)
      map.set(s.matchId, list)
    }
    return map
  })

  const live = computed(() => chronological.value.filter((m) => m.status === 'live'))
  const upcoming = computed(() => chronological.value.filter((m) => m.status === 'scheduled'))
  const recent = computed(() => chronological.value.filter((m) => m.status === 'finished').reverse())

  function get(id: ID) {
    return byId.value.get(id)
  }
  function ofTournament(tournamentId: ID) {
    return chronological.value.filter((m) => m.tournamentId === tournamentId)
  }
  function ofTeam(teamId: ID) {
    return chronological.value.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
  }
  function statsOf(matchId: ID) {
    return statsByMatch.value.get(matchId) ?? []
  }
  function statsOfPlayer(playerId: ID) {
    return stats.value.filter((s) => s.playerId === playerId)
  }

  async function create(input: MatchInput) {
    const created = await matchService.create(input)
    items.value.push(created)
    return created
  }
  async function update(id: ID, input: Partial<MatchInput>) {
    const updated = await matchService.update(id, input)
    items.value = items.value.map((m) => (m.id === id ? updated : m))
    return updated
  }
  async function saveResult(id: ID, result: MatchResultInput) {
    const saved = await matchService.saveResult(id, result)
    items.value = items.value.map((m) => (m.id === id ? saved.match : m))
    stats.value = [...stats.value.filter((s) => s.matchId !== id), ...saved.stats]
    return saved.match
  }

  /** Cambios ya guardados por otro servicio (p. ej. árbitros asignados). */
  function patch(id: ID, changes: Partial<Match>) {
    items.value = items.value.map((m) => (m.id === id ? { ...m, ...changes } : m))
  }

  async function remove(id: ID) {
    await matchService.remove(id)
    items.value = items.value.filter((m) => m.id !== id)
  }
  /** Genera el calendario en el servidor y sustituye partidos y jornadas del torneo. */
  async function generateSchedule(tournamentId: ID, options: GenerateScheduleInput) {
    const { rounds, matches } = await matchService.generateSchedule(tournamentId, options)
    items.value = [...items.value.filter((m) => m.tournamentId !== tournamentId), ...matches]
    useRoundsStore().replaceTournament(tournamentId, rounds)
    return { rounds, matches }
  }

  return {
    items,
    stats,
    loaded,
    ensure,
    chronological,
    live,
    upcoming,
    recent,
    get,
    ofTournament,
    ofTeam,
    statsOf,
    statsOfPlayer,
    create,
    update,
    saveResult,
    remove,
    patch,
    generateSchedule,
  }
})
