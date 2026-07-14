import { useMemo } from 'react'
import {
  CalendarClockIcon,
  InfoIcon,
  LandmarkIcon,
  PercentIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { formatBRL, formatPercent } from '@/lib/format'
import { simplesAnexoIII, TAX_OBLIGATIONS } from '@/lib/tax'

export function TaxesSection() {
  const { data: flow, loading } = useAsync(() => financeService.cashFlow())

  const tax = useMemo(() => {
    const realized = (flow ?? []).filter((f) => f.realizado)
    const rbt12 = realized.reduce((s, f) => s + f.entradas, 0)
    const monthRevenue = realized.length ? realized[realized.length - 1].entradas : 0
    const s = simplesAnexoIII(rbt12)
    return {
      rbt12,
      monthRevenue,
      monthDAS: monthRevenue * s.effectiveRate,
      annualDAS: rbt12 * s.effectiveRate,
      ...s,
    }
  }, [flow])

  if (loading || !flow) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Receita bruta (base 12m)" value={formatBRL(tax.rbt12)} icon={TrendingUpIcon} accent="gold" />
        <StatCard label="Alíquota efetiva" value={formatPercent(tax.effectiveRate * 100, 2)} icon={PercentIcon} accent="info" />
        <StatCard label="DAS do mês (est.)" value={formatBRL(tax.monthDAS)} icon={ReceiptTextIcon} accent="red" goodDirection="down" />
        <StatCard label="DAS no ano (est.)" value={formatBRL(tax.annualDAS)} icon={LandmarkIcon} accent="red" goodDirection="down" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Enquadramento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LandmarkIcon className="size-4 text-primary" />
              Enquadramento tributário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Regime" value="Simples Nacional" />
            <Row label="Anexo" value="Anexo III (serviços de ensino)" />
            <Row label="Faixa atual" value={<Badge variant="gold">{tax.bracketLabel}</Badge>} />
            <Row label="Alíquota nominal" value={formatPercent(tax.nominalRate * 100, 2)} />
            <Row label="Parcela a deduzir" value={formatBRL(tax.deduction)} />
            <Row label="Alíquota efetiva" value={<span className="font-semibold text-foreground">{formatPercent(tax.effectiveRate * 100, 2)}</span>} />
            <div className="rounded-lg bg-secondary/50 p-2 text-xs text-muted-foreground">
              Efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12
            </div>
          </CardContent>
        </Card>

        {/* Obrigações */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClockIcon className="size-4 text-primary" />
              Calendário de obrigações
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Obrigação</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TAX_OBLIGATIONS.map((o) => (
                  <TableRow key={o.name}>
                    <TableCell>
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.description}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.periodicity === 'Mensal' ? 'info' : 'secondary'}>{o.periodicity}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{o.due}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Nota honesta sobre integração fiscal */}
      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-info" />
          <div className="text-sm">
            <p className="font-medium">Estimativa para planejamento</p>
            <p className="mt-1 text-muted-foreground">
              Os valores acima são uma estimativa com base no faturamento. A apuração e o pagamento
              oficiais são feitos no <strong className="text-foreground">PGDAS-D</strong> (Receita Federal),
              e a emissão de NF-e/SPED exige integração fiscal (certificado digital) — etapas à parte,
              ainda não integradas. Consulte sempre o seu contador.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
