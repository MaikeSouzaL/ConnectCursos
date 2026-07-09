import { CalendarCheckIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAsync } from '@/hooks/use-async'
import { attendanceService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { formatDate, formatTime } from '@/lib/format'

export function AlunoPresencaPage() {
  const studentId = useAuth((s) => s.user?.linkedId ?? '')
  const { data: records, loading } = useAsync(() => attendanceService.byPerson(studentId), [studentId])

  if (loading || !records) {
    return <Skeleton className="h-64 w-full rounded-2xl" />
  }

  const total = records.length
  const present = records.filter((r) => r.status === 'presente' || r.status === 'atrasado').length
  const faltas = records.filter((r) => r.status === 'falta').length
  const rate = total ? Math.round((present / total) * 100) : 0
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Presença</h1>

      <Card className="bg-brand-glow">
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Frequência geral</p>
              <p className="font-display text-4xl font-bold tabular">{rate}%</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-success">{present} presenças</p>
              <p className="text-destructive">{faltas} faltas</p>
            </div>
          </div>
          <Progress value={rate} className="h-2" />
        </CardContent>
      </Card>

      {sorted.length > 0 ? (
        <div className="space-y-2">
          {sorted.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{formatDate(r.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.checkInAt ? `Entrada ${formatTime(r.checkInAt)}` : 'Sem entrada'}
                    {r.checkOutAt ? ` · Saída ${formatTime(r.checkOutAt)}` : ''}
                  </p>
                </div>
                <StatusBadge kind="attendance" value={r.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarCheckIcon} title="Sem registros" description="Suas presenças aparecerão aqui." />
      )}
    </div>
  )
}
