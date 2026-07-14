import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRightIcon,
  GaugeIcon,
  GraduationCapIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
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
import { NewClassDialog } from '@/features/classes/new-class-dialog'
import { useAsync } from '@/hooks/use-async'
import { classesService, type ClassWithStats } from '@/data/services'
import { formatPercent } from '@/lib/format'
import { formatSchedule } from '@/lib/schedule'

const accessors: Record<string, (c: ClassWithStats) => string | number> = {
  name: (c) => c.name,
  teacher: (c) => c.teacherName,
  room: (c) => c.roomName,
  occupancy: (c) => c.occupancy,
  status: (c) => c.status,
}

export function ClassesPage() {
  const [search, setSearch] = useState('')
  const [reload, setReload] = useState(0)
  const { data: classes, loading } = useAsync(() => classesService.list(search), [search, reload])

  const stats = useMemo(() => {
    if (!classes || classes.length === 0) return null
    const inProgress = classes.filter((c) => c.status === 'em_andamento').length
    const avgOccupancy = Math.round(classes.reduce((sum, c) => sum + c.occupancy, 0) / classes.length)
    const totalStudents = new Set(classes.flatMap((c) => c.studentIds)).size
    return { inProgress, avgOccupancy, totalStudents }
  }, [classes])

  const { sorted, sort, toggle } = useSortable(classes ?? [], accessors, { key: 'name', dir: 'asc' })
  const { paged, ...pg } = usePagination(sorted, 10)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turmas"
        description="Acompanhe turmas, horários e ocupação."
        actions={
          <NewClassDialog
            onSaved={() => setReload((r) => r + 1)}
            trigger={
              <Button size="sm">
                <PlusIcon className="size-4" />
                Nova turma
              </Button>
            }
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {loading || !stats ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Turmas em andamento"
              value={String(stats.inProgress)}
              icon={GraduationCapIcon}
              hint={`de ${classes?.length ?? 0} turmas`}
              accent="gold"
            />
            <StatCard
              label="Ocupação média"
              value={formatPercent(stats.avgOccupancy)}
              icon={GaugeIcon}
              accent="info"
            />
            <StatCard
              label="Alunos matriculados"
              value={String(stats.totalStudents)}
              icon={UsersIcon}
              accent="success"
            />
          </>
        )}
      </div>

      <div className="relative sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome da turma…"
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Turma" sortKey="name" sort={sort} onToggle={toggle} />
              <SortableHead label="Professor" sortKey="teacher" sort={sort} onToggle={toggle} />
              <SortableHead label="Sala" sortKey="room" sort={sort} onToggle={toggle} />
              <TableHead>Horário</TableHead>
              <SortableHead label="Ocupação" sortKey="occupancy" sort={sort} onToggle={toggle} />
              <SortableHead label="Status" sortKey="status" sort={sort} onToggle={toggle} />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : paged.length > 0 ? (
              paged.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <Link to={`/admin/turmas/${c.id}`} className="block min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.courseName}</p>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.teacherName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.roomName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatSchedule(c.schedule)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={c.occupancy} className="h-1.5 w-20" />
                      <span className="whitespace-nowrap text-xs tabular text-muted-foreground">
                        {c.enrolled}/{c.capacity} · {c.occupancy}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind="class" value={c.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link to={`/admin/turmas/${c.id}`} aria-label={`Ver ${c.name}`}>
                        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={GraduationCapIcon}
                    title="Nenhuma turma encontrada"
                    description="Ajuste a busca para encontrar uma turma."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {classes && classes.length > 0 && <TablePagination {...pg} label="turmas" />}
    </div>
  )
}
