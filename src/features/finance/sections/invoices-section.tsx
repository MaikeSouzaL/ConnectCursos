import { useState } from 'react'
import { FileTextIcon, InfoIcon, PlusIcon, XCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { NewInvoiceDialog } from '@/features/finance/new-invoice-dialog'
import { useAsync } from '@/hooks/use-async'
import { invoicesService } from '@/data/services'
import { formatBRL, formatDate } from '@/lib/format'
import type { Invoice } from '@/data/types'

const accessors: Record<string, (n: Invoice) => string | number> = {
  number: (n) => n.number,
  customer: (n) => n.customer,
  date: (n) => n.date,
  amount: (n) => n.amount,
}

export function InvoicesSection() {
  const [reload, setReload] = useState(0)
  const { data: invoices, loading } = useAsync(() => invoicesService.list(), [reload])

  const { sorted, sort, toggle } = useSortable(invoices ?? [], accessors, { key: 'number', dir: 'desc' })
  const { paged, ...pg } = usePagination(sorted, 10)

  if (loading || !invoices) return <Skeleton className="h-96 w-full rounded-xl" />

  const emitidas = invoices.filter((n) => n.status === 'emitida')
  const totalEmitido = emitidas.reduce((s, n) => s + n.amount, 0)

  const cancel = async (id: string) => {
    try {
      await invoicesService.cancel(id)
    } catch (e) {
      toast.error('Não foi possível cancelar a nota', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
      return
    }
    toast.success('Nota cancelada')
    setReload((r) => r + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Notas fiscais</h2>
          <p className="text-sm text-muted-foreground">Registro de NFs de serviço emitidas.</p>
        </div>
        <NewInvoiceDialog
          onCreated={() => setReload((r) => r + 1)}
          trigger={
            <Button size="sm">
              <PlusIcon className="size-4" />
              Emitir nota
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Notas emitidas" value={String(emitidas.length)} icon={FileTextIcon} accent="gold" />
        <StatCard label="Valor total emitido" value={formatBRL(totalEmitido)} icon={FileTextIcon} accent="success" />
        <StatCard label="Canceladas" value={String(invoices.length - emitidas.length)} icon={XCircleIcon} accent="neutral" />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Nº" sortKey="number" sort={sort} onToggle={toggle} />
              <SortableHead label="Cliente" sortKey="customer" sort={sort} onToggle={toggle} />
              <SortableHead label="Emissão" sortKey="date" sort={sort} onToggle={toggle} />
              <SortableHead label="Valor" sortKey="amount" sort={sort} onToggle={toggle} />
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-mono text-sm">{n.number}</TableCell>
                <TableCell>
                  <p className="font-medium">{n.customer}</p>
                  <p className="text-xs text-muted-foreground">{n.description}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(n.date)}</TableCell>
                <TableCell className="tabular font-medium">{formatBRL(n.amount)}</TableCell>
                <TableCell>
                  <Badge variant={n.status === 'emitida' ? 'success' : 'danger'}>
                    {n.status === 'emitida' ? 'Emitida' : 'Cancelada'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {n.status === 'emitida' && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => cancel(n.id)}>
                      <XCircleIcon className="size-4" />
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <TablePagination {...pg} label="notas" />

      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-info" />
          <p className="text-sm text-muted-foreground">
            Este é um <strong className="text-foreground">registro/controle</strong> de notas. A{' '}
            <strong className="text-foreground">emissão fiscal oficial (NF-e/NFS-e)</strong> exige integração
            com a prefeitura/SEFAZ (certificado digital) — uma etapa à parte, ainda não integrada.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
