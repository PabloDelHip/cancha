/**
 * En modo mock, esta capa HACE DE BACKEND para el perfil del equipo: implementa el mismo contrato
 * que GET /teams/:id/profile y GET /teams/:id/matches con las mismas reglas que
 * backend/src/modules/statistics/team-profile.ts (única copia local, como computeStandings para la
 * tabla). La UI consume el contrato sin saber qué proveedor lo sirve.
 *
 * Reglas (idénticas al backend):
 * - Balance y goles: solo partidos FINISHED con marcador.
 * - Goleadores del equipo: solo lo hecho con ESTE equipo (PlayerMatchStats.teamId).
 * - Plantillas: siempre por competición (TeamMembership.tournamentId); no hay plantilla global.
 * - Participación actual: inscripción en un torneo no finalizado.
 * - Posición final verificable: torneo finalizado, sin pendientes y sin empate de criterios.
 * - Honors: campeón de LIGA solo con esa posición final verificable = 1.
 */
import type {
  FormResult,
  ID,
  Match,
  Player,
  PlayerMatchStats,
  SquadEntry,
  Standing,
  Team,
  TeamCompetition,
  TeamMatch,
  TeamMembership,
  TeamProfile,
  TeamRecord,
  TeamRef,
  TeamStanding,
  TeamTopScorer,
  Tournament,
  TournamentRef,
} from '@/types'
import { POSITION_ORDER } from '@/utils/labels'
import { computeStandings, isPlayed, resultFor } from '@/utils/stats'
import { getDb } from './db'
import { toPublicPlayer } from './playerProfile'

export const RECENT_TEAM_MATCHES = 5
const UPCOMING_MATCHES = 3
const TOP_SCORERS = 10
const FORM_LENGTH = 5

export interface TeamProfileInput {
  team: Team
  /** Torneos donde está inscrito o tiene partidos. */
  tournaments: Tournament[]
  enrolledTournamentIds: Set<ID>
  /** Todos los partidos de esos torneos (para saber si quedó alguno pendiente). */
  tournamentMatches: Map<ID, Match[]>
  /** Estadísticas individuales registradas con este equipo. */
  stats: PlayerMatchStats[]
  /** Participaciones de jugadores con este equipo (cualquier torneo). */
  memberships: TeamMembership[]
  players: Map<ID, Player>
  teams: Map<ID, Team>
  /** Tablas de posiciones del servidor (GET /standings), por torneo. */
  standings: Map<ID, Standing[]>
}

const emptyRecord = (): TeamRecord => ({ played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 })

function recordOf(teamId: ID, matches: Match[]): TeamRecord {
  const r = emptyRecord()
  for (const m of matches) {
    if (!isPlayed(m)) continue
    const own = m.homeTeamId === teamId ? m.homeScore : m.awayScore
    const rival = m.homeTeamId === teamId ? m.awayScore : m.homeScore
    r.played++
    r.goalsFor += own
    r.goalsAgainst += rival
    if (own > rival) r.won++
    else if (own < rival) r.lost++
    else r.drawn++
  }
  r.goalDifference = r.goalsFor - r.goalsAgainst
  return r
}

const teamRef = (t: Team | undefined): TeamRef | null =>
  t ? { id: t.id, name: t.name, shortName: t.shortName, logoUrl: t.logoUrl, colors: t.colors } : null

const tournamentRef = (t: Tournament): TournamentRef => ({
  dataCoverage: t.dataCoverage ?? 'full',
  id: t.id,
  name: t.name,
  status: t.status,
  category: t.category,
  modality: t.modality,
  startDate: t.startDate,
  endDate: t.endDate,
})

const publicPlayer = (p: Player): SquadEntry['player'] => ({
  id: p.id,
  firstName: p.firstName,
  lastName: p.lastName,
  position: p.position,
  photoUrl: p.photoUrl,
  age: p.age,
})

const byKickoff = (a: Match, b: Match) => `${a.date}${a.time}${a.id}`.localeCompare(`${b.date}${b.time}${b.id}`)

function standingOf(teamId: ID, rows: Standing[] | undefined): TeamStanding | null {
  const row = rows?.find((r) => r.teamId === teamId)
  return row && rows ? { position: row.position, teams: rows.length, points: row.points } : null
}

