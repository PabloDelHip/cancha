import type {
  FormResult,
  ID,
  Match,
  PlayerMatchStats,
  PlayerTotals,
  PointsRule,
  Standing,
  TopScorer,
} from '@/types'

/** Puntos de Liga V1 por defecto. La regla efectiva sale de Tournament.settings.points. */
export const POINTS: PointsRule = { win: 3, draw: 1, loss: 0 }

export function isPlayed(match: Match): match is Match & { homeScore: number; awayScore: number } {
  return match.status === 'finished' && match.homeScore !== null && match.awayScore !== null
}

export function compareMatchesAsc(a: Match, b: Match): number {
  return `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
}

export function resultFor(match: Match, teamId: ID): FormResult | null {
  if (!isPlayed(match)) return null
  const own = match.homeTeamId === teamId ? match.homeScore : match.awayScore
  const rival = match.homeTeamId === teamId ? match.awayScore : match.homeScore
  if (own > rival) return 'W'
  if (own < rival) return 'L'
  return 'D'
}

/**
 * Tabla de posiciones calculada a partir de los partidos finalizados (programados, pospuestos,
 * en juego y cancelados no cuentan). Desempate: puntos, diferencia de goles, goles a favor,
 * nombre (estable).
 *
 * Solo la usa el modo mock (hace de backend). Con backend real la tabla autoritativa es
 * GET /tournaments/:id/standings (ver tournamentService.standings); la UI no la recalcula.
 */
export function computeStandings(
  teamIds: ID[],
  matches: Match[],
  nameOf: (teamId: ID) => string = (id) => id,
  formLength = 5,
  points: PointsRule = POINTS,
): Standing[] {
  const rows = new Map<ID, Omit<Standing, 'position'>>()
  for (const teamId of teamIds) {
    rows.set(teamId, {
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    })
  }

  const played = matches.filter(isPlayed).sort(compareMatchesAsc)
  for (const match of played) {
    const sides = [
      { id: match.homeTeamId, gf: match.homeScore, ga: match.awayScore },
      { id: match.awayTeamId, gf: match.awayScore, ga: match.homeScore },
    ]
    for (const side of sides) {
      const row = rows.get(side.id)
      if (!row) continue
      row.played++
      row.goalsFor += side.gf
      row.goalsAgainst += side.ga
      if (side.gf > side.ga) {
        row.won++
        row.points += points.win
        row.form.push('W')
      } else if (side.gf < side.ga) {
        row.lost++
        row.points += points.loss
        row.form.push('L')
      } else {
        row.drawn++
        row.points += points.draw
        row.form.push('D')
        // Empate definido en penales: el ganador de la tanda suma el extra (como el backend).
        const pen = match.penalties
        if (points.shootoutWin && pen && pen.home !== pen.away && (side.id === match.homeTeamId) === pen.home > pen.away) row.points += points.shootoutWin
      }
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
      form: row.form.slice(-formLength),
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        nameOf(a.teamId).localeCompare(nameOf(b.teamId)),
    )
    .map((row, index) => ({ ...row, position: index + 1 }))
}

export function emptyTotals(): PlayerTotals {
  return { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 }
}

export function sumTotals(stats: PlayerMatchStats[]): PlayerTotals {
  return stats.reduce<PlayerTotals>(
    (acc, s) => ({
      matches: acc.matches + 1,
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      yellowCards: acc.yellowCards + s.yellowCards,
      redCards: acc.redCards + s.redCards,
    }),
    emptyTotals(),
  )
}

/**
 * Tabla de goleadores. Solo considera partidos finalizados.
 * Desempate: goles, menos partidos, asistencias.
 */
export function computeTopScorers(matches: Match[], stats: PlayerMatchStats[], limit = 20): TopScorer[] {
  const finished = new Set(matches.filter(isPlayed).map((m) => m.id))
  const byPlayer = new Map<ID, PlayerMatchStats[]>()
  for (const s of stats) {
    if (!finished.has(s.matchId)) continue
    const list = byPlayer.get(s.playerId) ?? []
    list.push(s)
    byPlayer.set(s.playerId, list)
  }

  return [...byPlayer.entries()]
    .map(([playerId, rows]) => ({
      playerId,
      // Equipo con el que jugó su último partido del torneo.
      teamId: rows[rows.length - 1]!.teamId,
      ...sumTotals(rows),
    }))
    .filter((r) => r.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.matches - b.matches || b.assists - a.assists)
    .slice(0, limit)
    .map((row, index, arr) => ({ ...row, position: sharedPosition(arr, index) }))
}

/** Jugadores con mismos goles y partidos comparten posición (1, 2, 2, 4…). */
function sharedPosition(rows: PlayerTotals[], index: number): number {
  let i = index
  while (i > 0 && rows[i - 1]!.goals === rows[index]!.goals && rows[i - 1]!.matches === rows[index]!.matches) i--
  return i + 1
}
