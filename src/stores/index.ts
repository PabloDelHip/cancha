import { useMatchesStore } from './matches'
import { usePlayersStore } from './players'
import { useRoundsStore } from './rounds'
import { useStandingsStore } from './standings'
import { useTeamsStore } from './teams'
import { useTournamentsStore } from './tournaments'
import { useHomeStore } from './home'
import { useTournamentDataStore } from './tournamentData'

export { useHomeStore, useMatchesStore, usePlayersStore, useRoundsStore, useStandingsStore, useTeamsStore, useTournamentDataStore, useTournamentsStore }
export { useAuthStore } from './auth'
export { useHistoricalNamesStore } from './historicalNames'
export type { RosterEntry } from './players'
export type { RoundView } from './rounds'
export { roundLabel } from './rounds'

/** Carga (una sola vez) todas las colecciones del dominio. */
export function ensureLeagueData(force = false) {
  return Promise.all([
    useTournamentsStore().ensure(force),
    useTeamsStore().ensure(force),
    usePlayersStore().ensure(force),
    useMatchesStore().ensure(force),
    useRoundsStore().ensure(force),
  ])
}

/** B1: solo los datos de un torneo (ver stores/tournamentData.ts), en lugar de toda la plataforma. */
export function ensureTournamentData(tournamentId: string, force = false) {
  return useTournamentDataStore().ensure(tournamentId, force)
}

/** Datos del panel: colecciones + qué torneos, equipos y jugadores administra el usuario. */
export function ensureAdminData(force = false) {
  return Promise.all([
    ensureLeagueData(force),
    useTournamentsStore().ensureMine(force),
    useTeamsStore().ensureMine(force),
    usePlayersStore().ensureMine(force),
    useHomeStore().ensure(force),
  ])
}
