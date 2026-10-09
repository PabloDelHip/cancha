import type { Player, SendOff } from '@/types'

/** Fila editable en la captura de un partido. */
export interface CaptureRow {
  player: Player
  shirtNumber: number | null
  played: boolean
  goals: number
  assists: number
  /** Autogoles: suman al rival. */
  ownGoals: number
  yellowCards: number
  redCards: number
  /** Tipo de expulsión. undefined = captura anterior sin clasificar (no se envía). */
  sendOff: SendOff | null | undefined
  /** Suspendido para este partido (control disciplinario). */
  suspension: { remaining: number } | null
}

/** Expulsión de una captura anterior que no se interpreta sola: el organizador la clasifica. */
export const needsSendOffReview = (row: CaptureRow) => row.sendOff === undefined && (row.redCards > 0 || row.yellowCards > 1)
