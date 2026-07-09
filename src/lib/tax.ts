/**
 * Estimativa de Simples Nacional — Anexo III (serviços de ensino).
 * Valores nominais/deduções conforme a tabela do Simples.
 * IMPORTANTE: é uma ESTIMATIVA. A apuração oficial é feita no PGDAS-D (Receita Federal).
 */
const ANEXO_III = [
  { upTo: 180_000, nominal: 0.06, deduct: 0, label: '1ª faixa' },
  { upTo: 360_000, nominal: 0.112, deduct: 9_360, label: '2ª faixa' },
  { upTo: 720_000, nominal: 0.135, deduct: 17_640, label: '3ª faixa' },
  { upTo: 1_800_000, nominal: 0.16, deduct: 35_640, label: '4ª faixa' },
  { upTo: 3_600_000, nominal: 0.21, deduct: 125_640, label: '5ª faixa' },
  { upTo: 4_800_000, nominal: 0.33, deduct: 648_000, label: '6ª faixa' },
]

export interface SimplesResult {
  nominalRate: number
  deduction: number
  /** alíquota efetiva (0–1) */
  effectiveRate: number
  bracketLabel: string
  upTo: number
}

export function simplesAnexoIII(rbt12: number): SimplesResult {
  const b = ANEXO_III.find((x) => rbt12 <= x.upTo) ?? ANEXO_III[ANEXO_III.length - 1]
  const effectiveRate = rbt12 > 0 ? Math.max((rbt12 * b.nominal - b.deduct) / rbt12, 0) : b.nominal
  return {
    nominalRate: b.nominal,
    deduction: b.deduct,
    effectiveRate,
    bracketLabel: b.label,
    upTo: b.upTo,
  }
}

export interface TaxObligation {
  name: string
  description: string
  periodicity: 'Mensal' | 'Anual'
  due: string
}

export const TAX_OBLIGATIONS: TaxObligation[] = [
  { name: 'DAS', description: 'Documento de Arrecadação do Simples Nacional', periodicity: 'Mensal', due: 'Todo dia 20' },
  { name: 'FGTS', description: 'Fundo de Garantia (se houver folha)', periodicity: 'Mensal', due: 'Todo dia 7' },
  { name: 'INSS / eSocial', description: 'Contribuição previdenciária da folha', periodicity: 'Mensal', due: 'Todo dia 20' },
  { name: 'DEFIS', description: 'Declaração de Informações Socioeconômicas e Fiscais', periodicity: 'Anual', due: '31 de março' },
  { name: 'DASN / Rendimentos', description: 'Declaração anual e informes de rendimentos', periodicity: 'Anual', due: '31 de março' },
]
