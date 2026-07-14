import { useNavigate } from 'react-router-dom'
import {
  IdCardIcon,
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
import { useAsync } from '@/hooks/use-async'
import { studentsService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { useTheme } from '@/hooks/use-theme'
import { formatDate, initials } from '@/lib/format'

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

export function AlunoPerfilPage() {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const studentId = user?.linkedId ?? ''
  const { data, loading } = useAsync(() => studentsService.get(studentId), [studentId])

  if (loading || !data) {
    return <Skeleton className="h-64 w-full rounded-2xl" />
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Perfil</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <Avatar className="size-20 text-xl">
            {data.avatarUrl && <AvatarImage src={data.avatarUrl} alt={data.name} className="object-cover" />}
            <AvatarFallback className="bg-primary/15 text-primary">{initials(data.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-lg font-bold">{data.name}</p>
            <p className="text-sm text-muted-foreground">{data.email}</p>
          </div>
          <StatusBadge kind="student" value={data.status} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border py-0">
          <Row icon={PhoneIcon} label="Telefone" value={data.phone} />
          <Row icon={IdCardIcon} label="CPF" value={data.cpf} />
          <Row icon={MailIcon} label="E-mail" value={data.email} />
          <Row icon={IdCardIcon} label="Matrícula" value={formatDate(data.enrolledAt)} />
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
            <LogOutIcon className="size-4" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
