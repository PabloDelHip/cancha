import type { ID, Round, RoundInput } from '@/types'
import { api, fetchAll, USE_MOCKS } from './api'
import { toRound, type ApiRound } from './mappers'
import { delay, getDb, MockNotFoundError, mutate, plain } from '@/mocks/db'
import { createId } from '@/utils/id'
import { assertTournamentWritable, guard } from '@/mocks/ownership'
import { MockHttpError } from '@/mocks/session'

/**
 * Jornadas persistentes. Se identifican por `(torneo, número)`, el mismo número que guarda
 * cada partido en `Match.round`.
 */
export interface RoundService {
  list(): Promise<Round[]>
  /** Crea la jornada N o cambia su nombre/fecha (idempotente). */
  save(tournamentId: ID, number: number, input: Pick<RoundInput, 'name' | 'date'>): Promise<Round>
  /** Solo jornadas vacías (409 si tiene partidos). */
  remove(tournamentId: ID, number: number): Promise<void>
}

const http: RoundService = {
  async list() {
    return (await fetchAll<ApiRound>('/rounds')).map(toRound)
  },
  async save(tournamentId, number, input) {
    return toRound((await api.put<ApiRound>(`/tournaments/${tournamentId}/rounds/${number}`, input)).data)
  },
  async remove(tournamentId, number) {
    await api.delete(`/tournaments/${tournamentId}/rounds/${number}`)
  },
}

const mock: RoundService = {
  list: () => delay(getDb().rounds),
  save(tournamentId, number, input) {
    const check = () => {
      assertTournamentWritable(tournamentId)
      if (!Number.isInteger(number) || number < 1 || number > 99) throw new MockHttpError(400, 'Número de jornada inválido')
    }
    return guard(check, () =>
      mutate((db) => {
        let round = db.rounds.find((r) => r.tournamentId === tournamentId && r.number === number)
        if (!round) {
          round = { id: createId('r'), tournamentId, number, name: null, date: null }
          db.rounds.push(round)
        }
        Object.assign(round, plain(input))
        return delay(round)
      }),
    )
  },
  remove(tournamentId, number) {
    const check = () => {
      assertTournamentWritable(tournamentId)
      const db = getDb()
      if (!db.rounds.some((r) => r.tournamentId === tournamentId && r.number === number)) throw new MockNotFoundError('Jornada', String(number))
      if (db.matches.some((m) => m.tournamentId === tournamentId && m.round === number)) {
        throw new MockHttpError(409, 'La jornada tiene partidos: muévelos o elimínalos antes')
      }
    }
    return guard(check, () => {
      mutate((db) => {
        db.rounds = db.rounds.filter((r) => !(r.tournamentId === tournamentId && r.number === number))
      })
      return delay(undefined)
    })
  },
}

export const roundService: RoundService = USE_MOCKS ? mock : http
