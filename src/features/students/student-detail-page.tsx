import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
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
import { AccessCredentials } from '@/components/shared/access-credentials'
import { useAsync } from '@/hooks/use-async'
import { financeService, studentsService } from '@/data/services'
import { formatBRL, formatDate, formatDateTime, formatTime, initials } from '@/lib/format'
import { NewStudentDialog } from '@/features/students/new-student-dialog'
import { formatSchedule } from '@/lib/schedule'

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

export function StudentDetailPage() {
  const { id = '' } = useParams()
  const [reload, setReload] = useState(0)
  const { data, loading } = useAsync(() => studentsService.details(id), [id, reload])

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
        icon={UserIcon}
        title="Aluno não encontrado"
        description="O registro pode ter sido removido."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/alunos">Voltar para Alunos</Link>
          </Button>
        }
      />
    )
  }

  const { student, classes, payments, attendance, presenceRate } = data
  const openPayments = payments.filter((p) => p.status !== 'pago')

  const markPaid = async (paymentId: string) => {
    try {
      await financeService.markPaid(paymentId)
    } catch (e) {
      toast.error('Não foi possível registrar o pagamento', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
      return
    }
    toast.success('Pagamento registrado')
    setReload((r) => r + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/admin/alunos">
            <ArrowLeftIcon className="size-4" />
            Alunos
          </Link>
        </Button>
        <NewStudentDialog
          student={data.student}
          onSaved={() => setReload((r) => r + 1)}
          trigger={
            <Button variant="outline" size="sm">
              <PencilIcon className="size-4" />
              Editar
            </Button>
          }
        />
      </div>

      {/* Cabeçalho do aluno */}
      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-20 text-xl">
            {student.avatarUrl && (
              <AvatarImage src={student.avatarUrl} alt={student.name} className="object-cover" />
            )}
            <AvatarFallback className="bg-primary/15 text-primary">{initials(student.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight">{student.name}</h1>
              <StatusBadge kind="student" value={student.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoRow icon={MailIcon} label="E-mail" value={student.email} />
              <InfoRow icon={PhoneIcon} label="Telefone" value={student.phone} />
              <InfoRow icon={CalendarDaysIcon} label="Matrícula" value={formatDate(student.enrolledAt)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:w-52 sm:grid-cols-1">
            <div>
              <p className="text-xs text-muted-foreground">Mensalidade</p>
              <p className="font-display text-xl font-semibold tabular">{formatBRL(student.monthlyFee)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Frequência</p>
              <div className="flex items-center gap-2">
                <Progress value={presenceRate} className="h-2" />
                <span className="text-sm font-medium tabular">{presenceRate}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AccessCredentials userId={student.userId} quem="aluno" />

      <Tabs defaultValue="turmas">
        <TabsList>
          <TabsTrigger value="turmas">Turmas</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="presenca">Presença</TabsTrigger>
        </TabsList>

        {/* Turmas */}
        <TabsContent value="turmas">
          {classes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {classes.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{c.courseName}</CardTitle>
                      <StatusBadge kind="class" value={c.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{c.name}</p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Professor: <span className="text-foreground">{c.teacherName}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Sala: <span className="text-foreground">{c.roomName}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Horário: <span className="text-foreground">{formatSchedule(c.schedule)}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDaysIcon} title="Sem turmas" description="Este aluno não está em nenhuma turma." />
          )}
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro" className="space-y-4">
          {openPayments.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Pendências em aberto</p>
                  <p className="text-sm text-muted-foreground">
                    {openPayments.length} pagamento(s) · {formatBRL(openPayments.reduce((s, p) => s + p.amount, 0))}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
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
                {payments.map((p) => (
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
        </TabsContent>

        {/* Presença */}
        <TabsContent value="presenca">
          {attendance.length > 0 ? (
            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Data</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...attendance]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 15)
                    .map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{formatDate(a.date)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.checkInAt ? formatTime(a.checkInAt) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.checkOutAt ? formatTime(a.checkOutAt) : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge kind="attendance" value={a.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState icon={CalendarDaysIcon} title="Sem registros" description="Nenhuma presença registrada ainda." />
          )}
          {attendance[0] && (
            <p className="mt-3 text-xs text-muted-foreground">
              Último registro: {formatDateTime(attendance[0].checkInAt ?? attendance[0].date)}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
