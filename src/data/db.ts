import { createDatabase } from './seed'
import type { Database } from './types'

/**
 * "Banco" mock. Persiste em localStorage para sobreviver a reloads (F5).
 * A versão no nome da chave invalida dados antigos quando o schema muda.
 */
const STORAGE_KEY = 'conect-db-v6'

function load(): Database | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Database) : null
  } catch {
    return null
  }
}

export const db: Database = load() ?? createDatabase()

/** Salva o estado atual do banco no localStorage (chamado após cada mutação). */
export function saveDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* quota cheia ou indisponível — segue em memória */
  }
}

/** Restaura os dados de exemplo (usado no botão de reset das Configurações). */
export function resetDb() {
  const fresh = createDatabase()
  ;(Object.keys(fresh) as (keyof Database)[]).forEach((k) => {
    // substitui o conteúdo mantendo as referências dos arrays
    ;(db[k] as unknown[]).splice(0, (db[k] as unknown[]).length, ...(fresh[k] as unknown[]))
  })
  saveDb()
}

// Garante que a semente inicial fique persistida na primeira visita.
if (!load()) saveDb()

/** Simula latência de rede para deixar os estados de loading realistas. */
export function delay<T>(value: T, ms = 160): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** Clona para evitar mutação acidental do "banco" a partir da UI. */
export function clone<T>(value: T): T {
  return structuredClone(value)
}
