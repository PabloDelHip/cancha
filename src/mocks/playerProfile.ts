/**
 * En modo mock, esta capa HACE DE BACKEND para el perfil del jugador: implementa el mismo
 * contrato que GET /players/:id/profile y GET /players/:id/matches con las mismas reglas que
 * backend/src/modules/statistics/player-profile.ts (única copia local, como computeStandings).
 * La UI consume el contrato sin saber qué proveedor lo sirve.
 */
import type {
  FormResult,
  PlayerHonor,
  ProfileOutcome,
  ID,
  Player,
  PlayerDetails,
  PlayerProfile,
  ProfileMatch,
  ProfileTeamParticipation,
  StatLine,
  TeamRef,
  Tournament,
  TournamentRef,
} from '@/types'
import { ageFrom } from '@/utils/format'
import { computeStandings } from '@/utils/stats'
import { getDb } from './db'
import type { PlayerRecord } from './seed'
import { finalStandingOf } from './teamProfile'
import { bestPerformances, milestonesOf, recordsOf, statsByTeam, statsByYear } from './playerInsights'

export const RECENT_MATCHES = 5

/** Representación pública: edad derivada, nunca la fecha de nacimiento. */
export function toPublicPlayer({ birthDate, ...rest }: PlayerRecord): Player {
  return { ...rest, age: ageFrom(birthDate) }
}

/** Lo que ve el custodio de la ficha. */
export function toPlayerDetails(record: PlayerRecord): PlayerDetails {
  return { ...toPublicPlayer(record), birthDate: record.birthDate }
}

