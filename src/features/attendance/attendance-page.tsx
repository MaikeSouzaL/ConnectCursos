import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  DoorOpenIcon,
  LogInIcon,
  LogOutIcon,
  MaximizeIcon,
  QrCodeIcon,
  TriangleAlertIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
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
import { attendanceService, classesService, className, studentName } from '@/data/services'
import { formatTime, initials } from '@/lib/format'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Aba: Registros de entrada/saída por data. */
function RecordsTab() {
  const [date, setDate] = useState(todayISO())
  const { data: records, loading } = useAsync(() => attendanceService.byDate(date), [date])

  const entradas = records?.filter((r) => r.checkInAt).length ?? 0
  const saidas = records?.filter((r) => r.checkOutAt).length ?? 0
  const faltas = records?.filter((r) => r.status === 'falta').length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Label htmlFor="rec-date">Data</Label>
          <Input
            id="rec-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Entradas" value={String(entradas)} icon={LogInIcon} accent="success" />
        <StatCard label="Saídas" value={String(saidas)} icon={LogOutIcon} accent="info" />
        <StatCard label="Faltas" value={String(faltas)} icon={TriangleAlertIcon} accent="red" goodDirection="down" />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Aluno</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : records && records.length > 0 ? (
              records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{initials(studentName(r.personId))}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{studentName(r.personId)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.classId ? className(r.classId) : '—'}</TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {r.checkInAt ? formatTime(r.checkInAt) : '—'}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {r.checkOutAt ? formatTime(r.checkOutAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind="attendance" value={r.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={QrCodeIcon}
                    title="Sem registros nesta data"
                    description="Nenhuma leitura de QR foi registrada no dia selecionado."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

/** Aba: Chamada manual por turma e data. */
function RollCallTab() {
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(todayISO())
  const [reload, setReload] = useState(0)

  const { data: classes } = useAsync(() => classesService.list(''), [])
  const chosen = selectedClass || classes?.[0]?.id || ''

  const { data: students } = useAsync(() => (chosen ? classesService.students(chosen) : Promise.resolve([])), [chosen])
  const { data: records } = useAsync(
    () => (chosen ? attendanceService.byClassAndDate(chosen, date) : Promise.resolve([])),
    [chosen, date, reload],
  )

  const recordByStudent = new Map((records ?? []).map((r) => [r.personId, r]))
  const present = (students ?? []).filter((s) => {
    const st = recordByStudent.get(s.id)?.status
    return st === 'presente' || st === 'atrasado'
  }).length

  const mark = async (studentId: string) => {
    await attendanceService.checkIn({
      personId: studentId,
      personRole: 'aluno',
      classId: chosen,
      date,
      checkInAt: new Date().toISOString(),
      method: 'manual',
      status: 'presente',
    })
    toast.success('Presença registrada')
    setReload((r) => r + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label>Turma</Label>
          <Select value={chosen} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione a turma" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="roll-date">Data</Label>
          <Input
            id="roll-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        {students && (
          <div className="ml-auto text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{present}</span> de {students.length} presentes
          </div>
        )}
      </div>

      {students && students.length > 0 ? (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Aluno</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const rec = recordByStudent.get(s.id)
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initials(s.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular text-muted-foreground">
                      {rec?.checkInAt ? formatTime(rec.checkInAt) : '—'}
                    </TableCell>
                    <TableCell>
                      {rec ? (
                        <StatusBadge kind="attendance" value={rec.status} />
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem registro</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!rec && (
                        <Button size="sm" variant="outline" onClick={() => mark(s.id)}>
                          <CheckCircle2Icon className="size-4" />
                          Presente
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState icon={UsersIcon} title="Sem alunos" description="Selecione uma turma com alunos matriculados." />
      )}
    </div>
  )
}

/** Aba: apresentação do terminal do balcão + atalho para tela cheia. */
function TerminalTab() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-8 py-8 lg:flex-row lg:justify-between lg:px-10">
        <div className="max-w-md space-y-4 text-center lg:text-left">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary lg:mx-0">
            <QrCodeIcon className="size-6" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Terminal do Balcão</h2>
          <p className="text-muted-foreground">
            Abra o terminal em tela cheia e deixe-o visível no balcão de entrada. Os alunos escaneiam o QR Code
            pelo app ao <strong className="text-foreground">entrar</strong> e ao{' '}
            <strong className="text-foreground">sair</strong> — o código é rotativo a cada 30 segundos por segurança.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <Button asChild>
              <Link to="/balcao">
                <MaximizeIcon className="size-4" />
                Abrir terminal do balcão
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-border">
          <QRCodeSVG value="conect://checkin?loc=balcao-01&preview=1" size={168} level="M" marginSize={0} fgColor="#0A0A0B" bgColor="#FFFFFF" />
        </div>
      </CardContent>
    </Card>
  )
}

export function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamadas & QR"
        description="Terminal do balcão, registros de entrada/saída e chamada por turma."
      />
      <Tabs defaultValue="terminal">
        <TabsList>
          <TabsTrigger value="terminal">
            <DoorOpenIcon className="size-4" />
            Terminal
          </TabsTrigger>
          <TabsTrigger value="registros">
            <ClipboardCheckIcon className="size-4" />
            Registros
          </TabsTrigger>
          <TabsTrigger value="chamada">
            <UsersIcon className="size-4" />
            Chamada
          </TabsTrigger>
        </TabsList>
        <TabsContent value="terminal">
          <TerminalTab />
        </TabsContent>
        <TabsContent value="registros">
          <RecordsTab />
        </TabsContent>
        <TabsContent value="chamada">
          <RollCallTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
