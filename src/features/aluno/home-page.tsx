import { Link } from 'react-router-dom'
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  DoorOpenIcon,
  LogInIcon,
  LogOutIcon,
  QrCodeIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAsync } from '@/hooks/use-async'
import { attendanceService, studentsService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { formatTime } from '@/lib/format'
import { formatSchedule, weekdayLong } from '@/lib/schedule'
import type { StudentDetails } from '@/data/services'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function nextSession(classes: StudentDetails['classes']) {
  const now = new Date()
  let best: { dt: Date; cls: StudentDetails['classes'][number]; start: string; end: string } | null = null
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

export function AlunoHomePage() {
  const studentId = useAuth((s) => s.user?.linkedId ?? '')
  const { data, loading } = useAsync(() => studentsService.details(studentId), [studentId])
  const { data: today } = useAsync(() => attendanceService.todayStatus(studentId), [studentId])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    )
  }

  const { student, classes, presenceRate } = data
  const currentPayment = data.payments
    .filter((p) => p.kind === 'mensalidade')
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0]
  const next = nextSession(classes)
  const firstName = student.name.split(' ')[0]

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{firstName} 👋</h1>
      </div>

      {/* Card de presença de hoje */}
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
                Entrada registrada às <strong className="text-foreground">{formatTime(today.checkInAt!)}</strong>
              </p>
              <Button asChild size="lg" className="w-full" variant="red">
                <Link to="/aluno/scan">
                  <LogOutIcon className="size-5" />
                  Escanear saída
                </Link>
              </Button>
            </>
          ) : today?.state === 'completo' ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2Icon className="size-5 text-success" />
                <span className="text-sm font-medium text-foreground">Presença de hoje concluída</span>
              </div>
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
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <QrCodeIcon className="size-5 text-primary" />
                <span className="text-sm font-medium">Registre sua presença</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code no balcão ao chegar para marcar sua entrada.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link to="/aluno/scan">
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
              <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarClockIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{next.cls.courseName}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ClockIcon className="size-3" />
                  {weekdayLong(next.dt.getDay())} · {next.start}–{next.end}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DoorOpenIcon className="size-3" />
                  {next.cls.roomName} · {next.cls.teacherName}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-sm text-muted-foreground">Sem aulas agendadas.</CardContent>
          </Card>
        )}
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">Frequência</p>
            <p className="font-display text-2xl font-semibold tabular">{presenceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">Mensalidade</p>
            {currentPayment ? (
              <StatusBadge kind="payment" value={currentPayment.status} />
            ) : (
              <Badge variant="secondary">—</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Minhas turmas */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Minhas turmas</h2>
        <div className="space-y-2">
          {classes.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.courseName}</p>
                  <p className="truncate text-xs text-muted-foreground">{formatSchedule(c.schedule)}</p>
                </div>
                <StatusBadge kind="class" value={c.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
