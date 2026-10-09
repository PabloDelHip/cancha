import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  useMatchesStore,
  usePlayersStore,
  useRoundsStore,
  useStandingsStore,
  useTeamsStore,
  useTournamentsStore,
} from '@/stores'
import { computeTopScorers, POINTS } from '@/utils/stats'
import { isOpen } from '@/utils/matches'
import type { ID } from '@/types'

/**
 * Datos derivados de un torneo: equipos, jornadas, partidos, tabla y goleadores.
 */
export function useTournamentStats(tournamentId: MaybeRefOrGetter<ID>) {
  const tournaments = useTournamentsStore()
  const teams = useTeamsStore()
  const matches = useMatchesStore()
  const players = usePlayersStore()
  const roundsStore = useRoundsStore()
  const standingsStore = useStandingsStore()

  const tournament = computed(() => tournaments.get(toValue(tournamentId)))
  const teamIds = computed(() => tournaments.teamIdsOf(toValue(tournamentId)))
  const tournamentTeams = computed(() =>
    teamIds.value.map((id) => teams.get(id)).filter((t) => t !== undefined).sort((a, b) => a.name.localeCompare(b.name)),
  )
  const tournamentMatches = computed(() => matches.ofTournament(toValue(tournamentId)))
  const playedCount = computed(() => tournamentMatches.value.filter((m) => m.status === 'finished').length)
  /** Programados, en juego o pospuestos: lo que falta por jugarse. */
  const openCount = computed(() => tournamentMatches.value.filter(isOpen).length)
  const pointsRule = computed(() => tournament.value?.settings.points ?? POINTS)

  /**
   * Tabla de posiciones: la calcula el backend (fuente de verdad) y aquí solo se muestra.
   * Se vuelve a pedir cuando cambia algo de lo que depende: equipos inscritos, partidos
   * finalizados (marcador, equipos, fecha) o la puntuación del torneo.
   */
  const standingsVersion = computed(() => standingsStore.versionOf(toValue(tournamentId)))
  // Se espera a tener torneos y partidos: antes, la versión cambiaría varias veces seguidas.
  const dataReady = computed(() => tournaments.loaded && matches.loaded)
  watch(
    [() => toValue(tournamentId), standingsVersion, dataReady],
    ([id, version, ready]) => {
      if (id && ready) void standingsStore.sync(id, version)
    },
    { immediate: true },
  )
  const standings = computed(() => (standingsStore.of(toValue(tournamentId)) ?? []))
  const standingsLoaded = computed(() => standingsStore.of(toValue(tournamentId)) !== undefined)

  const topScorers = computed(() => {
    const ids = new Set(tournamentMatches.value.map((m) => m.id))
    // Ranking completo del torneo (las vistas resumidas recortan con slice).
    return computeTopScorers(
      tournamentMatches.value,
      matches.stats.filter((s) => ids.has(s.matchId)),
      Infinity,
    )
  })

  const totalGoals = computed(() =>
    tournamentMatches.value
      .filter((m) => m.status === 'finished')
      .reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0),
  )

  const roundViews = computed(() => roundsStore.roundsOf(toValue(tournamentId)))
  /** Compatibilidad con las vistas públicas: { round, label, matches }. */
  const rounds = computed(() => roundViews.value.map((r) => ({ round: r.number, label: r.label, matches: r.matches })))

  /**
   * Jornada "actual": la primera con partidos por jugarse (programados o en juego). Los
   * pospuestos no la retienen: se reprograman aparte.
   */
  const currentRound = computed(
    () =>
      rounds.value.find((r) => r.matches.some((m) => m.status === 'scheduled' || m.status === 'live'))?.round ??
      rounds.value[rounds.value.length - 1]?.round ??
      1,
  )

  const playersCount = computed(() => players.participantsOf(toValue(tournamentId)).length)

  return {
    tournament,
    teams: tournamentTeams,
    matches: tournamentMatches,
    rounds,
    roundViews,
    currentRound,
    playedCount,
    openCount,
    pointsRule,
    standings,
    standingsLoaded,
    topScorers,
    totalGoals,
    playersCount,
  }
}