/** Posición final verificable (ver cabecera). */
export function finalStandingOf(teamId: ID, tournament: Tournament, all: Match[], rows: Standing[] | undefined): TeamStanding | null {
  if (tournament.status !== 'finished' || !rows) return null
  if (all.some((m) => m.status === 'scheduled' || m.status === 'live' || m.status === 'postponed')) return null
  const i = rows.findIndex((r) => r.teamId === teamId)
  if (i < 0 || rows[i]!.played === 0) return null
  const same = (a: Standing | undefined, b: Standing) =>
    !!a && a.points === b.points && a.goalDifference === b.goalDifference && a.goalsFor === b.goalsFor
  if (same(rows[i - 1], rows[i]!) || same(rows[i + 1], rows[i]!)) return null
  return standingOf(teamId, rows)
}

export function toTeamMatch(m: Match, teamId: ID, teams: Map<ID, Team>, tournaments: Map<ID, Tournament>): TeamMatch {
  const t = tournaments.get(m.tournamentId)
  return {
    id: m.id,
    date: m.date,
    time: m.time,
    round: m.round,
    status: m.status,
    tournament: t ? { id: t.id, name: t.name } : null,
    homeTeam: teamRef(teams.get(m.homeTeamId)),
    awayTeam: teamRef(teams.get(m.awayTeamId)),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    result: resultFor(m, teamId),
  }
}

/** Igual que rankContributors del backend: goleadores o asistidores (> 0), desempate determinista. */
function rankContributors(stats: PlayerMatchStats[], players: Map<ID, Player>, metric: 'goals' | 'assists', limit: number): TeamTopScorer[] {
  const rows = new Map<ID, { goals: number; assists: number; appearances: number }>()
  for (const s of stats) {
    const row = rows.get(s.playerId) ?? { goals: 0, assists: 0, appearances: 0 }
    row.goals += s.goals
    row.assists += s.assists
    row.appearances++
    rows.set(s.playerId, row)
  }
  const other = metric === 'goals' ? 'assists' : 'goals'
  return [...rows.entries()]
    .map(([id, row]) => ({ p: players.get(id), row }))
    .filter((x): x is { p: Player; row: { goals: number; assists: number; appearances: number } } => Boolean(x.p) && x.row[metric] > 0)
    .sort(
      (a, b) =>
        b.row[metric] - a.row[metric] ||
        a.row.appearances - b.row.appearances ||
        b.row[other] - a.row[other] ||
        `${a.p.lastName} ${a.p.firstName}`.localeCompare(`${b.p.lastName} ${b.p.firstName}`),
    )
    .slice(0, limit)
    .map(({ p, row }) => ({ player: publicPlayer(p), ...row }))
}

