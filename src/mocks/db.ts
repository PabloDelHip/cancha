/**
 * "Base de datos" en memoria persistida en localStorage.
 * Solo la usan los servicios en modo mock; ningún componente la importa.
 */
import { createSeed, SEED_VERSION, type MockDatabase } from './seed'

const STORAGE_KEY = 'cancha:mock-db'

let db: MockDatabase | null = null

function load(): MockDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDatabase
      if (parsed.version === SEED_VERSION) return parsed
    }
  } catch {
    // localStorage no disponible o datos corruptos: se regenera la semilla.
  }
  const seed = createSeed()
  persist(seed)
  return seed
}

function persist(data: MockDatabase) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Sin persistencia (modo privado, cuota llena…): la demo sigue en memoria.
  }
}

export function getDb(): MockDatabase {
  db ??= load()
  return db
}

/** Aplica una mutación y persiste. */
export function mutate<T>(fn: (data: MockDatabase) => T): T {
  const data = getDb()
  const result = fn(data)
  persist(data)
  return result
}

export function resetDb(): void {
  db = createSeed()
  persist(db)
}

/** Simula latencia de red para que los estados de carga sean visibles. */
export function delay<T>(value: T, ms = 220): Promise<T> {
  const copy = plain(value)
  return new Promise((resolve) => setTimeout(() => resolve(copy), ms))
}

export class MockNotFoundError extends Error {
  readonly status = 404
  constructor(resource: string, id: string) {
    super(`${resource} "${id}" no encontrado`)
  }
}

export function now(): string {
  return new Date().toISOString()
}

/**
 * Copia profunda de datos serializables. Se usa en ambos sentidos: para que la UI
 * no mute la "base de datos" por referencia y para guardar objetos reactivos de Vue
 * (Proxies) como datos planos.
 */
export function plain<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)
}
