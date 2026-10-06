import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ID, ISODate, Match, Round, RoundInput } from '@/types'
import { roundService } from '@/services'
import { compareMatchesAsc } from '@/utils/stats'
import { createLoader } from './loader'
import { useMatchesStore } from './matches'

/** Jornada tal como la ve la UI: su registro (si existe) + los partidos con ese número. */
export interface RoundView {
  number: number
  /** "Jornada 3" o el nombre que le dio el organizador. */
  label: string
  customName: string | null
  /** Fecha de referencia: la del registro o la del primer partido. */
  date: ISODate | null
  record: Round | null
  matches: Match[]
}

export function roundLabel(number: number, name?: string | null) {
  return name?.trim() || `Jornada ${number}`
}

/**
 * Jornadas por torneo. Una jornada existe si tiene registro propio o si algún partido la usa
 * (`Match.round`): así los torneos creados antes de este modelo siguen viéndose igual.
 */
export const useRoundsStore = defineStore('rounds', () => {
  const items = ref<Round[]>([])
  const { loaded, ensure } = createLoader(async () => {
    items.value = await roundService.list()
  })

  function roundsOf(tournamentId: ID): RoundView[] {
    const matches = useMatchesStore().ofTournament(tournamentId)
    const records = items.value.filter((r) => r.tournamentId === tournamentId)
    const numbers = new Set([...records.map((r) => r.number), ...matches.map((m) => m.round)])
    return [...numbers]
      .sort((a, b) => a - b)
      .map((number) => {
        const record = records.find((r) => r.number === number) ?? null
        const list = matches.filter((m) => m.round === number).sort(compareMatchesAsc)
        return {
          number,
          label: roundLabel(number, record?.name),
          customName: record?.name ?? null,
          date: record?.date ?? list[0]?.date ?? null,
          record,
          matches: list,
        }
      })
  }

  function nextNumber(tournamentId: ID) {
    const rounds = roundsOf(tournamentId)
    return (rounds[rounds.length - 1]?.number ?? 0) + 1
  }

  function labelOf(tournamentId: ID, number: number) {
    return roundLabel(number, items.value.find((r) => r.tournamentId === tournamentId && r.number === number)?.name)
  }

  /** Crea la jornada N o guarda su nombre/fecha (el servidor lo hace idempotente). */
  async function save(tournamentId: ID, number: number, input: Pick<RoundInput, 'name' | 'date'>) {
    const saved = await roundService.save(tournamentId, number, input)
    items.value = [...items.value.filter((r) => !(r.tournamentId === tournamentId && r.number === number)), saved]
    return saved
  }

  async function remove(tournamentId: ID, number: number) {
    await roundService.remove(tournamentId, number)
    items.value = items.value.filter((r) => !(r.tournamentId === tournamentId && r.number === number))
  }

  /** Sustituye las jornadas de un torneo (tras generar su calendario). */
  function replaceTournament(tournamentId: ID, rounds: Round[]) {
    items.value = [...items.value.filter((r) => r.tournamentId !== tournamentId), ...rounds]
  }

  return { items, loaded, ensure, roundsOf, nextNumber, labelOf, save, remove, replaceTournament }
})
