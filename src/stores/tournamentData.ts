import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ID } from '@/types'
import { matchService, playerService, roundService, teamService, tournamentService } from '@/services'
import { useHistoricalNamesStore } from './historicalNames'
import { useMatchesStore } from './matches'
import { usePlayersStore } from './players'
import { useRoundsStore } from './rounds'
import { useTeamsStore } from './teams'
import { useTournamentsStore } from './tournaments'

/**
 * B1 (P1-1) — los datos de UN torneo, en lugar de las colecciones de toda la plataforma: el torneo,
 * sus inscripciones, equipos, partidos con estadísticas, jornadas, participaciones (también las
 * cerradas) y jugadores. Llenan los MISMOS stores que la carga global, así que los componentes
 * leen igual (`matches.ofTournament`, `teams.get`, `players.rosterOn`…).
 *
 * - Todo o nada: se mezcla en los stores solo si llegaron todas las respuestas (un 404 de un
 *   borrador ajeno no deja nada a medias). Cada endpoint aplica sus propios permisos.
 * - Nombres históricos (10C): equipos y jugadores se guardan con su ficha ACTUAL; el store de
 *   nombres históricos los sobrepone en su torneo. Los jugadores de un torneo finalizado llegan ya
 *   con el nombre con que jugaron, así que no pisan una ficha actual ya cargada; los que no están
 *   en esa lista (bajas, sin participación) se piden con su ficha actual. En un torneo finalizado la
 *   carga termina cuando ya está su foto de nombres: la página no muestra un instante los actuales.
 * - Cada torneo se pide una vez por sesión (como la carga global); `force` lo vuelve a pedir.
 */
export const useTournamentDataStore = defineStore('tournamentData', () => {
  const loaded = ref(new Set<ID>())
  const pending = new Map<ID, Promise<void>>()

  function isLoaded(tournamentId: ID) {
    return loaded.value.has(tournamentId)
  }

  function ensure(tournamentId: ID, force = false): Promise<void> {
    const inFlight = pending.get(tournamentId)
    if (inFlight) return inFlight
    if (loaded.value.has(tournamentId) && !force) return Promise.resolve()
    const run = load(tournamentId)
      .then(() => {
        loaded.value = new Set(loaded.value).add(tournamentId)
      })
      .finally(() => pending.delete(tournamentId))
    pending.set(tournamentId, run)
    return run
  }

  /** Al cambiar de sesión: lo visible (borradores) depende de quién mira. */
  function reset() {
    loaded.value = new Set()
  }

  return { isLoaded, ensure, reset }
})

async function load(tournamentId: ID) {
  const players = usePlayersStore()
  const [tournament, enrollments, teams, matches, stats, rounds, memberships, roster] = await Promise.all([
    tournamentService.get(tournamentId),
    tournamentService.listTeams(tournamentId),
    teamService.listByTournament(tournamentId),
    matchService.listByTournament(tournamentId),
    matchService.listStatsByTournament(tournamentId),
    roundService.listByTournament(tournamentId),
    playerService.listMembershipsByTournament(tournamentId),
    playerService.listByTournament(tournamentId),
  ])
  const historical = tournament.status === 'finished'
  // Jugadores con participación cerrada o solo con estadísticas: su ficha actual, uno por uno (suelen ser pocos).
  const listed = new Set(roster.map((p) => p.id))
  const missing = [...new Set([...memberships.map((m) => m.playerId), ...stats.map((s) => s.playerId)])].filter(
    (id) => !listed.has(id) && !players.isCurrent(id),
  )
  // Una ficha borrada (404) no impide el resto: tampoco estaría en la carga global.
  const extra = (await Promise.all(missing.map((id) => playerService.get(id).catch(() => null)))).filter((p) => p !== null)

  // Todo junto, sin esperas intermedias: las vistas nunca ven el torneo a medias.
  useTournamentsStore().mergeTournament(tournament, enrollments)
  useTeamsStore().upsert(teams)
  players.upsert(extra)
  players.upsert(roster, historical)
  players.replaceTournamentMemberships(tournamentId, memberships)
  useMatchesStore().replaceTournament(tournamentId, matches, stats)
  useRoundsStore().replaceTournament(tournamentId, rounds)
  // 10C: la misma petición que haría la página al pintarse, pero antes (si falla, se ven los actuales).
  if (historical) await useHistoricalNamesStore().ensure(tournamentId)
}
