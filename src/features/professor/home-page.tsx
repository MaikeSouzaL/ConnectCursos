import { Link } from 'react-router-dom'
import {
  CalendarClockIcon,
  ClockIcon,
  DoorOpenIcon,
  LogInIcon,
  LogOutIcon,
  QrCodeIcon,
  UsersIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAsync } from '@/hooks/use-async'
import { attendanceService, courseName, roomName, teachersService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { formatBRL, formatTime } from '@/lib/format'
import { weekdayLong } from '@/lib/schedule'
import type { Class } from '@/data/types'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function nextSession(classes: Class[]) {
  const now = new Date()
  let best: { dt: Date; cls: Class; start: string; end: string } | null = null
  for (let off = 0; off < 7; off++) {
    const day = new Date(now)
    day.setDate(now.getDate() + off)
    const wd = day.getDay()
    for (const cls of classes) {
      for (const slot of cls.schedule) {
        if (slot.weekday !== wd) continue
        const [h, m] = slot.start.split(':').map(Number)
        const dt = new Date(day)
        dt.setHours(h, m, 0, 0)
        if (dt > now && (!best || dt < best.dt)) best = { dt, cls, start: slot.start, end: slot.end }
      }
    }
  }
  return best
}

export function ProfessorHomePage() {
  const teacherId = useAuth((s) => s.user?.linkedId ?? '')
  const { data, loading } = useAsync(() => teachersService.details(teacherId), [teacherId])
  const { data: today } = useAsync(() => attendanceService.todayStatus(teacherId, 'professor'), [teacherId])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const { teacher, classes, studentsCount } = data
  const next = nextSession(classes)
  const firstName = teacher.name.split(' ')[0]

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Prof. {firstName} 👋</h1>
      </div>

      {/* Meu check-in */}
      <Card className="overflow-hidden border-primary/20 bg-brand-glow py-0">
        <CardContent className="space-y-4 py-6">
          {today?.state === 'dentro' ? (
            <>
              <div className="flex items-center gap-2 text-success">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-success" />
                </span>
                <span className="text-sm font-medium">Você está na instituição</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Entrada às <strong className="text-foreground">{formatTime(today.checkInAt!)}</strong>
              </p>
              <Button asChild size="lg" className="w-full" variant="red">
                <Link to="/professor/scan">
                  <LogOutIcon className="size-5" />
                  Escanear saída
                </Link>
              </Button>
            </>
          ) : today?.state === 'completo' ? (
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Entrada</p>
                <p className="font-semibold tabular">{formatTime(today.checkInAt!)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saída</p>
                <p className="font-semibold tabular">{formatTime(today.checkOutAt!)}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <QrCodeIcon className="size-5 text-primary" />
                <span className="text-sm font-medium">Registre sua entrada</span>
              </div>
              <Button asChild size="lg" className="w-full">
                <Link to="/professor/scan">
                  <LogInIcon className="size-5" />
                  Escanear entrada
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Próxima aula */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Próxima aula</h2>
        {next ? (
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarClockIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{courseName(next.cls.courseId)}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ClockIcon className="size-3" />
                  {weekdayLong(next.dt.getDay())} · {next.start}–{next.end}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DoorOpenIcon className="size-3" />
                  {roomName(next.cls.roomId)}
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/professor/turmas/${next.cls.id}`}>Chamada</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-sm text-muted-foreground">Sem aulas agendadas.</CardContent>
          </Card>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">Turmas</p>
            <p className="font-display text-2xl font-semibold tabular">{classes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 px-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <UsersIcon className="size-3" /> Alunos
            </p>
            <p className="font-display text-2xl font-semibold tabular">{studentsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">Aluguel</p>
            <StatusBadge kind="payment" value={teacher.rentStatus} />
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Aluguel da sala: <strong className="text-foreground">{formatBRL(teacher.monthlyRent)}</strong>/mês
      </p>
    </div>
  )
}
