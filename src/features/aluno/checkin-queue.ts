import { useSyncExternalStore } from 'react'
import { nanoid } from 'nanoid'
import { attendanceService, type ScanResult } from '@/data/services'

/**
 * Fila offline de check-ins do aluno.
 * Se o dispositivo estiver sem rede na hora do scan, a leitura é guardada
 * no localStorage e sincronizada automaticamente ao reconectar.
 */
const KEY = 'conect-checkin-queue'
const listeners = new Set<() => void>()

export interface PendingScan {
  id: string
  personId: string
  role: 'aluno' | 'professor'
  at: string
}

function read(): PendingScan[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PendingScan[]
  } catch {
    return []
  }
}
function write(queue: PendingScan[]) {
  localStorage.setItem(KEY, JSON.stringify(queue))
  listeners.forEach((l) => l())
}

export function enqueueScan(personId: string, at: string, role: 'aluno' | 'professor' = 'aluno') {
  const queue = read()
  queue.push({ id: nanoid(6), personId, role, at })
  write(queue)
}

/** Sincroniza a fila (chamado ao reconectar). Retorna os resultados aplicados. */
export async function flushQueue(): Promise<ScanResult[]> {
  const queue = read()
  if (queue.length === 0) return []
  const results: ScanResult[] = []
  for (const item of queue) {
    results.push(await attendanceService.registerScan(item.personId, item.at, item.role))
  }
  write([])
  return results
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Quantidade de leituras pendentes de sincronização. */
export function usePendingScans() {
  return useSyncExternalStore(
    subscribe,
    () => read().length,
    () => 0,
  )
}
