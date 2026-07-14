import { CheckCircle2Icon, InfoIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAsync } from '@/hooks/use-async'
import { studentsService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { formatBRL, formatDate } from '@/lib/format'

export function AlunoFinanceiroPage() {
  const studentId = useAuth((s) => s.user?.linkedId ?? '')
  const { data, loading } = useAsync(() => studentsService.details(studentId), [studentId])

  if (loading || !data) {
    return <Skeleton className="h-64 w-full rounded-2xl" />
  }

  const mensalidades = data.payments
    .filter((p) => p.kind === 'mensalidade')
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  const current = mensalidades[0]

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Mensalidade</h1>

      {current && (
        <Card
          className={
            current.status === 'pago'
              ? 'border-success/30 bg-success/5'
              : 'border-primary/20 bg-brand-glow'
          }
        >
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensalidade atual</p>
                <p className="font-display text-3xl font-bold tabular">{formatBRL(current.amount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Vence em {formatDate(current.dueDate)}</p>
              </div>
              <StatusBadge kind="payment" value={current.status} />
            </div>
            {current.status === 'pago' ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2Icon className="size-4" /> Pagamento em dia. Obrigado!
              </div>
            ) : (
              // Havia aqui um botão "Pagar com Pix" que não pagava nada: chamava
              // markPaid, a RLS barrava (só o admin escreve em payments), e a
              // tela anunciava "Pix recebido com sucesso" com a mensalidade
              // pendente logo abaixo. Não existe integração de pagamento no
              // sistema — enquanto não existir, a tela informa em vez de fingir.
              <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                <InfoIcon className="mt-0.5 size-4 shrink-0" />
                <p>
                  O pagamento é feito direto com a secretaria. Assim que a escola confirmar, o
                  status muda aqui.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Histórico</h2>
        <div className="space-y-2">
          {mensalidades.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium tabular">{formatBRL(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">Ref. {p.referenceMonth}</p>
                </div>
                <StatusBadge kind="payment" value={p.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
