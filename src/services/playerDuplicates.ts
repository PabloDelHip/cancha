import { AxiosError } from 'axios'
import type { PlayerCandidate } from '@/types'
import { toPlayerCandidate, type ApiPlayerCandidate } from './mappers'

/**
 * El servidor revisa posibles duplicados ANTES de crear un jugador: si los hay responde
 * 409 PLAYER_POSSIBLE_DUPLICATES con los candidatos y no crea nada. Devuelve esos candidatos (o null
 * si el error es otro). Repetir el alta con `confirmNew` = "ninguno es él, créalo".
 */
export function possibleDuplicates(error: unknown): PlayerCandidate[] | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 409) return null
  const body = error.response.data as { code?: string; candidates?: ApiPlayerCandidate[] } | undefined
  return body?.code === 'PLAYER_POSSIBLE_DUPLICATES' && body.candidates?.length ? body.candidates.map(toPlayerCandidate) : null
}
