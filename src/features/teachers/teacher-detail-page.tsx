import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  DoorOpenIcon,
  GraduationCapIcon,
  MailIcon,
  PhoneIcon,
  UserSquareIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
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
import { useAsync } from '@/hooks/use-async'
import { financeService, roomName, teachersService } from '@/data/services'
import { formatBRL, formatDate, initials } from '@/lib/format'
import { formatSchedule } from '@/lib/schedule'

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserSquareIcon
  label: string
  value: string
}) {
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

export function TeacherDetailPage() {
  const { id = '' } = useParams()
  const [reload, setReload] = useState(0)
  const { data, loading } = useAsync(() => teachersService.details(id), [id, reload])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={UserSquareIcon}
        title="Professor não encontrado"
        description="O registro pode ter sido removido."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/professores">Voltar para Professores</Link>
          </Button>
        }
      />
    )
  }

  const { teacher, courses, classes, studentsCount, rentPayments } = data

  const markPaid = async (paymentId: string) => {
    await financeService.markPaid(paymentId)
    toast.success('Aluguel baixado')
    setReload((r) => r + 1)
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
        <Link to="/admin/professores">
          <ArrowLeftIcon className="size-4" />
          Professores
        </Link>
      </Button>

      {/* Cabeçalho do professor */}
      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-20 text-xl">
            <AvatarFallback className="bg-primary/15 text-primary">{initials(teacher.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight">{teacher.name}</h1>
              <StatusBadge kind="teacher" value={teacher.status} />
            </div>
            <p className="text-sm text-muted-foreground">{teacher.specialty}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoRow icon={MailIcon} label="E-mail" value={teacher.email} />
              <InfoRow icon={PhoneIcon} label="Telefone" value={teacher.phone} />
              <InfoRow icon={CalendarDaysIcon} label="Contratado em" value={formatDate(teacher.hiredAt)} />
              <InfoRow icon={UsersIcon} label="Alunos" value={String(studentsCount)} />
            </div>
          </div>
          <div className="sm:w-48">
            <p className="text-xs text-muted-foreground">Aluguel mensal</p>
            <p className="font-display text-xl font-semibold tabular">{formatBRL(teacher.monthlyRent)}</p>
            <div className="mt-2">
              <StatusBadge kind="payment" value={teacher.rentStatus} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cursos">
        <TabsList>
          <TabsTrigger value="cursos">Cursos</TabsTrigger>
          <TabsTrigger value="turmas">Turmas</TabsTrigger>
          <TabsTrigger value="aluguel">Aluguel</TabsTrigger>
        </TabsList>

        {/* Cursos */}
        <TabsContent value="cursos">
          {courses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <StatusBadge kind="course" value={c.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{c.category}</p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Preço/mês: <span className="tabular text-foreground">{formatBRL(c.priceMonthly)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Duração: <span className="text-foreground">{c.durationMonths} meses</span>
                    </p>
                    <p className="text-muted-foreground">
                      Carga horária: <span className="text-foreground">{c.workloadHours}h</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={BookOpenIcon} title="Sem cursos" description="Este professor não leciona nenhum curso." />
          )}
        </TabsContent>

        {/* Turmas */}
        <TabsContent value="turmas">
          {classes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {classes.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <StatusBadge kind="class" value={c.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <DoorOpenIcon className="size-4" />
                      <span className="text-foreground">{roomName(c.roomId)}</span>
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <ClockIcon className="size-4" />
                      <span className="text-foreground">{formatSchedule(c.schedule)}</span>
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCapIcon className="size-4" />
                      <span className="text-foreground">
                        {c.studentIds.length}/{c.capacity} alunos
                      </span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDaysIcon} title="Sem turmas" description="Este professor não está em nenhuma turma." />
          )}
        </TabsContent>

        {/* Aluguel */}
        <TabsContent value="aluguel">
          {rentPayments.length > 0 ? (
            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.description}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                      <TableCell className="tabular">{formatBRL(p.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge kind="payment" value={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status !== 'pago' && (
                          <Button size="sm" variant="outline" onClick={() => markPaid(p.id)}>
                            <CheckCircle2Icon className="size-4" />
                            Baixar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState icon={CheckCircle2Icon} title="Sem lançamentos" description="Nenhum pagamento de aluguel registrado." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
