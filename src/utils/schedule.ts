import type { ID, ISODate, MatchInput } from '@/types'
import { parseISODate, toISODate } from './format'

export type Legs = 1 | 2

/** Una jornada generada: los cruces y, si el número de equipos es impar, quién descansa. */
export interface GeneratedRound {
  number: number
  pairs: [home: ID, away: ID][]
  bye: ID | null
}

/**
 * Liga todos contra todos (método del círculo). Con número impar de equipos se añade un
 * "descanso": cada jornada un equipo no juega. Alterna local/visitante para repartir las
 * localías; la segunda vuelta invierte los cruces de la primera. Misma regla que el backend
 * (backend/src/modules/rounds/round-robin.ts): con impar el descanso es el elemento fijo del
 * círculo, así cada equipo termina la vuelta con tantas localías como visitas.
 */
export function generateRoundRobin(teamIds: ID[], legs: Legs): GeneratedRound[] {
  if (teamIds.length < 2) return []
  const slots: (ID | null)[] = [...teamIds]
  if (slots.length % 2) slots.unshift(null)
  const n = slots.length
  const firstLeg: GeneratedRound[] = []

  for (let r = 0; r < n - 1; r++) {
    const pairs: [ID, ID][] = []
    let bye: ID | null = null
    for (let i = 0; i < n / 2; i++) {
      const a = slots[i]!
      const b = slots[n - 1 - i]!
      if (a === null || b === null) {
        bye = a ?? b
        continue
      }
      // El fijo (índice 0) alterna localía por jornada; el resto, según su posición.
      const flip = i === 0 ? r % 2 === 1 : i % 2 === 1
      pairs.push(flip ? [b, a] : [a, b])
    }
    firstLeg.push({ number: r + 1, pairs, bye })
    slots.splice(1, 0, slots.pop()!)
  }

  if (legs === 1) return firstLeg
  const secondLeg = firstLeg.map((round) => ({
    number: round.number + firstLeg.length,
    pairs: round.pairs.map(([h, a]) => [a, h] as [ID, ID]),
    bye: round.bye,
  }))
  return [...firstLeg, ...secondLeg]
}

export interface ScheduleOptions {
  legs: Legs
  /** Fecha de la jornada 1. */
  startDate: ISODate
  /** Días entre jornadas (7 = una por semana). */
  daysBetweenRounds: number
  /** Hora del primer partido de cada jornada, `HH:mm`. */
  firstKickoff: string
  /** Minutos entre partidos consecutivos de la misma jornada (0 = todos a la misma hora). */
  minutesBetweenMatches: number
  venue: string | null
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = ((h ?? 0) * 60 + (m ?? 0) + minutes) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Convierte las jornadas generadas en partidos programados listos para guardar. */
export function planMatches(tournamentId: ID, rounds: GeneratedRound[], options: ScheduleOptions): MatchInput[] {
  return rounds.flatMap((round) => {
    const date = parseISODate(options.startDate)
    date.setDate(date.getDate() + (round.number - 1) * options.daysBetweenRounds)
    return round.pairs.map(([homeTeamId, awayTeamId], i) => ({
      tournamentId,
      round: round.number,
      homeTeamId,
      awayTeamId,
      date: toISODate(date),
      time: addMinutes(options.firstKickoff, i * options.minutesBetweenMatches),
      venue: options.venue,
      status: 'scheduled' as const,
    }))
  })
}
