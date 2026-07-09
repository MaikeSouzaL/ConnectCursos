/** Máscaras de entrada (formatam enquanto o usuário digita). */

const digits = (v: string) => v.replace(/\D/g, '')

/** 000.000.000-00 */
export function maskCPF(value: string): string {
  return digits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/** 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
  return digits(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** (00) 00000-0000 — aceita fixo (10) e celular (11). */
export function maskPhone(value: string): string {
  const d = digits(value).slice(0, 11)
  if (d.length <= 2) return d.replace(/(\d{1,2})/, '($1')
  if (d.length <= 6) return d.replace(/(\d{2})(\d+)/, '($1) $2')
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
}
