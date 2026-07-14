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

let sincronizando = false

/**
 * Sincroniza a fila (chamado ao reconectar). Retorna os resultados aplicados.
 *
 * Cada leitura sai da fila assim que entra no banco. A fila era esvaziada só no
 * fim, de uma vez: se a 2ª leitura falhasse, a função inteira estourava, o
 * write([]) não rodava, e a 1ª — que JÁ tinha gravado — continuava na fila e era
 * reenviada depois. Reenviar um check-in que já entrou faz o registerScan achar
 * a entrada e marcar SAÍDA: o aluno "saía" no mesmo instante em que chegou, com
 * zero minuto de aula no relatório.
 */
export async function flushQueue(): Promise<ScanResult[]> {
  // O contador da fila alimenta o useEffect que chama esta função. Como agora
  // cada item removido mexe no contador, sem esta trava o efeito dispararia uma
  // segunda sincronização por cima da primeira, e as duas enviariam o mesmo item.
  if (sincronizando) return []
  const pendentes = read()
  if (pendentes.length === 0) return []

  sincronizando = true
  const results: ScanResult[] = []
  try {
    for (const item of pendentes) {
      results.push(await attendanceService.registerScan(item.personId, item.at, item.role))
      // Relê antes de filtrar: pode ter entrado leitura nova durante o envio.
      write(read().filter((q) => q.id !== item.id))
    }
  } finally {
    sincronizando = false
  }
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
