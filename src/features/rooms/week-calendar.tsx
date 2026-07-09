import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { weekdayShort } from '@/lib/schedule'
import type { BookingType, Room, RoomBooking } from '@/data/types'

const START_HOUR = 7
const END_HOUR = 23
const HOUR_H = 56 // px por hora
const TOTAL_H = (END_HOUR - START_HOUR) * HOUR_H

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const bookingTypeMeta: Record<BookingType, { label: string; bar: string; chip: string }> = {
  turma: { label: 'Turma', bar: 'bg-brand-gold', chip: 'border-l-brand-gold bg-brand-gold/10' },
  aluguel: { label: 'Aluguel', bar: 'bg-info', chip: 'border-l-info bg-info/10' },
  palestra: { label: 'Palestra', bar: 'bg-success', chip: 'border-l-success bg-success/10' },
  evento: { label: 'Evento', bar: 'bg-[var(--chart-5)]', chip: 'border-l-[var(--chart-5)] bg-[var(--chart-5)]/10' },
  manutencao: { label: 'Manutenção', bar: 'bg-warning', chip: 'border-l-warning bg-warning/10' },
}

interface PositionedBooking {
  booking: RoomBooking
  top: number
  height: number
  lane: number
  lanes: number
}

/** Empacota reservas sobrepostas em "lanes" lado a lado. */
function layoutDay(bookings: RoomBooking[]): PositionedBooking[] {
  const sorted = [...bookings].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const laneEnds: number[] = []
  const placed = sorted.map((booking) => {
    const startM = toMinutes(booking.start)
    const endM = toMinutes(booking.end)
    let lane = laneEnds.findIndex((end) => end <= startM)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(endM)
    } else {
      laneEnds[lane] = endM
    }
    const top = ((startM - START_HOUR * 60) / 60) * HOUR_H
    const height = Math.max(((endM - startM) / 60) * HOUR_H - 3, 22)
    return { booking, top, height, lane, lanes: 1 }
  })
  const lanes = Math.max(laneEnds.length, 1)
  placed.forEach((p) => (p.lanes = lanes))
  return placed
}

export function WeekCalendar({
  weekStart,
  bookings,
  rooms,
  showRoom,
  onSelect,
}: {
  weekStart: Date
  bookings: RoomBooking[]
  rooms: Room[]
  /** Mostrar o nome da sala no bloco (quando exibindo todas as salas). */
  showRoom: boolean
  onSelect: (b: RoomBooking) => void
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = ymd(new Date())
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Cabeçalho dos dias */}
        <div className="flex border-b border-border">
          <div className="w-14 shrink-0" />
          {days.map((d) => {
            const isToday = ymd(d) === today
            return (
              <div key={d.toISOString()} className="flex-1 px-2 py-2 text-center">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {weekdayShort(d.getDay())}
                </p>
                <p
                  className={cn(
                    'mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {d.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Grade */}
        <div className="flex">
          {/* Eixo de horas */}
          <div className="w-14 shrink-0">
            {hours.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_H }}>
                <span className="absolute -top-2 right-2 text-[11px] text-muted-foreground">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          <div className="grid flex-1 grid-cols-7">
            {days.map((d) => {
              const dayKey = ymd(d)
              const dayBookings = bookings.filter((b) => b.date === dayKey)
              const positioned = layoutDay(dayBookings)
              return (
                <div
                  key={dayKey}
                  className="relative border-l border-border"
                  style={{
                    height: TOTAL_H,
                    backgroundImage:
                      'repeating-linear-gradient(to bottom, transparent, transparent 55px, var(--border) 55px, var(--border) 56px)',
                  }}
                >
                  {positioned.map(({ booking, top, height, lane, lanes }) => {
                    const meta = bookingTypeMeta[booking.type]
                    const room = roomById.get(booking.roomId)
                    const widthPct = 100 / lanes
                    return (
                      <button
                        key={booking.id}
                        onClick={() => onSelect(booking)}
                        style={{
                          top,
                          height,
                          left: `calc(${lane * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                        className={cn(
                          'absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left transition-shadow hover:z-10 hover:shadow-md',
                          meta.chip,
                          booking.status === 'cancelado' && 'opacity-50 line-through',
                        )}
                      >
                        <p className="truncate text-[11px] font-semibold leading-tight">{booking.start}</p>
                        <p className="truncate text-[11px] leading-tight">{booking.title}</p>
                        {showRoom && room && (
                          <p className="truncate text-[10px] leading-tight text-muted-foreground">
                            {room.name}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
