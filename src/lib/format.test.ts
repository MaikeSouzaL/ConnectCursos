import { describe, it, expect } from 'vitest'
import { formatDate, formatDayMonth, isToday, formatBRL, initials } from './format'

/**
 * A armadilha que estes testes guardam:
 *
 *   new Date('2026-07-10')  →  2026-07-10T00:00:00 **UTC**
 *
 * No Brasil (UTC-3) isso é 9 de julho às 21h. Ou seja: toda data sem hora vinda
 * do banco (vencimento, presença, reserva) apareceria UM DIA ANTES na tela.
 * "Vence em 10/07" viraria 09/07; a presença de terça viraria segunda.
 *
 * `toDate` existe só para isso, e hoje a única defesa dela é um comentário —
 * que não quebra build. Alguém "simplificando" a função para `new Date(input)`
 * passaria pelo typecheck, pelo lint e pelos outros testes, e a tela erraria
 * calada em 10+ arquivos.
 *
 * Estes testes só têm sentido rodando em fuso negativo: em UTC eles passariam
 * mesmo com o código quebrado. Por isso o vitest.config.ts fixa America/Sao_Paulo
 * — e o primeiro teste confere que isso pegou, senão o resto é teatro.
 */
describe('fuso do ambiente de teste', () => {
  it('roda em UTC-3, senão estes testes não provam nada', () => {
    // Julho no Brasil: sem horário de verão desde 2019, offset fixo de +180 min.
    expect(new Date('2026-07-10T12:00:00Z').getTimezoneOffset()).toBe(180)
  })
})

describe('formatDate', () => {
  it('não volta um dia numa data sem hora', () => {
    expect(formatDate('2026-07-10')).toBe('10/07/2026')
  })

  it('não volta um dia na virada do mês', () => {
    expect(formatDate('2026-08-01')).toBe('01/08/2026')
  })

  it('não volta um dia na virada do ano — o caso mais visível', () => {
    // Com new Date(), 2027-01-01 viraria 31/12/2026: ano errado no relatório.
    expect(formatDate('2027-01-01')).toBe('01/01/2027')
  })

  it('aceita um ISO completo com hora, que já é absoluto', () => {
    // 2026-07-10T02:00Z é 23h do dia 9 em Brasília — e aqui está certo voltar,
    // porque o instante é o mesmo. A regra só vale para data sem hora.
    expect(formatDate('2026-07-10T02:00:00.000Z')).toBe('09/07/2026')
  })
})

describe('formatDayMonth', () => {
  it('não volta um dia', () => {
    expect(formatDayMonth('2026-07-10')).toContain('10')
  })
})

describe('isToday', () => {
  it('reconhece a data de hoje escrita como yyyy-MM-dd', () => {
    const hoje = new Date()
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    // Com new Date(iso), isto daria "ontem" a partir das 21h de Brasília — e o
    // terminal do balcão fica aberto à noite, que é quando as aulas acontecem.
    expect(isToday(iso)).toBe(true)
  })
})

describe('formatBRL', () => {
  // O Intl separa "R$" do número com espaço NÃO-SEPARÁVEL (U+00A0), não com o
  // espaço comum — para o valor nunca quebrar linha no meio. Comparar com um
  // literal digitado à mão falha com as duas strings parecendo idênticas na
  // tela. Normalizar aqui é o que evita a próxima meia hora perdida.
  const semNbsp = (s: string) => s.replace(/ /g, ' ')

  it('formata no padrão brasileiro', () => {
    expect(semNbsp(formatBRL(1234.5))).toBe('R$ 1.234,50')
    expect(semNbsp(formatBRL(0))).toBe('R$ 0,00')
    expect(semNbsp(formatBRL(-170))).toBe('-R$ 170,00')
  })

  it('sempre com dois decimais — é dinheiro', () => {
    expect(semNbsp(formatBRL(1))).toBe('R$ 1,00')
    expect(semNbsp(formatBRL(0.5))).toBe('R$ 0,50')
  })
})

describe('initials', () => {
  it('pega no máximo duas letras', () => {
    expect(initials('Ana Beatriz Ferreira')).toBe('AF')
    expect(initials('Maike')).toBe('MA')
  })
  it('não quebra com nome vazio', () => {
    expect(initials('   ')).toBe('?')
  })
})
