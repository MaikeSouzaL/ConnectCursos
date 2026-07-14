import { describe, it, expect, vi, afterEach } from 'vitest'
import { statusDePagamento } from './services'

/**
 * Esta função é a única fonte da inadimplência: o KPI do painel, o alerta do
 * sino e o filtro "Atrasados" saem toda dela.
 *
 * Antes dela, o painel media inadimplência pelo status gravado — e nada no
 * sistema jamais gravou 'atrasado'. O KPI marcava R$ 0,00 com o aluno devendo
 * há semanas. Se alguém "simplificar" isto de volta para ler o status cru, o
 * número volta a zero calado; estes testes existem para gritar antes.
 */
const congelaHoje = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}
afterEach(() => vi.useRealTimers())

describe('statusDePagamento', () => {
  it('pendente vencido vira atrasado', () => {
    congelaHoje('2026-07-14T09:00:00')
    expect(statusDePagamento('pendente', '2026-07-10')).toBe('atrasado')
  })

  it('pendente a vencer continua pendente', () => {
    congelaHoje('2026-07-14T09:00:00')
    expect(statusDePagamento('pendente', '2026-07-20')).toBe('pendente')
  })

  it('no próprio dia do vencimento ainda não está atrasado', () => {
    // Quem paga no dia 10 até o fim do expediente do dia 10 está em dia.
    congelaHoje('2026-07-10T23:59:00')
    expect(statusDePagamento('pendente', '2026-07-10')).toBe('pendente')
  })

  it('vira atrasado só no dia seguinte', () => {
    congelaHoje('2026-07-11T00:01:00')
    expect(statusDePagamento('pendente', '2026-07-10')).toBe('atrasado')
  })

  it('pago nunca vira atrasado, por mais velho que seja', () => {
    congelaHoje('2026-07-14T09:00:00')
    expect(statusDePagamento('pago', '2020-01-01')).toBe('pago')
  })

  it('atrasado gravado à mão é respeitado', () => {
    // O aluguel do professor tem um dropdown manual de status.
    congelaHoje('2026-07-14T09:00:00')
    expect(statusDePagamento('atrasado', '2026-12-31')).toBe('atrasado')
  })

  it('usa a data de hoje a cada chamada, e não a do carregamento da página', () => {
    // O terminal do balcão fica aberto dias seguidos. Se a data fosse lida uma
    // vez só (a constante TODAY do módulo), a mensalidade que venceu ontem
    // continuaria "em dia" até alguém recarregar a aba.
    congelaHoje('2026-07-10T09:00:00')
    expect(statusDePagamento('pendente', '2026-07-10')).toBe('pendente')

    vi.setSystemTime(new Date('2026-07-15T09:00:00'))
    expect(statusDePagamento('pendente', '2026-07-10')).toBe('atrasado')
  })

  it('atravessa a virada do mês e do ano', () => {
    congelaHoje('2027-01-02T09:00:00')
    expect(statusDePagamento('pendente', '2026-12-31')).toBe('atrasado')
  })
})
