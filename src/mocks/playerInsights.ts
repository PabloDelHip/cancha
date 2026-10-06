/**
 * Modo mock: copia local de backend/src/modules/statistics/player-insights.ts (mismas reglas). La
 * UI nunca usa esto directamente: consume el contrato de GET /players/:id/profile.
 */
import type { ID, MilestoneType, StatLine, TeamRef } from '@/types'

export interface InsightEntry {
  matchId: ID
  tournamentId: ID
  date: string
  time: string
  teamId: ID
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

const GOAL_MARKS = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500]
const MATCH_MARKS = [25, 50, 100, 150, 200, 250, 300, 400, 500]

const chrono = (a: InsightEntry, b: InsightEntry) => `${a.date}${a.time}${a.matchId}`.localeCompare(`${b.date}${b.time}${b.matchId}`)

function line(entries: InsightEntry[]): StatLine {
  return entries.reduce(
    (l, e) => ({
      appearances: l.appearances + 1,
      goals: l.goals + e.goals,
      assists: l.assists + e.assists,
      yellowCards: l.yellowCards + e.yellowCards,
      redCards: l.redCards + e.redCards,
    }),
    { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  )
}

function groupBy<E extends InsightEntry, K>(entries: E[], key: (e: E) => K) {
  const map = new Map<K, E[]>()
  for (const e of entries) map.set(key(e), [...(map.get(key(e)) ?? []), e])
  return map
}

export function statsByYear(entries: InsightEntry[]) {
  return [...groupBy(entries, (e) => e.date.slice(0, 4)).entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, list]) => ({ year, stats: line(list), competitions: new Set(list.map((e) => e.tournamentId)).size }))
}

export function statsByTeam(entries: InsightEntry[], teams: Map<ID, TeamRef>) {
  return [...groupBy(entries, (e) => e.teamId).entries()]
    .map(([teamId, list]) => {
      const dates = list.map((e) => e.date).sort()
      return { team: teams.get(teamId) ?? null, stats: line(list), competitions: new Set(list.map((e) => e.tournamentId)).size, firstDate: dates[0]!, lastDate: dates.at(-1)! }
    })
    .sort((a, b) => b.stats.appearances - a.stats.appearances || b.lastDate.localeCompare(a.lastDate))
}

export function milestonesOf<E extends InsightEntry>(entries: E[]): { type: MilestoneType; value: number | null; entry: E }[] {
  const out: { type: MilestoneType; value: number | null; entry: E }[] = []
  let goals = 0
  let assist = false
  let brace = false
  let hatTrick = false
  ;[...entries].sort(chrono).forEach((e, i) => {
    const played = i + 1
    if (played === 1) out.push({ type: 'first_match', value: null, entry: e })
    if (MATCH_MARKS.includes(played)) out.push({ type: 'matches', value: played, entry: e })
    if (e.goals > 0 && goals === 0) out.push({ type: 'first_goal', value: null, entry: e })
    for (const mark of GOAL_MARKS) if (goals < mark && goals + e.goals >= mark) out.push({ type: 'goals', value: mark, entry: e })
    goals += e.goals
    if (e.assists > 0 && !assist) {
      assist = true
      out.push({ type: 'first_assist', value: null, entry: e })
    }
    if (e.goals >= 2 && !brace) {
      brace = true
      out.push({ type: 'first_brace', value: null, entry: e })
    }
    if (e.goals >= 3 && !hatTrick) {
      hatTrick = true
      out.push({ type: 'first_hat_trick', value: null, entry: e })
    }
  })
  return out
}

export function recordsOf<E extends InsightEntry>(entries: E[]) {
  const ordered = [...entries].sort(chrono)
  const maxBy = (pick: (e: E) => number) => {
    let best: E | null = null
    for (const e of ordered) if (pick(e) > 0 && (!best || pick(e) > pick(best))) best = e
    return best ? { value: pick(best), entry: best } : null
  }
  let streak = { value: 0, from: '', to: '' }
  let run = 0
  let start = ''
  for (const e of ordered) {
    if (e.goals > 0) {
      if (run === 0) start = e.date
      run++
      if (run > streak.value) streak = { value: run, from: start, to: e.date }
    } else run = 0
  }
  const years = statsByYear(entries)
  const busiest = years.reduce<(typeof years)[number] | null>((b, y) => (!b || y.stats.appearances > b.stats.appearances ? y : b), null)
  return {
    mostGoalsInMatch: maxBy((e) => e.goals),
    mostAssistsInMatch: maxBy((e) => e.assists),
    longestScoringStreak: streak.value >= 2 ? streak : null,
    mostMatchesInYear: busiest ? { value: busiest.stats.appearances, year: busiest.year } : null,
    hatTricks: entries.filter((e) => e.goals >= 3).length,
    braces: entries.filter((e) => e.goals === 2).length,
  }
}

export function bestPerformances<E extends InsightEntry>(entries: E[], limit = 5) {
  return entries
    .filter((e) => e.goals + e.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`) || a.matchId.localeCompare(b.matchId))
    .slice(0, limit)
}
