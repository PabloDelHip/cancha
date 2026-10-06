import type { User } from '@/types'
import { api, refreshSession, setAccessToken, USE_MOCKS, type AuthPayload } from './api'
import { delay, getDb, mutate } from '@/mocks/db'
import { getMockUserId, MockHttpError, setMockUserId } from '@/mocks/session'
import { createId } from '@/utils/id'

export interface Credentials {
  email: string
  password: string
}

export interface RegisterInput extends Credentials {
  firstName: string
  lastName: string
}

export interface Session {
  user: User
  /** Con backend real: JWT de corta vida (solo en memoria). En mock: null, no hay token. */
  accessToken: string | null
}

/**
 * Contrato común. Los componentes y el authStore no saben si hablan con el mock o con el API.
 */
export interface AuthService {
  login(credentials: Credentials): Promise<Session>
  register(input: RegisterInput): Promise<Session>
  /** Restaura/renueva la sesión (tras F5). Rechaza si no hay sesión. */
  refresh(): Promise<Session>
  me(): Promise<User>
  logout(): Promise<void>
}

// ─── API real (VITE_USE_MOCKS=false) ────────────────────────────────────────
//
// POST /auth/login|register → { user, accessToken } + cookie HttpOnly con el refresh token.
// POST /auth/refresh        → nuevo access token (la cookie viaja sola; JS no puede leerla).
// GET  /auth/me             → usuario autenticado.

function toUser(u: AuthPayload['user']): User {
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: 'ORGANIZER' }
}

function toSession(payload: AuthPayload): Session {
  setAccessToken(payload.accessToken)
  return { user: toUser(payload.user), accessToken: payload.accessToken }
}

const http: AuthService = {
  async login(credentials) {
    return toSession((await api.post<AuthPayload>('/auth/login', credentials)).data)
  },
  async register(input) {
    return toSession((await api.post<AuthPayload>('/auth/register', input)).data)
  },
  async refresh() {
    return toSession(await refreshSession())
  },
  async me() {
    return toUser((await api.get<AuthPayload['user']>('/auth/me')).data)
  },
  async logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      setAccessToken(null)
    }
  },
}

// ─── Mock (VITE_USE_MOCKS=true) ─────────────────────────────────────────────
//
// SOLO DEMO: usuarios y credenciales viven en la base mock (localStorage) y la sesión es el id
// del usuario en localStorage (mocks/session.ts). No hay tokens ni criptografía simulada.

const normalizeEmail = (email: string) => email.trim().toLowerCase()

function findUser(id: string | null): User | undefined {
  return id ? getDb().users.find((u) => u.id === id) : undefined
}

const mock: AuthService = {
  login({ email, password }) {
    const db = getDb()
    const credential = db.credentials.find((c) => c.email === normalizeEmail(email))
    const user = credential && credential.password === password ? findUser(credential.userId) : undefined
    // Mismo mensaje si falla el email o la contraseña (igual que el backend).
    if (!user) return delay(null, 400).then(() => Promise.reject(new MockHttpError(401, 'Invalid credentials')))
    setMockUserId(user.id)
    return delay({ user, accessToken: null }, 400)
  },
  register({ firstName, lastName, email, password }) {
    const normalized = normalizeEmail(email)
    if (getDb().credentials.some((c) => c.email === normalized)) {
      return delay(null, 400).then(() => Promise.reject(new MockHttpError(409, 'Ya existe una cuenta con ese email')))
    }
    // Cuenta nueva y vacía: sin torneos ni datos demo.
    const user = mutate((db) => {
      const created: User = { id: createId('u'), firstName, lastName, email: normalized, role: 'ORGANIZER' }
      db.users.push(created)
      db.credentials.push({ userId: created.id, email: normalized, password })
      return created
    })
    setMockUserId(user.id)
    return delay({ user, accessToken: null }, 400)
  },
  refresh() {
    const user = findUser(getMockUserId())
    if (!user) {
      setMockUserId(null)
      return Promise.reject(new MockHttpError(401, 'Sin sesión'))
    }
    return delay({ user, accessToken: null }, 0)
  },
  me() {
    const user = findUser(getMockUserId())
    return user ? delay(user, 0) : Promise.reject(new MockHttpError(401, 'Sin sesión'))
  },
  logout() {
    setMockUserId(null)
    return delay(undefined, 0)
  },
}

export const authService: AuthService = USE_MOCKS ? mock : http
