import { useMemo } from 'react'
import { BanknoteIcon, DownloadIcon, LandmarkIcon, ScaleIcon, TrendingUpIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAsync } from '@/hooks/use-async'
import { financeService } from '@/data/services'
import { downloadCSV } from '@/lib/csv'
import { formatBRL } from '@/lib/format'
import { simplesAnexoIII } from '@/lib/tax'
import { cn } from '@/lib/utils'

export function ReportsSection() {
  const { data: flow, loading } = useAsync(() => financeService.cashFlow())
  const year = new Date().getFullYear()

  const report = useMemo(() => {
    const realized = (flow ?? []).filter((f) => f.realizado)
    const rbt12 = realized.reduce((s, f) => s + f.entradas, 0)
    const { effectiveRate } = simplesAnexoIII(rbt12)
    const rows = (flow ?? []).map((f) => ({
      month: f.month,
      realizado: f.realizado,
      faturamento: f.entradas,
      despesas: f.saidas,
      impostos: f.entradas * effectiveRate,
      resultado: f.entradas - f.saidas - f.entradas * effectiveRate,
    }))
    const tot = rows.reduce(
      (a, r) => ({
        faturamento: a.faturamento + r.faturamento,
        despesas: a.despesas + r.despesas,
        impostos: a.impostos + r.impostos,
        resultado: a.resultado + r.resultado,
      }),
      { faturamento: 0, despesas: 0, impostos: 0, resultado: 0 },
    )
    return { rows, tot, effectiveRate }
  }, [flow])

  if (loading || !flow) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }

  const exportReport = () => {
    downloadCSV(
      `relatorio-anual-${year}.csv`,
      ['Mês', 'Faturamento', 'Despesas', 'Impostos (est.)', 'Resultado'],
      report.rows.map((r) => [
        r.month,
        r.faturamento.toFixed(2).replace('.', ','),
        r.despesas.toFixed(2).replace('.', ','),
        r.impostos.toFixed(2).replace('.', ','),
        r.resultado.toFixed(2).replace('.', ','),
      ]),
    )
    toast.success('Relatório anual exportado')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Relatório anual · {year}</h2>
          <p className="text-sm text-muted-foreground">Consolidação para o fechamento contábil e a declaração.</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportReport}>
          <DownloadIcon className="size-4" />
          Exportar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento no ano" value={formatBRL(report.tot.faturamento)} icon={TrendingUpIcon} accent="gold" />
        <StatCard label="Despesas no ano" value={formatBRL(report.tot.despesas)} icon={BanknoteIcon} accent="red" goodDirection="down" />
        <StatCard label="Impostos (est.)" value={formatBRL(report.tot.impostos)} icon={LandmarkIcon} accent="info" goodDirection="down" />
        <StatCard label="Resultado líquido" value={formatBRL(report.tot.resultado)} icon={ScaleIcon} accent={report.tot.resultado >= 0 ? 'success' : 'red'} />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">Despesas</TableHead>
              <TableHead className="text-right">Impostos (est.)</TableHead>
              <TableHead className="text-right">Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((r) => (
              <TableRow key={r.month} className={cn(!r.realizado && 'text-muted-foreground/50')}>
                <TableCell className="font-medium">{r.month}</TableCell>
                <TableCell className="text-right tabular">{r.realizado ? formatBRL(r.faturamento) : '—'}</TableCell>
                <TableCell className="text-right tabular text-destructive">{r.realizado ? formatBRL(r.despesas) : '—'}</TableCell>
                <TableCell className="text-right tabular text-info">{r.realizado ? formatBRL(r.impostos) : '—'}</TableCell>
                <TableCell className={cn('text-right tabular font-medium', r.realizado && r.resultado < 0 && 'text-destructive')}>
                  {r.realizado ? formatBRL(r.resultado) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className="font-semibold">Total {year}</TableCell>
              <TableCell className="text-right font-semibold tabular">{formatBRL(report.tot.faturamento)}</TableCell>
              <TableCell className="text-right font-semibold tabular">{formatBRL(report.tot.despesas)}</TableCell>
              <TableCell className="text-right font-semibold tabular">{formatBRL(report.tot.impostos)}</TableCell>
              <TableCell className="text-right font-semibold tabular">{formatBRL(report.tot.resultado)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </div>
  )
}
