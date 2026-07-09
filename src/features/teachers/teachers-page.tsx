import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, SearchIcon, UserPlusIcon, UserSquareIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
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
import { NewTeacherDialog } from '@/features/teachers/new-teacher-dialog'
import { useAsync } from '@/hooks/use-async'
import { teachersService } from '@/data/services'
import { formatBRL, initials } from '@/lib/format'
import type { Teacher } from '@/data/types'

const accessors: Record<string, (t: Teacher) => string | number> = {
  name: (t) => t.name,
  specialty: (t) => t.specialty,
  status: (t) => t.status,
  rent: (t) => t.monthlyRent,
  rentStatus: (t) => t.rentStatus,
}

export function TeachersPage() {
  const [search, setSearch] = useState('')
  const [reload, setReload] = useState(0)

  const { data: teachers, loading } = useAsync(
    () => teachersService.list(search),
    [search, reload],
  )

  const { sorted, sort, toggle } = useSortable(teachers ?? [], accessors, { key: 'name', dir: 'asc' })
  const { paged, ...pg } = usePagination(sorted, 10)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Professores"
        description="Gerencie o corpo docente e o aluguel de salas."
        actions={
          <NewTeacherDialog
            onCreated={() => setReload((r) => r + 1)}
            trigger={
              <Button size="sm">
                <UserPlusIcon className="size-4" />
                Novo professor
              </Button>
            }
          />
        }
      />

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou especialidade…"
          className="pl-9 sm:max-w-sm"
        />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Professor" sortKey="name" sort={sort} onToggle={toggle} />
              <SortableHead label="Especialidade" sortKey="specialty" sort={sort} onToggle={toggle} />
              <SortableHead label="Status" sortKey="status" sort={sort} onToggle={toggle} />
              <SortableHead label="Aluguel/mês" sortKey="rent" sort={sort} onToggle={toggle} />
              <SortableHead label="Aluguel" sortKey="rentStatus" sort={sort} onToggle={toggle} />
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
              paged.map((t) => (
                <TableRow key={t.id} className="group">
                  <TableCell>
                    <Link to={`/admin/professores/${t.id}`} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(t.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.specialty}</TableCell>
                  <TableCell>
                    <StatusBadge kind="teacher" value={t.status} />
                  </TableCell>
                  <TableCell className="tabular font-medium">{formatBRL(t.monthlyRent)}</TableCell>
                  <TableCell>
                    <StatusBadge kind="payment" value={t.rentStatus} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link to={`/admin/professores/${t.id}`} aria-label={`Ver ${t.name}`}>
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
                    icon={UserSquareIcon}
                    title="Nenhum professor encontrado"
                    description="Ajuste a busca ou cadastre um novo professor."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {teachers && teachers.length > 0 && <TablePagination {...pg} label="professores" />}
    </div>
  )
}
