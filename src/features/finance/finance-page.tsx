import { useMemo, useState } from 'react'
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  DownloadIcon,
  FileBarChartIcon,
  FileTextIcon,
  LandmarkIcon,
  PlusIcon,
  ReceiptIcon,
  ScaleIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { RevenueChart } from '@/components/charts/dashboard-charts'
import { CompositionDonut, type DonutSlice } from '@/components/charts/finance-charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NewEntryDialog } from '@/features/finance/new-entry-dialog'
import { CashFlowSection } from '@/features/finance/sections/cashflow-section'
import { AccountsSection } from '@/features/finance/sections/accounts-section'
import { TaxesSection } from '@/features/finance/sections/taxes-section'
import { InvoicesSection } from '@/features/finance/sections/invoices-section'
import { ReportsSection } from '@/features/finance/sections/reports-section'
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
import { useAsync } from '@/hooks/use-async'
import { dashboardService, financeService } from '@/data/services'
import { downloadCSV } from '@/lib/csv'
import { formatBRL, formatDate } from '@/lib/format'
import type { Payment, PaymentKind, PaymentStatus } from '@/data/types'

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function monthLabel(m: string) {
  const [y, mm] = m.split('-')
  return `${MONTHS_PT[Number(mm) - 1]}/${y}`
}
function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const kindMeta: Record<PaymentKind, { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }> = {
  mensalidade: { label: 'Mensalidade', variant: 'gold' },
  aluguel: { label: 'Aluguel', variant: 'info' },
  despesa: { label: 'Despesa', variant: 'danger' },
  outra_receita: { label: 'Outra receita', variant: 'success' },
}

function sumBy(payments: Payment[], pred: (p: Payment) => boolean) {
  return payments.filter(pred).reduce((s, p) => s + p.amount, 0)
}

const payAccessors: Record<string, (p: Payment) => string | number> = {
  description: (p) => p.description,
  kind: (p) => p.kind,
  dueDate: (p) => p.dueDate,
  amount: (p) => p.amount,
  status: (p) => p.status,
}

