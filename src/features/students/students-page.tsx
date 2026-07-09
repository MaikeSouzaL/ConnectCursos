import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, SearchIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  SortableHead,
  TablePagination,
  usePagination,
  useSortable,
} from '@/components/shared/data-table'
import { NewStudentDialog } from '@/features/students/new-student-dialog'
import { useAsync } from '@/hooks/use-async'
import { studentsService } from '@/data/services'
import { formatBRL, formatDate, initials } from '@/lib/format'
import type { Student, StudentStatus } from '@/data/types'

const statusOptions: Array<{ value: StudentStatus | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'inadimplente', label: 'Inadimplentes' },
  { value: 'trancado', label: 'Trancados' },
  { value: 'concluido', label: 'Concluídos' },
]

const accessors: Record<string, (s: Student) => string | number> = {
  name: (s) => s.name,
  status: (s) => s.status,
  turmas: (s) => s.classIds.length,
  mensalidade: (s) => s.monthlyFee,
  matricula: (s) => s.enrolledAt,
}

export function StudentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StudentStatus | 'todos'>('todos')
  const [reload, setReload] = useState(0)

  const { data: students, loading } = useAsync(
    () => studentsService.list({ search, status }),
    [search, status, reload],
  )

  const { sorted, sort, toggle } = useSortable(students ?? [], accessors, { key: 'name', dir: 'asc' })
  const { paged, ...pg } = usePagination(sorted, 10)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alunos"
        description="Gerencie matrículas, situação financeira e presença."
        actions={
          <NewStudentDialog
            onCreated={() => setReload((r) => r + 1)}
            trigger={
              <Button size="sm">
                <UserPlusIcon className="size-4" />
                Novo aluno
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StudentStatus | 'todos')}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Aluno" sortKey="name" sort={sort} onToggle={toggle} />
              <SortableHead label="Status" sortKey="status" sort={sort} onToggle={toggle} />
              <SortableHead label="Turmas" sortKey="turmas" sort={sort} onToggle={toggle} />
              <SortableHead label="Mensalidade" sortKey="mensalidade" sort={sort} onToggle={toggle} />
              <SortableHead label="Matrícula" sortKey="matricula" sort={sort} onToggle={toggle} />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : paged.length > 0 ? (
              paged.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell>
                    <Link to={`/admin/alunos/${s.id}`} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(s.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind="student" value={s.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.classIds.length}</TableCell>
                  <TableCell className="tabular font-medium">{formatBRL(s.monthlyFee)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(s.enrolledAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link to={`/admin/alunos/${s.id}`} aria-label={`Ver ${s.name}`}>
                        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={UsersIcon}
                    title="Nenhum aluno encontrado"
                    description="Ajuste os filtros ou cadastre um novo aluno."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {students && students.length > 0 && <TablePagination {...pg} label="alunos" />}
    </div>
  )
}
