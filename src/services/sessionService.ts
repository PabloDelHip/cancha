import { delay, resetDb } from '@/mocks/db'

/** Utilidades del modo demo (VITE_USE_MOCKS=true). La autenticación vive en authService. */
export const sessionService = {
  /** Restaura los datos iniciales del mock. */
  resetDemoData(): Promise<void> {
    resetDb()
    return delay(undefined, 300)
  },
}
