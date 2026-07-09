import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarPlusIcon, CalendarRangeIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { bookingTypeMeta } from '@/features/rooms/week-calendar'
import { NewBookingDialog } from '@/features/rooms/new-booking-dialog'
import { useAsync } from '@/hooks/use-async'
import { roomsService, roomName } from '@/data/services'

function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

export function ProfessorSalasPage() {
  const [reload, setReload] = useState(0)
  const weekStart = startOfWeek(new Date())
  const { data: rooms } = useAsync(() => roomsService.list(), [])
  const { data: bookings, loading } = useAsync(() => roomsService.bookingsForWeek(weekStart), [reload])

  const byDay = new Map<string, typeof bookings>()
  ;(bookings ?? [])
    .slice()
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .forEach((b) => {
      const list = byDay.get(b.date) ?? []
      list.push(b)
      byDay.set(b.date, list)
    })
  const days = [...byDay.keys()]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Salas</h1>
        {rooms && (
          <NewBookingDialog
            rooms={rooms}
            onCreated={() => setReload((r) => r + 1)}
            trigger={
              <Button size="sm">
                <CalendarPlusIcon className="size-4" /> Agendar
              </Button>
            }
          />
        )}
      </div>
      <p className="text-sm text-muted-foreground">Agenda desta semana. Reserve uma sala disponível.</p>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : days.length > 0 ? (
        <div className="space-y-5">
          {days.map((day) => (
            <div key={day}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
                {format(new Date(day + 'T00:00:00'), "EEEE, dd 'de' MMM", { locale: ptBR })}
              </h2>
              <div className="space-y-2">
                {byDay.get(day)!.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-secondary py-1 text-center">
                        <span className="text-sm font-semibold tabular">{b.start}</span>
                        <span className="text-[10px] text-muted-foreground">{b.end}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{b.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{roomName(b.roomId)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`size-2.5 rounded-full ${bookingTypeMeta[b.type].bar}`} />
                        <Badge variant="secondary">{bookingTypeMeta[b.type].label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarRangeIcon} title="Sem reservas" description="Nenhuma reserva nesta semana." />
      )}
    </div>
  )
}
