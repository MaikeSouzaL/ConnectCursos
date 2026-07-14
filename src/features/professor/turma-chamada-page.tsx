import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeftIcon, CalendarOffIcon, LogInIcon, LogOutIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAsync } from '@/hooks/use-async'
import { attendanceService, cancellationsService, classesService } from '@/data/services'
import { CancelarAulaDialog } from '@/features/professor/cancelar-aula-dialog'
import { formatDate, formatTime, initials } from '@/lib/format'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ProfessorChamadaPage() {
  const { id = '' } = useParams()
  const [date, setDate] = useState(todayISO())
  const [reload, setReload] = useState(0)

  const { data: klass, loading } = useAsync(() => classesService.get(id), [id])
  const { data: students } = useAsync(() => classesService.students(id), [id])
  const { data: records } = useAsync(() => attendanceService.byClassAndDate(id, date), [id, date, reload])
  const { data: avisos } = useAsync(() => cancellationsService.upcoming(id), [id, reload])

  const desfazerAviso = async (avisoId: string) => {
    try {
      await cancellationsService.undo(avisoId)
      toast.success('Aviso desfeito', { description: 'A turma foi informada de que a aula acontece.' })
      setReload((r) => r + 1)
    } catch (e) {
      toast.error('Não foi possível desfazer', { description: (e as Error).message })
    }
  }

  const byStudent = new Map((records ?? []).map((r) => [r.personId, r]))
  const present = (students ?? []).filter((s) => {
    const st = byStudent.get(s.id)?.status
    return st === 'presente' || st === 'atrasado'
  }).length

  const marcarEntrada = async (studentId: string) => {
    try {
      await attendanceService.checkIn({
        personId: studentId,
        personRole: 'aluno',
        classId: id,
        date,
        checkInAt: new Date().toISOString(),
        method: 'manual',
        status: 'presente',
      })
      toast.success('Entrada registrada')
      setReload((r) => r + 1)
    } catch (e) {
      toast.error('Não foi possível registrar', { description: (e as Error).message })
    }
  }

  const marcarSaida = async (recordId: string) => {
    try {
      await attendanceService.markCheckOut(recordId)
      toast.success('Saída registrada')
      setReload((r) => r + 1)
    } catch (e) {
      toast.error('Não foi possível registrar', { description: (e as Error).message })
    }
  }

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
        <Link to="/professor/turmas">
          <ArrowLeftIcon className="size-4" /> Turmas
        </Link>
      </Button>

      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">{klass?.courseName}</h1>
        <p className="text-sm text-muted-foreground">{klass?.name}</p>
      </div>

      <CancelarAulaDialog classId={id} defaultDate={date} onSaved={() => setReload((r) => r + 1)} />

      {/* Avisos já enviados — dá para desfazer se a aula acabar acontecendo. */}
      {avisos && avisos.length > 0 && (
        <div className="space-y-2">
          {avisos.map((a) => (
            <Card key={a.id} className="border-warning/30 bg-warning/5">
              <CardContent className="flex items-center gap-3 py-3">
                <CalendarOffIcon className="size-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Sem aula em {formatDate(a.date)}</p>
                  {a.reason && <p className="truncate text-xs text-muted-foreground">{a.reason}</p>}
                </div>
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => desfazerAviso(a.id)}>
                  Desfazer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="chamada-date">Data</Label>
          <Input
            id="chamada-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
        {students && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{present}</span>/{students.length} presentes
          </p>
        )}
      </div>

      {students && students.length > 0 ? (
        <div className="space-y-2">
          {students.map((s) => {
            const rec = byStudent.get(s.id)
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Avatar className="size-9 shrink-0">
                    {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.name} className="object-cover" />}
                    <AvatarFallback className="text-xs">{initials(s.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    {rec?.checkInAt && (
                      <p className="truncate text-xs text-muted-foreground">
                        Entrada {formatTime(rec.checkInAt)}
                        {rec.checkOutAt && ` · Saída ${formatTime(rec.checkOutAt)}`}
                      </p>
                    )}
                  </div>
                  {/* Sem registro → entrada. Dentro → saída. Completo → só o status. */}
                  {!rec ? (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => marcarEntrada(s.id)}>
                      <LogInIcon className="size-4" /> Entrada
                    </Button>
                  ) : !rec.checkOutAt ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge kind="attendance" value={rec.status} />
                      <Button size="sm" variant="outline" onClick={() => marcarSaida(rec.id)}>
                        <LogOutIcon className="size-4" /> Saída
                      </Button>
                    </div>
                  ) : (
                    <StatusBadge kind="attendance" value={rec.status} />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={UsersIcon} title="Sem alunos" description="Esta turma não tem alunos matriculados." />
      )}
    </div>
  )
}
