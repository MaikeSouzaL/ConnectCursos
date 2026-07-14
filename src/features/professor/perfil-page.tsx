import { useNavigate } from 'react-router-dom'
import {
  BriefcaseIcon,
  InfoIcon,
  LogOutIcon,
  MailIcon,
  MoonIcon,
  PhoneIcon,
  SunIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { ChangePasswordCard } from '@/features/auth/change-password-card'
import { PushCard } from '@/features/push/push-card'
import { useAsync } from '@/hooks/use-async'
import { teachersService } from '@/data/services'
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
  const { data, loading } = useAsync(() => teachersService.details(teacherId), [teacherId])

  if (loading || !data) return <Skeleton className="h-64 w-full rounded-2xl" />

  const { teacher } = data

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Perfil</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <Avatar className="size-20 text-xl">
            {teacher.avatarUrl && (
              <AvatarImage src={teacher.avatarUrl} alt={teacher.name} className="object-cover" />
            )}
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
            // Havia aqui um "Pagar aluguel com Pix" que não pagava nada. Pior:
            // ele forçava teacher.rentStatus = 'pago' no objeto em memória, para
            // a tela mostrar "pago" mesmo com a RLS barrando a escrita (só o
            // admin escreve em payments). A baixa é da secretaria.
            <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <p>O acerto do aluguel é feito com a secretaria, que dá a baixa por aqui.</p>
            </div>
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

      <PushCard />

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
