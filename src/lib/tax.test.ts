import { describe, it, expect } from 'vitest'
import { simplesAnexoIII } from './tax'

/**
 * As faixas do Anexo III são a tabela do Simples Nacional copiada para dentro
 * do código. Um dígito errado aqui não quebra nada — só devolve um número
 * plausível e errado, que o dono da escola usa para planejar caixa.
 *
 * Os valores esperados abaixo vêm da tabela, calculados à mão pela fórmula
 * (RBT12 × nominal − dedução) ÷ RBT12, e não do que a função devolve — senão
 * o teste só confirmaria a implementação, inclusive se ela estiver errada.
 */
describe('simplesAnexoIII', () => {
  it('1ª faixa: 6% cheios, sem dedução', () => {
    const r = simplesAnexoIII(100_000)
    expect(r.nominalRate).toBe(0.06)
    expect(r.deduction).toBe(0)
    expect(r.effectiveRate).toBeCloseTo(0.06, 10)
  })

  it('vira de faixa exatamente no limite, não depois', () => {
    // 180.000 ainda é 1ª faixa; um centavo acima já é 2ª. É a borda onde a
    // conta muda, e onde um <= trocado por < passaria despercebido.
    expect(simplesAnexoIII(180_000).nominalRate).toBe(0.06)
    expect(simplesAnexoIII(180_000.01).nominalRate).toBe(0.112)
    expect(simplesAnexoIII(360_000).nominalRate).toBe(0.112)
    expect(simplesAnexoIII(360_000.01).nominalRate).toBe(0.135)
    expect(simplesAnexoIII(720_000).nominalRate).toBe(0.135)
    expect(simplesAnexoIII(720_000.01).nominalRate).toBe(0.16)
    expect(simplesAnexoIII(1_800_000).nominalRate).toBe(0.16)
    expect(simplesAnexoIII(1_800_000.01).nominalRate).toBe(0.21)
    expect(simplesAnexoIII(3_600_000).nominalRate).toBe(0.21)
    expect(simplesAnexoIII(3_600_000.01).nominalRate).toBe(0.33)
  })

  it('2ª faixa: efetiva de uma escola de R$ 30 mil/mês', () => {
    // (360.000 × 0,112 − 9.360) ÷ 360.000 = 30.960 ÷ 360.000 = 8,60%
    expect(simplesAnexoIII(360_000).effectiveRate).toBeCloseTo(0.086, 6)
  })

  it('3ª faixa: (720.000 × 0,135 − 17.640) ÷ 720.000 = 11,05%', () => {
    expect(simplesAnexoIII(720_000).effectiveRate).toBeCloseTo(0.1105, 6)
  })

  it('a efetiva é sempre menor que a nominal a partir da 2ª faixa', () => {
    // É esse o papel da parcela a deduzir; se a efetiva empatar ou passar a
    // nominal, o sinal da dedução inverteu.
    for (const rbt of [200_000, 500_000, 1_000_000, 2_000_000, 4_000_000]) {
      const r = simplesAnexoIII(rbt)
      expect(r.effectiveRate).toBeLessThan(r.nominalRate)
    }
  })

  it('acima do teto do Simples continua na última faixa, sem quebrar', () => {
    // R$ 4,8 mi é o teto: acima disso a empresa sai do Simples. A tela não pode
    // explodir enquanto o contador não reenquadra.
    const r = simplesAnexoIII(6_000_000)
    expect(r.nominalRate).toBe(0.33)
    expect(Number.isFinite(r.effectiveRate)).toBe(true)
  })

  it('empresa sem faturamento não gera divisão por zero', () => {
    const r = simplesAnexoIII(0)
    expect(Number.isNaN(r.effectiveRate)).toBe(false)
    expect(r.effectiveRate).toBe(0.06)
  })

  it('nunca devolve alíquota negativa', () => {
    // Dentro de uma faixa, um RBT12 baixo o bastante faria (rbt×nominal − dedução)
    // ficar negativo — a escola receberia imposto de volta na tela.
    for (const rbt of [180_001, 360_001, 720_001, 1_800_001, 3_600_001]) {
      expect(simplesAnexoIII(rbt).effectiveRate).toBeGreaterThanOrEqual(0)
    }
  })
})
