import { useMemo, useState } from 'react'
import { CheckCircle2Icon, InboxIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
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
import {
  SortableHead,
  TablePagination,
  usePagination,
  useSortable,
} from '@/components/shared/data-table'
import { useAsync } from '@/hooks/use-async'
import { financeService, studentName, teacherName } from '@/data/services'
import { formatBRL, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarClockIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import type { Payment } from '@/data/types'

function daysOverdue(dueDate: string): number {
  const [y, m, d] = dueDate.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000)
}

const BUCKETS = [
  { key: 'avencer', label: 'A vencer', test: (d: number) => d < 0 },
  { key: 'b30', label: '1–30 dias', test: (d: number) => d >= 0 && d <= 30 },
  { key: 'b60', label: '31–60 dias', test: (d: number) => d > 30 && d <= 60 },
  { key: 'b60p', label: '60+ dias', test: (d: number) => d > 60 },
]

function personName(p: Payment): string {
  if (p.kind === 'mensalidade' && p.personId) return studentName(p.personId)
  if (p.kind === 'aluguel' && p.personId) return teacherName(p.personId)
  return p.description
}

const accessors: Record<string, (p: Payment) => string | number> = {
  name: (p) => personName(p),
  dueDate: (p) => p.dueDate,
  amount: (p) => p.amount,
  days: (p) => daysOverdue(p.dueDate),
}

export function AccountsSection({
  mode,
  onChanged,
}: {
  mode: 'receber' | 'pagar'
  /** Avisa a página para recarregar os KPIs após uma baixa. */
  onChanged?: () => void
}) {
  const isReceber = mode === 'receber'
  const [reload, setReload] = useState(0)
  const { data: items, loading } = useAsync(
    () => (isReceber ? financeService.receivables() : financeService.payables()),
    [reload],
  )

  const { sorted, sort, toggle } = useSortable(items ?? [], accessors, { key: 'dueDate', dir: 'asc' })
  const { paged, ...pg } = usePagination(sorted, 10)

  const totals = useMemo(() => {
    const list = items ?? []
    const total = list.reduce((s, p) => s + p.amount, 0)
    const aVencer = list.filter((p) => daysOverdue(p.dueDate) < 0).reduce((s, p) => s + p.amount, 0)
    const vencido = total - aVencer
    const buckets = BUCKETS.map((b) => ({
      ...b,
      value: list.filter((p) => b.test(daysOverdue(p.dueDate))).reduce((s, p) => s + p.amount, 0),
    }))
    return { total, aVencer, vencido, buckets }
  }, [items])

  const markPaid = async (id: string) => {
    try {
      await financeService.markPaid(id)
    } catch (e) {
      toast.error('Não foi possível dar a baixa', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
      return
    }
    toast.success(isReceber ? 'Recebimento registrado' : 'Pagamento registrado')
    setReload((r) => r + 1)
    onChanged?.()
  }

  if (loading || !items) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={isReceber ? 'Total a receber' : 'Total a pagar'}
          value={formatBRL(totals.total)}
          icon={isReceber ? ArrowUpRightIcon : ArrowDownRightIcon}
          accent={isReceber ? 'success' : 'red'}
          goodDirection={isReceber ? 'up' : 'down'}
        />
        <StatCard label="A vencer" value={formatBRL(totals.aVencer)} icon={CalendarClockIcon} accent="info" />
        <StatCard label="Vencido" value={formatBRL(totals.vencido)} icon={TriangleAlertIcon} accent="red" goodDirection="down" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Idade dos títulos (aging)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          {totals.buckets.map((b) => {
            const pct = totals.total ? Math.round((b.value / totals.total) * 100) : 0
            return (
              <div key={b.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">{b.label}</span>
                  <span className="text-xs tabular text-muted-foreground">{pct}%</span>
                </div>
                <p className="font-display text-lg font-semibold tabular">{formatBRL(b.value)}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn('h-full rounded-full', b.key === 'avencer' ? 'bg-info' : 'bg-brand-red')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title={isReceber ? 'Nada a receber' : 'Nada a pagar'}
          description={isReceber ? 'Todas as receitas estão em dia.' : 'Todas as contas estão pagas.'}
        />
      ) : (
        <>
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead label={isReceber ? 'Devedor / título' : 'Fornecedor / título'} sortKey="name" sort={sort} onToggle={toggle} />
                  <SortableHead label="Vencimento" sortKey="dueDate" sort={sort} onToggle={toggle} />
                  <SortableHead label="Situação" sortKey="days" sort={sort} onToggle={toggle} />
                  <SortableHead label="Valor" sortKey="amount" sort={sort} onToggle={toggle} />
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((p) => {
                  const d = daysOverdue(p.dueDate)
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{personName(p)}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                      <TableCell>
                        {d < 0 ? (
                          <Badge variant="info">vence em {Math.abs(d)}d</Badge>
                        ) : d === 0 ? (
                          <Badge variant="warning">vence hoje</Badge>
                        ) : (
                          <Badge variant="danger">{d}d em atraso</Badge>
                        )}
                      </TableCell>
                      <TableCell className="tabular font-medium">{formatBRL(p.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => markPaid(p.id)}>
                          <CheckCircle2Icon className="size-4" />
                          {isReceber ? 'Receber' : 'Pagar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
          <TablePagination {...pg} label="títulos" />
        </>
      )}
    </div>
  )
}
