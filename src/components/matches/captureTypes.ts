import type { Player } from '@/types'

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
}
