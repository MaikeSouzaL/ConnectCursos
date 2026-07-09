import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeftIcon, CheckCircle2Icon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAsync } from '@/hooks/use-async'
import { attendanceService, classesService } from '@/data/services'
import { formatTime, initials } from '@/lib/format'

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

  const byStudent = new Map((records ?? []).map((r) => [r.personId, r]))
  const present = (students ?? []).filter((s) => {
    const st = byStudent.get(s.id)?.status
    return st === 'presente' || st === 'atrasado'
  }).length

  const mark = async (studentId: string) => {
    await attendanceService.checkIn({
      personId: studentId,
      personRole: 'aluno',
      classId: id,
      date,
      checkInAt: new Date().toISOString(),
      method: 'manual',
      status: 'presente',
    })
    toast.success('Presença registrada')
    setReload((r) => r + 1)
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
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">{initials(s.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    {rec?.checkInAt && (
                      <p className="text-xs text-muted-foreground">Entrada {formatTime(rec.checkInAt)}</p>
                    )}
                  </div>
                  {rec ? (
                    <StatusBadge kind="attendance" value={rec.status} />
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => mark(s.id)}>
                      <CheckCircle2Icon className="size-4" /> Presente
                    </Button>
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
