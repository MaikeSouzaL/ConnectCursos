import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Formata valor em Real brasileiro (R$). */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** Número compacto: 1.2 mil, 3,4 mi. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100)
}

function toDate(input: string | number | Date): Date {
  if (input instanceof Date) return input
  // Datas "yyyy-MM-dd" devem ser interpretadas como LOCAIS (evita voltar 1 dia
  // em fusos negativos, pois new Date('yyyy-MM-dd') assume UTC).
  if (typeof input === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(input)
}

/** dd/MM/yyyy */
export function formatDate(input: string | number | Date): string {
  return format(toDate(input), 'dd/MM/yyyy', { locale: ptBR })
}

/** dd 'de' MMM */
export function formatDayMonth(input: string | number | Date): string {
  return format(toDate(input), "dd 'de' MMM", { locale: ptBR })
}

/** dd/MM/yyyy 'às' HH:mm */
export function formatDateTime(input: string | number | Date): string {
  return format(toDate(input), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/** HH:mm */
export function formatTime(input: string | number | Date): string {
  return format(toDate(input), 'HH:mm', { locale: ptBR })
}

/** "há 3 horas" */
export function formatRelative(input: string | number | Date): string {
  return formatDistanceToNow(toDate(input), { locale: ptBR, addSuffix: true })
}

/** Nome do dia da semana capitalizado (ex.: "Segunda"). */
export function weekdayLabel(input: string | number | Date): string {
  const s = format(toDate(input), 'EEEE', { locale: ptBR })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Iniciais do nome (máx. 2). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
