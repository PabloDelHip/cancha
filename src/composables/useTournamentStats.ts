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
import { isPubliclyTracked } from '@/utils/coverage'
import type { ID } from '@/types'

/**
 * Datos derivados de un torneo: equipos, jornadas, partidos, tabla y goleadores.
 * `publicView` (vistas públicas): en seguimiento parcial, partidos, jornadas y contadores solo con
 * los partidos de equipos seguidos (6G). El panel del organizador lo omite y ve todos.
 */
export function useTournamentStats(tournamentId: MaybeRefOrGetter<ID>, { publicView = false } = {}) {
  const tournaments = useTournamentsStore()
  const teams = useTeamsStore()
  const matches = useMatchesStore()
  const players = usePlayersStore()
  const roundsStore = useRoundsStore()
  const standingsStore = useStandingsStore()

  const tournament = computed(() => tournaments.get(toValue(tournamentId)))
  /**
   * Seguimiento parcial (6F, `Tournament.dataCoverage`): sin rankings GLOBALES. `standings` y
   * `topScorers` quedan vacíos (ni se piden al servidor, que respondería 409) y cada vista debe
   * ocultar su sección con `partial`, nunca mostrar una tabla vacía. Partidos y equipos, igual.
   */
  const partial = computed(() => tournament.value?.dataCoverage === 'partial')
  const teamIds = computed(() => tournaments.teamIdsOf(toValue(tournamentId)))
  const tournamentTeams = computed(() =>
    teamIds.value.map((id) => teams.get(id)).filter((t) => t !== undefined).sort((a, b) => a.name.localeCompare(b.name)),
  )
  const tournamentMatches = computed(() => {
    const all = matches.ofTournament(toValue(tournamentId))
    return publicView ? all.filter((m) => isPubliclyTracked(m, tournament.value)) : all
  })
  /** Equipos en seguimiento (6G), en el orden del nombre. Vacío en FULL. */
  const trackedTeams = computed(() => {
    const ids = new Set(partial.value ? (tournament.value?.trackedTeamIds ?? []) : [])
    return tournamentTeams.value.filter((t) => ids.has(t.id))
  })
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
    [() => toValue(tournamentId), standingsVersion, dataReady, partial],
    ([id, version, ready, isPartial]) => {
      // Al volver a cobertura completa se pide la tabla (la versión de datos no cambió).
      if (id && ready && !isPartial) void standingsStore.sync(id, version)
    },
    { immediate: true },
  )
  const standings = computed(() => (partial.value ? [] : (standingsStore.of(toValue(tournamentId)) ?? [])))
  const standingsLoaded = computed(() => partial.value || standingsStore.of(toValue(tournamentId)) !== undefined)

  const topScorers = computed(() => {
    if (partial.value) return []
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
  const rounds = computed(() =>
    roundViews.value
      .map((r) => ({ round: r.number, label: r.label, matches: publicView ? r.matches.filter((m) => isPubliclyTracked(m, tournament.value)) : r.matches }))
      // En la vista pública parcial, una jornada sin partidos seguidos no se muestra.
      .filter((r) => !(publicView && partial.value) || r.matches.length),
  )

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
    partial,
    teams: tournamentTeams,
    trackedTeams,
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