export function buildTeamProfile(input: TeamProfileInput): { profile: TeamProfile; finishedMatches: TeamMatch[] } {
  const { team, players, teams, standings } = input
  const tournamentById = new Map(input.tournaments.map((t) => [t.id, t]))
  const teamMatches = [...input.tournamentMatches.values()]
    .flat()
    .filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
    .sort(byKickoff)
  const finishedIds = new Set(teamMatches.filter(isPlayed).map((m) => m.id))
  const matchById = new Map(teamMatches.map((m) => [m.id, m]))
  // Solo estadísticas oficiales: partido finalizado y registradas con ESTE equipo.
  const stats = input.stats.filter((s) => s.teamId === team.id && finishedIds.has(s.matchId))

  const competitions: TeamCompetition[] = input.tournaments.map((t) => {
    const all = input.tournamentMatches.get(t.id) ?? []
    const mine = all.filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
    const current = t.status !== 'finished' && input.enrolledTournamentIds.has(t.id)

    const hasResults = all.some(isPlayed)
    const squadStats = stats.filter((s) => matchById.get(s.matchId)?.tournamentId === t.id)
    const squad: SquadEntry[] = input.memberships
      .filter((m) => m.tournamentId === t.id)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      // una entrada por jugador (la participación más reciente en esta competición)
      .filter((m, i, list) => list.findIndex((x) => x.playerId === m.playerId) === i)
      .map((m) => ({ m, p: players.get(m.playerId) }))
      .filter((x): x is { m: TeamMembership; p: Player } => Boolean(x.p))
      .map(({ m, p }) => {
        const own = squadStats.filter((s) => s.playerId === p.id)
        return {
          player: publicPlayer(p),
          shirtNumber: m.shirtNumber,
          active: m.status === 'active',
          appearances: own.length,
          goals: own.reduce((sum, s) => sum + s.goals, 0),
        }
      })
      .sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          POSITION_ORDER.indexOf(a.player.position) - POSITION_ORDER.indexOf(b.player.position) ||
          (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99),
      )
    return {
      tournament: tournamentRef(t),
      current,
      record: recordOf(team.id, mine),
      standing: current && hasResults ? standingOf(team.id, standings.get(t.id)) : null,
      finalStanding: finalStandingOf(team.id, t, all, standings.get(t.id)),
      squad,
    }
  })
  competitions.sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      b.tournament.startDate.localeCompare(a.tournament.startDate) ||
      a.tournament.id.localeCompare(b.tournament.id),
  )

  const topScorers = rankContributors(stats, players, 'goals', TOP_SCORERS)
  const topAssists = rankContributors(stats, players, 'assists', TOP_SCORERS)

  const finished = teamMatches.filter(isPlayed).reverse()
  const years = new Map<string, TeamProfile['history'][number]['competitions']>()
  for (const c of competitions) {
    const year = c.tournament.startDate.slice(0, 4)
    const { tournament, record, finalStanding, current } = c
    years.set(year, [...(years.get(year) ?? []), { tournament, record, finalStanding, current }])
  }

  const finishedMatches = finished.map((m) => toTeamMatch(m, team.id, teams, tournamentById))
  const profile: TeamProfile = {
    team: { ...teamRef(team)!, city: team.city },
    // La plantilla global (6B) solo existe en el servidor: en modo demo siempre vacía.
    currentRoster: [],
    record: { ...recordOf(team.id, teamMatches), competitions: competitions.length },
    form: finished
      .slice(0, FORM_LENGTH)
      .map((m) => resultFor(m, team.id))
      .filter((r): r is FormResult => r !== null)
      .reverse(),
    competitions,
    topScorers,
    topAssists,
    playerStats: [],
    runnerUps: [],
    records: { biggestWin: null, biggestLoss: null, cleanSheets: { count: 0, played: 0, rate: null }, bestTournament: null, worstTournament: null },
    recentMatches: finishedMatches.slice(0, RECENT_TEAM_MATCHES),
    upcomingMatches: teamMatches
      .filter((m) => (m.status === 'scheduled' || m.status === 'live') && tournamentById.get(m.tournamentId)?.status !== 'finished')
      .slice(0, UPCOMING_MATCHES)
      .map((m) => toTeamMatch(m, team.id, teams, tournamentById)),
    history: [...years.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([year, list]) => ({ year, competitions: list })),
    honors: competitions
      .filter((c) => c.finalStanding?.position === 1 && tournamentById.get(c.tournament.id)?.settings.system === 'league')
      .map((c) => ({ type: 'CHAMPION' as const, tournament: { id: c.tournament.id, name: c.tournament.name }, year: Number(c.tournament.startDate.slice(0, 4)), decidedBy: 'league_table' as const })),
  }
  return { profile, finishedMatches }
}

/** Arma la entrada desde la base mock, con las tablas calculadas como en GET /standings. */
function inputFor(teamId: ID): TeamProfileInput | null {
  const db = getDb()
  const team = db.teams.find((t) => t.id === teamId)
  if (!team) return null
  const enrolled = new Set(db.tournamentTeams.filter((e) => e.teamId === teamId).map((e) => e.tournamentId))
  const played = db.matches.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId).map((m) => m.tournamentId)
  const tournaments = db.tournaments.filter((t) => enrolled.has(t.id) || played.includes(t.id))
  const teams = new Map(db.teams.map((t) => [t.id, t]))
  const tournamentMatches = new Map(tournaments.map((t) => [t.id, db.matches.filter((m) => m.tournamentId === t.id)]))
  const standings = new Map(
    tournaments.map((t) => [
      t.id,
      computeStandings(
        db.tournamentTeams.filter((e) => e.tournamentId === t.id).map((e) => e.teamId),
        tournamentMatches.get(t.id) ?? [],
        (id) => teams.get(id)?.name ?? '',
        5,
        t.settings.points,
      ),
    ]),
  )
  return {
    team,
    tournaments,
    enrolledTournamentIds: enrolled,
    tournamentMatches,
    stats: db.playerMatchStats.filter((s) => s.teamId === teamId),
    memberships: db.memberships.filter((m) => m.teamId === teamId),
    players: new Map(db.players.map((p) => [p.id, toPublicPlayer(p)])),
    teams,
    standings,
  }
}

export function buildMockTeamProfile(teamId: ID): TeamProfile | null {
  const input = inputFor(teamId)
  return input ? buildTeamProfile(input).profile : null
}

/** GET /teams/:id/matches paginado (página 1 = más recientes). */
export function mockTeamMatches(teamId: ID, page: number, limit: number) {
  const input = inputFor(teamId)
  const all = input ? buildTeamProfile(input).finishedMatches : []
  return { items: all.slice((page - 1) * limit, page * limit), total: all.length }
}