interface Entry {
  matchId: ID
  tournamentId: ID
  round: number
  date: string
  time: string
  homeTeamId: ID
  awayTeamId: ID
  homeScore: number
  awayScore: number
  teamId: ID
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

const empty = (): StatLine => ({ appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 })
const addEntry = (l: StatLine, e: Entry): StatLine => ({
  appearances: l.appearances + 1,
  goals: l.goals + e.goals,
  assists: l.assists + e.assists,
  yellowCards: l.yellowCards + e.yellowCards,
  redCards: l.redCards + e.redCards,
})
const addLines = (a: StatLine, b: StatLine): StatLine => ({
  appearances: a.appearances + b.appearances,
  goals: a.goals + b.goals,
  assists: a.assists + b.assists,
  yellowCards: a.yellowCards + b.yellowCards,
  redCards: a.redCards + b.redCards,
})
const resultOf = (e: Entry): FormResult => {
  const own = e.teamId === e.homeTeamId ? e.homeScore : e.awayScore
  const rival = e.teamId === e.homeTeamId ? e.awayScore : e.homeScore
  return own > rival ? 'W' : own < rival ? 'L' : 'D'
}
const byMostRecent = (a: Entry, b: Entry) => `${b.date}${b.time}${b.matchId}`.localeCompare(`${a.date}${a.time}${a.matchId}`)

/** Partidos oficiales del jugador (FINISHED con marcador), más reciente primero. */
function officialEntries(playerId: ID): Entry[] {
  const db = getDb()
  const matches = new Map(db.matches.map((m) => [m.id, m]))
  return db.playerMatchStats
    .filter((s) => s.playerId === playerId)
    .flatMap((s) => {
      const m = matches.get(s.matchId)
      if (!m || m.status !== 'finished' || m.homeScore === null || m.awayScore === null) return []
      return [
        {
          matchId: m.id,
          tournamentId: m.tournamentId,
          round: m.round,
          date: m.date,
          time: m.time,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          teamId: s.teamId,
          goals: s.goals,
          assists: s.assists,
          yellowCards: s.yellowCards,
          redCards: s.redCards,
        },
      ]
    })
    .sort(byMostRecent)
}

function refs() {
  const db = getDb()
  const teams = new Map<ID, TeamRef>(
    db.teams.map((t) => [t.id, { id: t.id, name: t.name, shortName: t.shortName, logoUrl: t.logoUrl, colors: t.colors }]),
  )
  const tournaments = new Map<ID, TournamentRef>(db.tournaments.map((t: Tournament) => [t.id, toTournamentRef(t)]))
  return { teams, tournaments }
}

function toTournamentRef(t: Tournament): TournamentRef {
  const { id, name, status, category, modality, startDate, endDate } = t
  return { id, name, status, category, modality, startDate, endDate, dataCoverage: t.dataCoverage ?? 'full' }
}

function toMatch(e: Entry, teams: Map<ID, TeamRef>, tournaments: Map<ID, TournamentRef>): ProfileMatch {
  const t = tournaments.get(e.tournamentId)
  return {
    id: e.matchId,
    date: e.date,
    time: e.time,
    round: e.round,
    tournament: t ? { id: t.id, name: t.name } : null,
    homeTeam: teams.get(e.homeTeamId) ?? null,
    awayTeam: teams.get(e.awayTeamId) ?? null,
    homeScore: e.homeScore,
    awayScore: e.awayScore,
    playerTeamId: e.teamId,
    result: resultOf(e),
    stats: { goals: e.goals, assists: e.assists, yellowCards: e.yellowCards, redCards: e.redCards },
  }
}

export function buildMockProfile(playerId: ID): PlayerProfile | null {
  const db = getDb()
  const record = db.players.find((p) => p.id === playerId)
  if (!record) return null
  const { teams, tournaments } = refs()
  const entries = officialEntries(playerId)
  const memberships = db.memberships.filter((m) => m.playerId === playerId)

  const groups = new Map<ID, Map<ID, { memberships: typeof memberships; entries: Entry[] }>>()
  const slot = (tournamentId: ID, teamId: ID) => {
    const byTeam = groups.get(tournamentId) ?? new Map()
    groups.set(tournamentId, byTeam)
    const found = byTeam.get(teamId) ?? { memberships: [], entries: [] }
    byTeam.set(teamId, found)
    return found
  }
  for (const m of memberships) slot(m.tournamentId, m.teamId).memberships.push(m)
  for (const e of entries) slot(e.tournamentId, e.teamId).entries.push(e)

  // Resultado oficial (el mock solo simula la liga clásica): posición final verificable y título.
  const tournamentRecords = new Map(db.tournaments.map((t) => [t.id, t]))
  const outcomeOf = (tournamentId: ID, teamId: ID): ProfileOutcome | null => {
    const t = tournamentRecords.get(tournamentId)
    // Seguimiento parcial (6F): sin resultado oficial derivado de la tabla.
    if (!t || t.status !== 'finished' || t.settings.system !== 'league' || t.dataCoverage === 'partial') return null
    const all = db.matches.filter((m) => m.tournamentId === t.id)
    const rows = computeStandings(
      db.tournamentTeams.filter((e) => e.tournamentId === t.id).map((e) => e.teamId),
      all,
      (x) => teams.get(x)?.name ?? '',
      5,
      t.settings.points,
    )
    const final = finalStandingOf(teamId, t, all, rows)
    return { champion: final?.position === 1, runnerUp: false, reached: null, finalPosition: final ? { position: final.position, teams: final.teams } : null }
  }
  const goalsIn = (tournamentId: ID) => {
    const ids = new Set(db.matches.filter((m) => m.tournamentId === tournamentId && m.status === 'finished' && m.homeScore !== null).map((m) => m.id))
    const byPlayer = new Map<ID, number>()
    for (const s of db.playerMatchStats) if (ids.has(s.matchId) && s.goals > 0) byPlayer.set(s.playerId, (byPlayer.get(s.playerId) ?? 0) + s.goals)
    const max = Math.max(0, ...byPlayer.values())
    const own = byPlayer.get(playerId) ?? 0
    return max > 0 && own === max ? { goals: own, shared: [...byPlayer.values()].filter((g) => g === max).length > 1 } : null
  }

  const competitions = [...groups.entries()]
    .filter(([id]) => tournaments.has(id))
    .map(([id, byTeam]) => {
      const tournament = tournaments.get(id)!
      const finished = tournament.status === 'finished'
      const list: ProfileTeamParticipation[] = [...byTeam.entries()].map(([teamId, g]) => {
        const latest = [...g.memberships].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
        const current = !finished && g.memberships.some((m) => m.status === 'active')
        const matchDates = g.entries.map((e) => e.date).sort()
        const ended = g.memberships.map((m) => m.endDate).filter((d): d is string => d !== null).sort()
        return {
          team: teams.get(teamId) ?? null,
          shirtNumber: latest?.shirtNumber ?? null,
          startDate: [...g.memberships.map((m) => m.startDate), ...matchDates].sort()[0] ?? null,
          endDate: current ? null : (ended.at(-1) ?? tournament.endDate ?? matchDates.at(-1) ?? null),
          current,
          stats: g.entries.reduce(addEntry, empty()),
          outcome: g.entries.length ? outcomeOf(id, teamId) : null,
        }
      })
      list.sort((a, b) => Number(b.current) - Number(a.current) || (b.startDate ?? '').localeCompare(a.startDate ?? ''))
      const stats = list.map((t) => t.stats).reduce(addLines, empty())
      return {
        tournament,
        system: tournamentRecords.get(id)?.settings.system ?? null,
        stats,
        teams: list,
        topScorer: finished && stats.appearances && tournamentRecords.get(id)?.dataCoverage !== 'partial' ? goalsIn(id) : null,
      }
    })
    .sort(
      (a, b) =>
        Number(b.teams.some((t) => t.current)) - Number(a.teams.some((t) => t.current)) ||
        b.tournament.startDate.localeCompare(a.tournament.startDate) ||
        a.tournament.id.localeCompare(b.tournament.id),
    )

  const years = new Map<string, PlayerProfile['history'][number]['participations']>()
  for (const c of competitions) {
    for (const t of c.teams) {
      const year = (t.startDate ?? c.tournament.startDate).slice(0, 4)
      const { team, shirtNumber, startDate, endDate, current } = t
      years.set(year, [
        ...(years.get(year) ?? []),
        { team, shirtNumber, startDate, endDate, current, tournament: { id: c.tournament.id, name: c.tournament.name, status: c.tournament.status } },
      ])
    }
  }

  const honors: PlayerHonor[] = competitions
    .flatMap((c) => {
      const year = Number(c.tournament.startDate.slice(0, 4))
      const tournament = { id: c.tournament.id, name: c.tournament.name }
      const list: PlayerHonor[] = c.teams.filter((t) => t.outcome?.champion).map((t) => ({ type: 'champion', tournament, team: t.team, year, decidedBy: 'league_table' }))
      if (c.topScorer) list.push({ type: 'top_scorer', tournament, team: null, year, goals: c.topScorer.goals, shared: c.topScorer.shared })
      return list
    })
    .sort((a, b) => b.year - a.year || (a.type === 'champion' ? -1 : 1))
  const asMatch = (e: Entry) => toMatch(e, teams, tournaments)
  const records = recordsOf(entries)
  const totals = entries.reduce(addEntry, empty())
  const perMatch = (n: number) => (totals.appearances ? Math.round((n / totals.appearances) * 100) / 100 : null)
  const { id, firstName, lastName, nickname, position, photoUrl, age } = toPublicPlayer(record)
  return {
    player: { id, firstName, lastName, nickname: nickname ?? null, position, photoUrl, age },
    currentParticipations: competitions.flatMap((c) =>
      c.teams
        .filter((t) => t.current)
        .map((t) => ({ tournament: c.tournament, team: t.team, shirtNumber: t.shirtNumber, startDate: t.startDate, stats: t.stats })),
    ),
    career: {
      ...totals,
      goalsPerMatch: perMatch(totals.goals),
      assistsPerMatch: perMatch(totals.assists),
      competitions: competitions.length,
      teams: new Set(entries.map((e) => e.teamId)).size,
      titles: honors.filter((h) => h.type === 'champion').length,
    },
    form: entries.slice(0, 5).map(resultOf).reverse(),
    competitions,
    history: [...years.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, participations]) => ({
        year,
        participations: participations.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
      })),
    recentMatches: entries.slice(0, RECENT_MATCHES).map(asMatch),
    honors,
    byYear: statsByYear(entries),
    byTeam: statsByTeam(entries, teams),
    milestones: milestonesOf(entries)
      .reverse()
      .map((m) => ({ type: m.type, value: m.value, match: asMatch(m.entry) })),
    records: {
      ...records,
      mostGoalsInMatch: records.mostGoalsInMatch && { value: records.mostGoalsInMatch.value, match: asMatch(records.mostGoalsInMatch.entry) },
      mostAssistsInMatch: records.mostAssistsInMatch && { value: records.mostAssistsInMatch.value, match: asMatch(records.mostAssistsInMatch.entry) },
    },
    bestPerformances: bestPerformances(entries).map(asMatch),
    // El modo demo no deriva estadísticas de portero (las calcula el servidor).
    goalkeeping: null,
  }
}

/** GET /players/:id/matches paginado (página 1 = más recientes). */
export function mockPlayerMatches(playerId: ID, page: number, limit: number) {
  const { teams, tournaments } = refs()
  const entries = officialEntries(playerId)
  return {
    items: entries.slice((page - 1) * limit, page * limit).map((e) => toMatch(e, teams, tournaments)),
    total: entries.length,
  }
}
