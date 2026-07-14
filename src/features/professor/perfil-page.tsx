import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BriefcaseIcon,
  LogOutIcon,
  MailIcon,
  MoonIcon,
  PhoneIcon,
  QrCodeIcon,
  SunIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { ChangePasswordCard } from '@/features/auth/change-password-card'
import { useAsync } from '@/hooks/use-async'
import { financeService, teachersService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { useTheme } from '@/hooks/use-theme'
import { formatBRL, initials } from '@/lib/format'

function Row({ icon: Icon, label, value }: { icon: typeof MailIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

export function ProfessorPerfilPage() {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const teacherId = user?.linkedId ?? ''
  const [reload, setReload] = useState(0)
  const { data, loading } = useAsync(() => teachersService.details(teacherId), [teacherId, reload])

  if (loading || !data) return <Skeleton className="h-64 w-full rounded-2xl" />

  const { teacher, rentPayments } = data
  const openRent = rentPayments.find((p) => p.status !== 'pago')

  const payRent = async () => {
    if (!openRent) return
    await financeService.markPaid(openRent.id)
    teacher.rentStatus = 'pago'
    toast.success('Aluguel pago', { description: 'Pix enviado com sucesso.' })
    setReload((r) => r + 1)
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Perfil</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <Avatar className="size-20 text-xl">
            <AvatarFallback className="bg-primary/15 text-primary">{initials(teacher.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-lg font-bold">{teacher.name}</p>
            <p className="text-sm text-muted-foreground">{teacher.specialty}</p>
          </div>
          <StatusBadge kind="teacher" value={teacher.status} />
        </CardContent>
      </Card>

      {/* Aluguel da sala */}
      <Card className={teacher.rentStatus === 'pago' ? 'border-success/30 bg-success/5' : 'border-primary/20 bg-brand-glow'}>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aluguel da sala</p>
              <p className="font-display text-2xl font-bold tabular">{formatBRL(teacher.monthlyRent)}</p>
              <p className="text-xs text-muted-foreground">por mês</p>
            </div>
            <StatusBadge kind="payment" value={teacher.rentStatus} />
          </div>
          {teacher.rentStatus !== 'pago' && (
            <Button size="lg" className="w-full" onClick={payRent}>
              <QrCodeIcon className="size-5" /> Pagar aluguel com Pix
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border py-0">
          <Row icon={BriefcaseIcon} label="Especialidade" value={teacher.specialty} />
          <Row icon={PhoneIcon} label="Telefone" value={teacher.phone} />
          <Row icon={MailIcon} label="E-mail" value={teacher.email} />
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tema {resolvedTheme === 'dark' ? 'escuro' : 'claro'}</span>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {resolvedTheme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
              Alternar
            </Button>
          </div>
          <Separator />
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOutIcon className="size-4" /> Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
