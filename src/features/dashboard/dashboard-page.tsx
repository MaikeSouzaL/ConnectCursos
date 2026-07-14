import { Link } from 'react-router-dom'
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  BellIcon,
  CalendarClockIcon,
  DoorOpenIcon,
  InfoIcon,
  TriangleAlertIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { AttendanceChart, RevenueChart } from '@/components/charts/dashboard-charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { useAsync } from '@/hooks/use-async'
import { dashboardService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { formatBRL, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Alert, BookingType } from '@/data/types'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const bookingBadge: Record<BookingType, { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }> = {
  turma: { label: 'Turma', variant: 'gold' },
  aluguel: { label: 'Aluguel', variant: 'info' },
  palestra: { label: 'Palestra', variant: 'success' },
  evento: { label: 'Evento', variant: 'secondary' },
  manutencao: { label: 'Manutenção', variant: 'warning' },
}

const alertIcon: Record<Alert['severity'], typeof InfoIcon> = {
  danger: TriangleAlertIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
}
const alertColor: Record<Alert['severity'], string> = {
  danger: 'text-destructive bg-destructive/10',
  warning: 'text-warning bg-warning/10',
  info: 'text-info bg-info/10',
}

function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex items-center gap-4">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: i.color }} />
          {i.label}
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const user = useAuth((s) => s.user)
  const { data: kpis, loading: kpisLoading } = useAsync(() => dashboardService.kpis())
  const { data: revenue } = useAsync(() => dashboardService.revenueSeries())
  const { data: attendance } = useAsync(() => dashboardService.attendanceSeries())
  const { data: agenda } = useAsync(() => dashboardService.todayAgenda())
  const { data: alerts } = useAsync(() => dashboardService.alerts())

  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        description="Aqui está o resumo da Conect Cursos hoje."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/financeiro">
                <BanknoteIcon className="size-4" />
                Relatórios
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin/alunos">
                <UserPlusIcon className="size-4" />
                Nova matrícula
              </Link>
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpisLoading || !kpis ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Alunos ativos"
              value={String(kpis.activeStudents)}
              icon={UsersIcon}
              trend={kpis.studentsTrend}
              hint="vs. mês anterior"
              accent="gold"
            />
            <StatCard
              label="Presença (última aula)"
              value={formatPercent(kpis.presenceTodayRate)}
              icon={UserCheckIcon}
              hint="alunos presentes"
              accent="info"
            />
            <StatCard
              label="Receita do mês"
              value={formatBRL(kpis.monthlyRevenue)}
              icon={BanknoteIcon}
              trend={kpis.revenueTrend}
              accent="success"
            />
            <StatCard
              label="Inadimplência"
              value={formatBRL(kpis.overdueAmount)}
              icon={TriangleAlertIcon}
              hint={`${kpis.overdueCount} ${kpis.overdueCount === 1 ? 'aluno' : 'alunos'} em atraso`}
              accent="red"
              goodDirection="down"
            />
          </>
        )}
      </div>

      {/* Receita + Agenda */}
      {/* grid-cols-1: sem ele a coluna implícita vira max-content e o gráfico vaza no mobile. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Receita x Despesa</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Últimos 6 meses</p>
            </div>
            <ChartLegend
              items={[
                { label: 'Receita', color: 'var(--chart-1)' },
                { label: 'Despesa', color: 'var(--chart-2)' },
              ]}
            />
          </CardHeader>
          <CardContent>{revenue && <RevenueChart data={revenue} />}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarClockIcon className="size-4 text-primary" />
              Agenda de hoje
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/salas">
                Ver tudo
                <ArrowUpRightIcon className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {agenda && agenda.length > 0 ? (
              <ul className="space-y-1">
                {agenda.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                  >
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-secondary py-1 text-center">
                      <span className="text-sm font-semibold tabular">{item.start}</span>
                      <span className="text-[10px] text-muted-foreground">{item.end}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.roomName}</p>
                    </div>
                    <Badge variant={bookingBadge[item.type].variant}>{bookingBadge[item.type].label}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarClockIcon}
                title="Sem eventos hoje"
                description="Nenhuma aula ou reserva para hoje."
                className="py-8"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Frequência + Alertas */}
      {/* grid-cols-1: sem ele a coluna implícita vira max-content e o gráfico vaza no mobile. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Frequência</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Presenças x faltas nos últimos dias</p>
            </div>
            <ChartLegend
              items={[
                { label: 'Presença', color: 'var(--chart-4)' },
                { label: 'Falta', color: 'var(--chart-2)' },
              ]}
            />
          </CardHeader>
          <CardContent>{attendance && <AttendanceChart data={attendance} />}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="size-4 text-primary" />
              Alertas
            </CardTitle>
            {alerts && alerts.length > 0 && <Badge variant="danger">{alerts.length}</Badge>}
          </CardHeader>
          <CardContent>
            {alerts && alerts.length > 0 ? (
              <ul className="space-y-2.5">
                {alerts.map((a) => {
                  const Icon = alertIcon[a.severity]
                  return (
                    <li key={a.id} className="flex items-start gap-3">
                      <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', alertColor[a.severity])}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{a.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState icon={DoorOpenIcon} title="Tudo em dia" description="Nenhum alerta no momento." className="py-8" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