export function FinancePage() {
  const [month, setMonth] = useState(currentMonth())
  const [kind, setKind] = useState<PaymentKind | 'todos'>('todos')
  const [status, setStatus] = useState<PaymentStatus | 'todos'>('todos')
  const [reload, setReload] = useState(0)

  const { data: allPayments } = useAsync(() => financeService.list({}), [reload])
  const { data: summary } = useAsync(() => financeService.summary(month), [month, reload])
  const { data: monthPayments } = useAsync(() => financeService.list({ month }), [month, reload])
  const { data: revenue6 } = useAsync(() => dashboardService.revenueSeries())

  const months = useMemo(
    () => Array.from(new Set((allPayments ?? []).map((p) => p.referenceMonth))).sort().reverse(),
    [allPayments],
  )

  const dre = useMemo(() => {
    const p = monthPayments ?? []
    const mensalidades = sumBy(p, (x) => x.kind === 'mensalidade' && x.status === 'pago')
    const alugueis = sumBy(p, (x) => x.kind === 'aluguel' && x.status === 'pago')
    const outras = sumBy(p, (x) => x.kind === 'outra_receita' && x.status === 'pago')
    const despesas = sumBy(p, (x) => x.kind === 'despesa' && x.status === 'pago')
    const entradas = mensalidades + alugueis + outras
    return { mensalidades, alugueis, outras, despesas, entradas, resultado: entradas - despesas }
  }, [monthPayments])

  const donut: DonutSlice[] = [
    { name: 'Mensalidades', value: dre.mensalidades, color: 'var(--chart-1)' },
    { name: 'Aluguéis de salas', value: dre.alugueis, color: 'var(--chart-3)' },
    { name: 'Outras receitas', value: dre.outras, color: 'var(--chart-5)' },
  ]

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    ;(monthPayments ?? [])
      .filter((p) => p.kind === 'despesa')
      .forEach((p) => {
        const cat = p.category ?? 'Outros'
        map.set(cat, (map.get(cat) ?? 0) + p.amount)
      })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [monthPayments])
  const totalExpenses = expenseByCategory.reduce((s, [, v]) => s + v, 0)

  const filtered = useMemo(
    () =>
      (monthPayments ?? []).filter(
        (p) => (kind === 'todos' || p.kind === kind) && (status === 'todos' || p.status === status),
      ),
    [monthPayments, kind, status],
  )

  const { sorted, sort, toggle } = useSortable(filtered, payAccessors, { key: 'dueDate', dir: 'desc' })
  const { paged, ...pg } = usePagination(sorted, 10)

  const markPaid = async (id: string) => {
    await financeService.markPaid(id)
    toast.success('Pagamento baixado')
    setReload((r) => r + 1)
  }

  const exportCSV = () => {
    downloadCSV(
      `financeiro-${month}.csv`,
      ['Descrição', 'Tipo', 'Categoria', 'Vencimento', 'Valor', 'Status', 'Pago em'],
      filtered.map((p) => [
        p.description,
        kindMeta[p.kind].label,
        p.category ?? '',
        formatDate(p.dueDate),
        p.amount.toFixed(2).replace('.', ','),
        p.status,
        p.paidAt ? formatDate(p.paidAt) : '',
      ]),
    )
    toast.success('Relatório do mês exportado')
  }

  const exportAll = () => {
    const rows = [...(allPayments ?? [])].sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    downloadCSV(
      'financeiro-completo.csv',
      ['Mês', 'Descrição', 'Tipo', 'Categoria', 'Vencimento', 'Valor', 'Status', 'Pago em'],
      rows.map((p) => [
        p.referenceMonth,
        p.description,
        kindMeta[p.kind].label,
        p.category ?? '',
        formatDate(p.dueDate),
        p.amount.toFixed(2).replace('.', ','),
        p.status,
        p.paidAt ? formatDate(p.paidAt) : '',
      ]),
    )
    toast.success('Relatório completo exportado')
  }

  /** Rotina de cobrança: lança as mensalidades pendentes do mês selecionado. */
  const generateFees = async () => {
    try {
      const { created, skipped } = await financeService.generateMonthlyFees(month)
      if (created === 0) {
        toast.info('Nenhuma mensalidade a gerar', {
          description: `Os ${skipped} alunos ativos já têm cobrança em ${monthLabel(month)}.`,
        })
      } else {
        toast.success(`${created} mensalidade(s) gerada(s)`, {
          description: `Referência ${monthLabel(month)} · vencimento dia 10${skipped ? ` · ${skipped} já tinham` : ''}.`,
        })
        setReload((r) => r + 1)
      }
    } catch (err) {
      toast.error('Não foi possível gerar as mensalidades', { description: (err as Error).message })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro & Relatórios"
        description="Mensalidades, aluguéis, despesas e resultado da instituição."
        actions={
          <>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {monthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <DownloadIcon className="size-4" />
                  Exportar
                  <ChevronDownIcon className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCSV}>Mês atual ({monthLabel(month)})</DropdownMenuItem>
                <DropdownMenuItem onClick={exportAll}>Todos os lançamentos</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={generateFees}>
              <ReceiptIcon className="size-4" />
              Gerar mensalidades
            </Button>
            <NewEntryDialog
              onCreated={() => setReload((r) => r + 1)}
              trigger={
                <Button size="sm">
                  <PlusIcon className="size-4" />
                  Novo lançamento
                </Button>
              }
            />
          </>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Receita recebida" value={formatBRL(summary.revenue)} icon={ArrowUpRightIcon} accent="success" />
            <StatCard label="Despesas" value={formatBRL(summary.expense)} icon={ArrowDownRightIcon} accent="red" goodDirection="down" />
            <StatCard label="Resultado do mês" value={formatBRL(summary.net)} icon={ScaleIcon} accent={summary.net >= 0 ? 'success' : 'red'} />
            <StatCard
              label="Inadimplência"
              value={formatBRL(summary.overdue)}
              icon={TriangleAlertIcon}
              hint={`${summary.overdueCount} em atraso · a receber ${formatBRL(summary.pending)}`}
              accent="red"
              goodDirection="down"
            />
          </>
        )}
      </div>

      <Tabs defaultValue="visao">
        <TabsList>
          <TabsTrigger value="visao">
            <TrendingUpIcon className="size-4" />
            Visão geral
          </TabsTrigger>
          <TabsTrigger value="fluxo">
            <ActivityIcon className="size-4" />
            Fluxo de caixa
          </TabsTrigger>
          <TabsTrigger value="receber">
            <ArrowUpRightIcon className="size-4" />
            A receber
          </TabsTrigger>
          <TabsTrigger value="pagar">
            <ArrowDownRightIcon className="size-4" />
            A pagar
          </TabsTrigger>
          <TabsTrigger value="impostos">
            <LandmarkIcon className="size-4" />
            Impostos
          </TabsTrigger>
          <TabsTrigger value="notas">
            <FileTextIcon className="size-4" />
            Notas fiscais
          </TabsTrigger>
          <TabsTrigger value="relatorio">
            <FileBarChartIcon className="size-4" />
            Relatório anual
          </TabsTrigger>
          <TabsTrigger value="lancamentos">
            <BanknoteIcon className="size-4" />
            Lançamentos
          </TabsTrigger>
        </TabsList>

        {/* Visão geral */}
        <TabsContent value="visao" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Receita x Despesa</CardTitle>
                <p className="text-sm text-muted-foreground">Evolução dos últimos 6 meses</p>
              </CardHeader>
              <CardContent>{revenue6 && <RevenueChart data={revenue6} />}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Composição da receita</CardTitle>
                <p className="text-sm text-muted-foreground">{monthLabel(month)}</p>
              </CardHeader>
              <CardContent>
                <CompositionDonut data={donut} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* DRE simples */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do mês (DRE)</CardTitle>
                <p className="text-sm text-muted-foreground">Valores recebidos e pagos em {monthLabel(month)}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <DreRow label="Mensalidades" value={dre.mensalidades} />
                <DreRow label="Aluguéis de salas" value={dre.alugueis} />
                {dre.outras > 0 && <DreRow label="Outras receitas" value={dre.outras} />}
                <Separator />
                <DreRow label="Total de entradas" value={dre.entradas} strong />
                <DreRow label="Despesas" value={-dre.despesas} />
                <Separator />
                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold">Resultado do mês</span>
                  <span
                    className={`font-display text-xl font-bold tabular ${dre.resultado >= 0 ? 'text-success' : 'text-destructive'}`}
                  >
                    {formatBRL(dre.resultado)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Despesas por categoria */}
            <Card>
              <CardHeader>
                <CardTitle>Despesas por categoria</CardTitle>
                <p className="text-sm text-muted-foreground">Distribuição em {monthLabel(month)}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenseByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma despesa neste mês.</p>
                ) : (
                  expenseByCategory.map(([cat, val]) => {
                    const pct = totalExpenses ? Math.round((val / totalExpenses) * 100) : 0
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{cat}</span>
                          <span className="tabular text-muted-foreground">
                            {formatBRL(val)} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-brand-red" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fluxo de caixa */}
        <TabsContent value="fluxo">
          <CashFlowSection />
        </TabsContent>

        {/* A receber */}
        <TabsContent value="receber">
          <AccountsSection mode="receber" onChanged={() => setReload((r) => r + 1)} />
        </TabsContent>

        {/* A pagar */}
        <TabsContent value="pagar">
          <AccountsSection mode="pagar" onChanged={() => setReload((r) => r + 1)} />
        </TabsContent>

        {/* Impostos */}
        <TabsContent value="impostos">
          <TaxesSection />
        </TabsContent>

        {/* Notas fiscais */}
        <TabsContent value="notas">
          <InvoicesSection />
        </TabsContent>

        {/* Relatório anual */}
        <TabsContent value="relatorio">
          <ReportsSection />
        </TabsContent>

        {/* Lançamentos */}
        <TabsContent value="lancamentos" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={kind} onValueChange={(v) => setKind(v as PaymentKind | 'todos')}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="mensalidade">Mensalidades</SelectItem>
                <SelectItem value="aluguel">Aluguéis</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
                <SelectItem value="outra_receita">Outras receitas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as PaymentStatus | 'todos')}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="atrasado">Atrasados</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.length} lançamento(s) · {formatBRL(filtered.reduce((s, p) => s + p.amount, 0))}
            </span>
          </div>

          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead label="Descrição" sortKey="description" sort={sort} onToggle={toggle} />
                  <SortableHead label="Tipo" sortKey="kind" sort={sort} onToggle={toggle} />
                  <SortableHead label="Vencimento" sortKey="dueDate" sort={sort} onToggle={toggle} />
                  <SortableHead label="Valor" sortKey="amount" sort={sort} onToggle={toggle} />
                  <SortableHead label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[280px]">
                      <p className="truncate font-medium">{p.description}</p>
                      {p.category && <p className="truncate text-xs text-muted-foreground">{p.category}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={kindMeta[p.kind].variant}>{kindMeta[p.kind].label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                    <TableCell className="tabular font-medium">{formatBRL(p.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge kind="payment" value={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status !== 'pago' && p.kind !== 'despesa' && (
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

          {filtered.length > 0 && <TablePagination {...pg} label="lançamentos" />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DreRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={`tabular ${strong ? 'font-semibold' : ''} ${value < 0 ? 'text-destructive' : ''}`}>
        {formatBRL(value)}
      </span>
    </div>
  )
}
