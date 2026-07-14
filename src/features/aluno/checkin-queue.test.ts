import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const registerScan = vi.fn()
vi.mock('@/data/services', () => ({
  attendanceService: { registerScan: (...a: unknown[]) => registerScan(...a) },
}))

// localStorage não existe no runtime de teste do Node; a fila vive nele.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
})

const { enqueueScan, flushQueue } = await import('./checkin-queue')

const fila = () => JSON.parse(store.get('conect-checkin-queue') ?? '[]') as { personId: string }[]
const ok = (personId: string) => ({ action: 'entrada', at: '', record: { personId } })

beforeEach(() => {
  store.clear()
  registerScan.mockReset()
})
afterEach(() => vi.restoreAllMocks())

/**
 * A fila é a única coisa do sistema que guarda dado fora do banco — é o que
 * segura a presença do aluno quando o Wi-Fi da escola cai no balcão.
 *
 * O risco não é perder a leitura: é REENVIAR uma que já entrou. registerScan
 * trata a 2ª chamada do dia como saída, então um reenvio marca o aluno saindo
 * no mesmo instante em que chegou — presença de zero minuto.
 */
describe('flushQueue', () => {
  it('envia as leituras guardadas e esvazia a fila', async () => {
    registerScan.mockImplementation((id: string) => Promise.resolve(ok(id)))
    enqueueScan('aluno-1', '2026-07-14T19:00:00Z')
    enqueueScan('aluno-2', '2026-07-14T19:01:00Z')

    const r = await flushQueue()
    expect(r).toHaveLength(2)
    expect(fila()).toEqual([])
  })

  it('a leitura que JÁ entrou não volta para a fila quando a seguinte falha', async () => {
    // O bug: a fila só era esvaziada no fim. Se a 2ª falhasse, a função inteira
    // estourava e a 1ª ficava na fila para ser reenviada — virando "saída".
    registerScan
      .mockImplementationOnce((id: string) => Promise.resolve(ok(id)))
      .mockImplementationOnce(() => Promise.reject(new Error('rede caiu')))
    enqueueScan('aluno-1', '2026-07-14T19:00:00Z')
    enqueueScan('aluno-2', '2026-07-14T19:01:00Z')

    await expect(flushQueue()).rejects.toThrow('rede caiu')

    // Só a que falhou continua pendente.
    expect(fila().map((q) => q.personId)).toEqual(['aluno-2'])
  })

  it('a tentativa seguinte reenvia só quem faltou', async () => {
    registerScan
      .mockImplementationOnce((id: string) => Promise.resolve(ok(id)))
      .mockImplementationOnce(() => Promise.reject(new Error('rede caiu')))
    enqueueScan('aluno-1', '2026-07-14T19:00:00Z')
    enqueueScan('aluno-2', '2026-07-14T19:01:00Z')
    await expect(flushQueue()).rejects.toThrow()

    registerScan.mockReset()
    registerScan.mockImplementation((id: string) => Promise.resolve(ok(id)))
    await flushQueue()

    // aluno-1 NÃO pode ser reenviado: ele já está presente no banco.
    expect(registerScan).toHaveBeenCalledTimes(1)
    expect(registerScan).toHaveBeenCalledWith('aluno-2', '2026-07-14T19:01:00Z', 'aluno')
    expect(fila()).toEqual([])
  })

  it('duas sincronizações ao mesmo tempo não enviam a mesma leitura duas vezes', async () => {
    // O contador da fila alimenta o useEffect que dispara o flush. Como cada
    // item removido mexe no contador, o efeito re-dispara no meio do envio.
    let libera!: () => void
    const travado = new Promise<void>((r) => (libera = r))
    registerScan.mockImplementation(async (id: string) => {
      await travado
      return ok(id)
    })
    enqueueScan('aluno-1', '2026-07-14T19:00:00Z')

    const primeira = flushQueue()
    const segunda = flushQueue() // entra enquanto a primeira ainda está no ar
    libera()
    await Promise.all([primeira, segunda])

    expect(registerScan).toHaveBeenCalledTimes(1)
  })

  it('fila vazia não chama o banco', async () => {
    expect(await flushQueue()).toEqual([])
    expect(registerScan).not.toHaveBeenCalled()
  })
})
