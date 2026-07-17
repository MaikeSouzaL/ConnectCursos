import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CalendarCheck2Icon,
  CalendarRangeIcon,
  ClipboardListIcon,
  ClockIcon,
  DoorOpenIcon,
  GraduationCapIcon,
  PencilIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { PersonAvatar } from '@/components/shared/person-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ExcluirCadastro } from '@/components/shared/excluir-cadastro'
import { NewClassDialog } from '@/features/classes/new-class-dialog'
import { useAsync } from '@/hooks/use-async'
import { attendanceService, classesService } from '@/data/services'
import { formatDate, formatTime } from '@/lib/format'
import { formatSchedule, weekdayLong } from '@/lib/schedule'
import type { AttendanceRecord } from '@/data/types'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof UserIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

export function ClassDetailPage() {
  const { id = '' } = useParams()
  const [date, setDate] = useState(todayISO())
  const [reload, setReload] = useState(0)

  const { data: klass, loading } = useAsync(() => classesService.get(id), [id, reload])
  const { data: students, loading: studentsLoading } = useAsync(() => classesService.students(id), [id])
  const { data: attendance, loading: attendanceLoading } = useAsync(
    () => attendanceService.byClassAndDate(id, date),
    [id, date],
  )

  const attendanceByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    attendance?.filter((a) => a.personRole === 'aluno').forEach((a) => map.set(a.personId, a))
    return map
  }, [attendance])

  const presentCount =
    students?.filter((s) => {
      const record = attendanceByStudent.get(s.id)
      return record?.status === 'presente' || record?.status === 'atrasado'
    }).length ?? 0

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!klass) {
    return (
      <EmptyState
        icon={GraduationCapIcon}
        title="Turma não encontrada"
        description="O registro pode ter sido removido."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/turmas">Voltar para Turmas</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/admin/turmas">
            <ArrowLeftIcon className="size-4" />
            Turmas
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <NewClassDialog
            klass={klass}
            onSaved={() => setReload((r) => r + 1)}
            trigger={
              <Button variant="outline" size="sm">
                <PencilIcon className="size-4" />
                Editar
              </Button>
            }
          />
          <ExcluirCadastro
            tipo="turma"
            nome={klass.name}
            onExcluir={() => classesService.remove(klass.id)}
            onInativar={async () => {
              await classesService.update(klass.id, { status: 'concluida' })
            }}
            inativarLabel="Arquivar (marcar concluída)"
            voltarPara="/admin/turmas"
          />
        </div>
      </div>

      {/* Cabeçalho da turma */}
      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight">{klass.courseName}</h1>
              <StatusBadge kind="class" value={klass.status} />
            </div>
            <p className="text-sm text-muted-foreground">{klass.name}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoRow icon={UserIcon} label="Professor" value={klass.teacherName} />
              <InfoRow icon={DoorOpenIcon} label="Sala" value={klass.roomName} />
              <InfoRow icon={ClockIcon} label="Horário" value={formatSchedule(klass.schedule)} />
              <InfoRow
                icon={CalendarRangeIcon}
                label="Período"
                value={`${formatDate(klass.startDate)} – ${formatDate(klass.endDate)}`}
              />
            </div>
          </div>
          <div className="sm:w-52">
            <p className="mb-1 text-xs text-muted-foreground">Ocupação</p>
            <div className="flex items-center gap-2">
              <Progress value={klass.occupancy} className="h-2" />
              <span className="whitespace-nowrap text-sm font-medium tabular">
                {klass.enrolled}/{klass.capacity}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{klass.occupancy}% ocupada</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="alunos">
        <TabsList>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="chamada">Chamada</TabsTrigger>
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
        </TabsList>

        {/* Alunos */}
        <TabsContent value="alunos">
          {studentsLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : students && students.length > 0 ? (
            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link to={`/admin/alunos/${s.id}`} className="flex items-center gap-3">
                          <PersonAvatar name={s.name} src={s.avatarUrl} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{s.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge kind="student" value={s.status} />
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/alunos/${s.id}`} className="text-xs text-primary hover:underline">
                          Ver perfil
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState icon={UsersIcon} title="Sem alunos" description="Esta turma ainda não tem alunos matriculados." />
          )}
        </TabsContent>

        {/* Chamada */}
        <TabsContent value="chamada" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chamada-data">Data</Label>
              <Input
                id="chamada-data"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-auto"
              />
            </div>
            {students && students.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{presentCount}</span> de {students.length} presentes
              </p>
            )}
          </div>

          {studentsLoading || attendanceLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : students && students.length > 0 ? (
            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Aluno</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => {
                    const record = attendanceByStudent.get(s.id)
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <PersonAvatar
                              name={s.name}
                              src={s.avatarUrl}
                              className="size-7"
                              fallbackClassName="text-[11px]"
                            />
                            <span className="font-medium">{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record?.checkInAt ? formatTime(record.checkInAt) : '—'}
                        </TableCell>
                        <TableCell>
                          {record ? (
                            <StatusBadge kind="attendance" value={record.status} />
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem registro</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState icon={CalendarCheck2Icon} title="Sem alunos" description="Esta turma ainda não tem alunos matriculados." />
          )}
        </TabsContent>

        {/* Informações */}
        <TabsContent value="informacoes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes da turma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={GraduationCapIcon} label="Curso" value={klass.courseName} />
                <InfoRow icon={UserIcon} label="Professor" value={klass.teacherName} />
                <InfoRow icon={DoorOpenIcon} label="Sala" value={klass.roomName} />
                <InfoRow icon={UsersIcon} label="Capacidade" value={`${klass.enrolled}/${klass.capacity} alunos`} />
                <InfoRow
                  icon={CalendarRangeIcon}
                  label="Período"
                  value={`${formatDate(klass.startDate)} – ${formatDate(klass.endDate)}`}
                />
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ClipboardListIcon className="size-4 text-muted-foreground" />
                  Horários semanais
                </p>
                {klass.schedule.length > 0 ? (
                  <ul className="space-y-2">
                    {klass.schedule.map((slot, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{weekdayLong(slot.weekday)}</span>
                        <span className="tabular text-muted-foreground">
                          {slot.start} – {slot.end}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum horário cadastrado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
