import type { ID, Match, PlayerMatchStats, PlayerPosition } from '@/types'
import { compareMatchesAsc, isPlayed } from './stats'

/**
 * Rankings de un torneo (equipos, jugadores y porteros) a partir de los partidos FINALIZADOS y sus
 * estadísticas por jugador. Funciones puras: las tablas y el cuadro los calcula el servidor; esto
 * solo agrega lo que ya está capturado (goles, asistencias y tarjetas de cada jugador).
 */

export interface TeamTotals {
  teamId: ID
  played: number
  goalsFor: number
  goalsAgainst: number
  /** Partidos sin recibir gol. */
  cleanSheets: number
  yellowCards: number
  redCards: number
  goalsForPerMatch: number
  goalsAgainstPerMatch: number
}

/** Partido en el que un jugador vio tarjeta (para "¿en qué partidos?"). */
export interface CardEvent {
  matchId: ID
  date: string
  tournamentId: ID
  teamId: ID
  opponentId: ID
  yellow: number
  red: number
}

export interface PlayerTotalsRow {
  playerId: ID
  /** Equipo con el que jugó su último partido. */
  teamId: ID
  matches: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  goalsPerMatch: number
  cards: CardEvent[]
}

export interface KeeperTotals {
  playerId: ID
  teamId: ID
  matches: number
  /** Goles que recibió su equipo en los partidos que jugó. */
  conceded: number
  cleanSheets: number
  concededPerMatch: number
}

const per = (n: number, d: number) => (d ? n / d : 0)

export function teamTotals(teamIds: ID[], matches: Match[], stats: PlayerMatchStats[]): TeamTotals[] {
  const rows = new Map<ID, TeamTotals>(
    teamIds.map((teamId) => [teamId, { teamId, played: 0, goalsFor: 0, goalsAgainst: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, goalsForPerMatch: 0, goalsAgainstPerMatch: 0 }]),
  )
  const played = matches.filter(isPlayed)
  for (const m of played) {
    for (const [id, gf, ga] of [[m.homeTeamId, m.homeScore, m.awayScore], [m.awayTeamId, m.awayScore, m.homeScore]] as const) {
      const row = rows.get(id)
      if (!row) continue
      row.played++
      row.goalsFor += gf
      row.goalsAgainst += ga
      if (ga === 0) row.cleanSheets++
    }
  }
  const finished = new Set(played.map((m) => m.id))
  for (const s of stats) {
    const row = rows.get(s.teamId)
    if (!row || !finished.has(s.matchId)) continue
    row.yellowCards += s.yellowCards
    row.redCards += s.redCards
  }
  return [...rows.values()].map((r) => ({ ...r, goalsForPerMatch: per(r.goalsFor, r.played), goalsAgainstPerMatch: per(r.goalsAgainst, r.played) }))
}

export function playerTotals(matches: Match[], stats: PlayerMatchStats[]): PlayerTotalsRow[] {
  const byId = new Map(matches.filter(isPlayed).map((m) => [m.id, m]))
  const rows = new Map<ID, PlayerTotalsRow & { last: Match }>()
  for (const s of stats) {
    const m = byId.get(s.matchId)
    if (!m) continue
    const row = rows.get(s.playerId) ?? { playerId: s.playerId, teamId: s.teamId, matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, goalsPerMatch: 0, cards: [], last: m }
    row.matches++
    row.goals += s.goals
    row.assists += s.assists
    row.yellowCards += s.yellowCards
    row.redCards += s.redCards
    if (compareMatchesAsc(m, row.last) >= 0) {
      row.last = m
      row.teamId = s.teamId
    }
    if (s.yellowCards || s.redCards) {
      row.cards.push({
        matchId: m.id,
        date: m.date,
        tournamentId: m.tournamentId,
        teamId: s.teamId,
        opponentId: m.homeTeamId === s.teamId ? m.awayTeamId : m.homeTeamId,
        yellow: s.yellowCards,
        red: s.redCards,
      })
    }
    rows.set(s.playerId, row)
  }
  return [...rows.values()].map((r) => ({
    playerId: r.playerId,
    teamId: r.teamId,
    matches: r.matches,
    goals: r.goals,
    assists: r.assists,
    yellowCards: r.yellowCards,
    redCards: r.redCards,
    goalsPerMatch: per(r.goals, r.matches),
    cards: [...r.cards].sort((a, b) => b.date.localeCompare(a.date)),
  }))
}

/** Porteros (posición GK) que jugaron: goles que recibió su equipo en esos partidos. */
export function keeperTotals(matches: Match[], stats: PlayerMatchStats[], positionOf: (playerId: ID) => PlayerPosition | undefined): KeeperTotals[] {
  const byId = new Map(matches.filter(isPlayed).map((m) => [m.id, m]))
  const rows = new Map<ID, KeeperTotals>()
  for (const s of stats) {
    const m = byId.get(s.matchId)
    if (!m || positionOf(s.playerId) !== 'GK') continue
    const conceded = m.homeTeamId === s.teamId ? m.awayScore : m.homeScore
    const row = rows.get(s.playerId) ?? { playerId: s.playerId, teamId: s.teamId, matches: 0, conceded: 0, cleanSheets: 0, concededPerMatch: 0 }
    row.matches++
    row.conceded += conceded
    if (conceded === 0) row.cleanSheets++
    row.teamId = s.teamId
    rows.set(s.playerId, row)
  }
  return [...rows.values()].map((r) => ({ ...r, concededPerMatch: per(r.conceded, r.matches) }))
}

/** Ordena y deja solo filas con la métrica > 0 (un top de "0 goles" no dice nada). */
export function rank<T>(rows: T[], value: (r: T) => number, ...tiebreaks: ((a: T, b: T) => number)[]): T[] {
  return rows
    .filter((r) => value(r) > 0)
    .sort((a, b) => value(b) - value(a) || tiebreaks.reduce((acc, f) => acc || f(a, b), 0))
}

export const fmtAvg = (n: number) => n.toFixed(2).replace(/\.?0+$/, '') || '0'
