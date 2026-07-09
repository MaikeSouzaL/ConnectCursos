import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ScaleIcon,
  WalletIcon,
} from 'lucide-react'
import { CashFlowChart } from '@/components/charts/finance-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useAsync } from '@/hooks/use-async'
import { financeService } from '@/data/services'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

function ChartLegend() {
  const items = [
    { label: 'Entradas', color: 'var(--chart-4)' },
    { label: 'Saídas', color: 'var(--chart-2)' },
    { label: 'Saldo', color: 'var(--chart-1)' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: i.color }} />
          {i.label}
        </div>
      ))}
    </div>
  )
}

export function CashFlowSection() {
  const { data: flow, loading } = useAsync(() => financeService.cashFlow())

  if (loading || !flow) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }

  const realized = flow.filter((f) => f.realizado)
  const totalIn = realized.reduce((s, f) => s + f.entradas, 0)
  const totalOut = realized.reduce((s, f) => s + f.saidas, 0)
  const saldoAtual = realized.length ? realized[realized.length - 1].saldo : 0
  const resultado = totalIn - totalOut

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo em caixa" value={formatBRL(saldoAtual)} icon={WalletIcon} accent="gold" />
        <StatCard label="Entradas no ano" value={formatBRL(totalIn)} icon={ArrowUpRightIcon} accent="success" />
        <StatCard label="Saídas no ano" value={formatBRL(totalOut)} icon={ArrowDownRightIcon} accent="red" goodDirection="down" />
        <StatCard label="Resultado no ano" value={formatBRL(resultado)} icon={ScaleIcon} accent={resultado >= 0 ? 'success' : 'red'} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Fluxo de caixa</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Entradas, saídas e saldo acumulado por mês</p>
          </div>
          <ChartLegend />
        </CardHeader>
        <CardContent>
          <CashFlowChart data={flow} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Resultado</TableHead>
              <TableHead className="text-right">Saldo acumulado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flow.map((f) => (
              <TableRow key={f.ym} className={cn(!f.realizado && 'text-muted-foreground/50')}>
                <TableCell className="font-medium">{f.month}</TableCell>
                <TableCell className="text-right tabular text-success">
                  {f.realizado ? formatBRL(f.entradas) : '—'}
                </TableCell>
                <TableCell className="text-right tabular text-destructive">
                  {f.realizado ? formatBRL(f.saidas) : '—'}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular font-medium',
                    f.realizado && f.entradas - f.saidas < 0 && 'text-destructive',
                  )}
                >
                  {f.realizado ? formatBRL(f.entradas - f.saidas) : '—'}
                </TableCell>
                <TableCell className="text-right tabular font-semibold">{formatBRL(f.saldo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
