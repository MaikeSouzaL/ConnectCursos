import type { WeeklySlot } from '@/data/types'

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_LONG = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
]

export function weekdayShort(weekday: number) {
  return WEEKDAYS_SHORT[weekday] ?? '—'
}
export function weekdayLong(weekday: number) {
  return WEEKDAYS_LONG[weekday] ?? '—'
}

/** Ex.: "Seg e Qua · 19:00–21:00" */
export function formatSchedule(slots: WeeklySlot[]): string {
  if (!slots.length) return '—'
  const days = slots.map((s) => weekdayShort(s.weekday)).join(' e ')
  const { start, end } = slots[0]
  return `${days} · ${start}–${end}`
}
