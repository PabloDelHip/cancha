/**
 * Sesión de la autenticación mock (VITE_USE_MOCKS=true). SOLO DEMO.
 *
 * Guarda en localStorage el id del usuario con sesión, para que la demo sobreviva a F5.
 * Con el backend real NO se usa nada de esto: el refresh token viaja en una cookie HttpOnly
 * y el access token vive solo en memoria (ver services/api.ts y stores/auth.ts).
 */
import type { ID } from '@/types'

const KEY = 'cancha:mock-session'

export function getMockUserId(): ID | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setMockUserId(id: ID | null) {
  try {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch {
    // sin storage: la sesión mock no persiste entre recargas
  }
}

/** Error con código HTTP, para que la UI trate igual los errores mock y los del API. */
export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function requireMockUser(): ID {
  const id = getMockUserId()
  if (!id) throw new MockHttpError(401, 'Autenticación requerida')
  return id
}
