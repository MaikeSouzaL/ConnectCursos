import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoorOpenIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { WeekCalendar, bookingTypeMeta } from '@/features/rooms/week-calendar'
import { NewBookingDialog } from '@/features/rooms/new-booking-dialog'
import { NewRoomDialog } from '@/features/rooms/new-room-dialog'
import { useAsync } from '@/hooks/use-async'
import { roomsService, roomName, teacherName } from '@/data/services'
import { formatBRL, formatDate } from '@/lib/format'
import type { BookingType, RoomBooking } from '@/data/types'

function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}
function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export function RoomsPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [roomFilter, setRoomFilter] = useState('todas')
  const [reload, setReload] = useState(0)
  const [roomsReload, setRoomsReload] = useState(0)
  const [selected, setSelected] = useState<RoomBooking | null>(null)

  const { data: rooms } = useAsync(() => roomsService.list(), [roomsReload])
  const { data: bookings, loading } = useAsync(
    () => roomsService.bookingsForWeek(weekStart),
    [weekStart, reload],
  )

  const filtered = useMemo(
    () => (roomFilter === 'todas' ? bookings : bookings?.filter((b) => b.roomId === roomFilter)),
    [bookings, roomFilter],
  )

  const weekEnd = addDays(weekStart, 6)
  const rangeLabel = `${format(weekStart, 'd', { locale: ptBR })} – ${format(weekEnd, "d 'de' MMM, yyyy", { locale: ptBR })}`

  const rentalRevenue = useMemo(
    () => (bookings ?? []).filter((b) => b.type !== 'turma').reduce((s, b) => s + (b.price ?? 0), 0),
    [bookings],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salas & Agenda"
        description="Agende aulas, gerencie reservas e alugue salas para terceiros."
        actions={
          rooms && (
            <NewBookingDialog
              rooms={rooms}
              onCreated={() => setReload((r) => r + 1)}
              trigger={
                <Button size="sm">
                  <CalendarPlusIcon className="size-4" />
                  Nova reserva
                </Button>
              }
            />
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Salas" value={String(rooms?.length ?? 0)} icon={DoorOpenIcon} accent="gold" />
        <StatCard
          label="Reservas na semana"
          value={String(bookings?.length ?? 0)}
          icon={LayersIcon}
          accent="info"
        />
        <StatCard
          label="Receita de aluguéis (semana)"
          value={formatBRL(rentalRevenue)}
          icon={WalletIcon}
          accent="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Calendário */}
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semana anterior">
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
                  Hoje
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Próxima semana">
                  <ChevronRightIcon className="size-4" />
                </Button>
                <span className="ml-2 text-sm font-medium">{rangeLabel}</span>
              </div>
              <Select value={roomFilter} onValueChange={setRoomFilter}>
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as salas</SelectItem>
                  {rooms?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Legenda */}
            <div className="flex flex-wrap gap-3">
              {(Object.keys(bookingTypeMeta) as BookingType[]).map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`size-2.5 rounded-full ${bookingTypeMeta[t].bar}`} />
                  {bookingTypeMeta[t].label}
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading || !rooms ? (
              <Skeleton className="h-[420px] w-full rounded-lg" />
            ) : (
              <WeekCalendar
                weekStart={weekStart}
                bookings={filtered ?? []}
                rooms={rooms}
                showRoom={roomFilter === 'todas'}
                onSelect={setSelected}
              />
            )}
          </CardContent>
        </Card>

        {/* Sidebar de salas */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Salas</CardTitle>
              <CardAction>
                <NewRoomDialog
                  onSaved={() => setRoomsReload((r) => r + 1)}
                  trigger={
                    <Button variant="outline" size="sm">
                      <PlusIcon className="size-4" />
                      Nova
                    </Button>
                  }
                />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {rooms?.map((room) => {
                const count = bookings?.filter((b) => b.roomId === room.id).length ?? 0
                return (
                  <div
                    key={room.id}
                    className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                  >
                    <button
                      onClick={() => setRoomFilter(room.id)}
                      className="min-w-0 flex-1 text-left"
                      aria-label={`Filtrar por ${room.name}`}
                    >
                      <p className="truncate text-sm font-medium">{room.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <UsersIcon className="size-3" /> {room.capacity} lugares · {formatBRL(room.hourlyRate)}/h
                      </p>
                    </button>
                    <Badge variant={count > 0 ? 'gold' : 'secondary'}>{count}</Badge>
                    <NewRoomDialog
                      room={room}
                      onSaved={() => setRoomsReload((r) => r + 1)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${room.name}`}>
                          <PencilIcon className="size-4 text-muted-foreground" />
                        </Button>
                      }
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detalhe da reserva */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className={`size-3 rounded-full ${bookingTypeMeta[selected.type].bar}`} />
                  <DialogTitle>{selected.title}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{bookingTypeMeta[selected.type].label}</Badge>
                  <StatusBadge kind="booking" value={selected.status} />
                </div>
                <dl className="grid grid-cols-[100px_1fr] gap-y-2">
                  <dt className="text-muted-foreground">Sala</dt>
                  <dd className="font-medium">{roomName(selected.roomId)}</dd>
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="font-medium">{formatDate(selected.date)}</dd>
                  <dt className="text-muted-foreground">Horário</dt>
                  <dd className="font-medium tabular">
                    {selected.start} – {selected.end}
                  </dd>
                  {selected.teacherId && (
                    <>
                      <dt className="text-muted-foreground">Professor</dt>
                      <dd className="font-medium">{teacherName(selected.teacherId)}</dd>
                    </>
                  )}
                  {selected.renterName && (
                    <>
                      <dt className="text-muted-foreground">Responsável</dt>
                      <dd className="font-medium">{selected.renterName}</dd>
                    </>
                  )}
                  {selected.price ? (
                    <>
                      <dt className="text-muted-foreground">Valor</dt>
                      <dd className="font-medium tabular">{formatBRL(selected.price)}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
