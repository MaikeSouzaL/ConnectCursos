import { useState } from 'react'
import { BuildingIcon, MonitorIcon, MoonIcon, RotateCcwIcon, SunIcon, UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { resetDb } from '@/data/db'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Logomark } from '@/components/brand/Logo'
import { roleLabel, useAuth } from '@/features/auth/auth-store'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

function Field({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<'input'>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  )
}

function InstitutionTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da instituição</CardTitle>
        <p className="text-sm text-muted-foreground">Informações exibidas em recibos e relatórios.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-black ring-1 ring-border">
            <Logomark className="size-11" />
          </div>
          <div>
            <p className="font-display font-semibold">Conect Cursos</p>
            <p className="text-sm text-muted-foreground">Conectada ao seu futuro</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto">
            Trocar logo
          </Button>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="inst-name" label="Nome fantasia" defaultValue="Conect Cursos" />
          <Field id="inst-cnpj" label="CNPJ" defaultValue="12.345.678/0001-90" />
          <Field id="inst-phone" label="Telefone" defaultValue="(11) 3456-7890" />
          <Field id="inst-email" label="E-mail" type="email" defaultValue="contato@conectcursos.com" />
          <div className="sm:col-span-2">
            <Field id="inst-address" label="Endereço" defaultValue="Av. Paulista, 1000 — São Paulo/SP" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => toast.success('Dados da instituição salvos')}>Salvar alterações</Button>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Dados de demonstração</p>
            <p className="text-sm text-muted-foreground">
              Restaura alunos, turmas, financeiro e presenças ao estado inicial de exemplo.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              resetDb()
              toast.success('Dados restaurados', { description: 'A página será recarregada.' })
              setTimeout(() => window.location.reload(), 700)
            }}
          >
            <RotateCcwIcon className="size-4" />
            Restaurar dados de exemplo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AppearanceTab() {
  const { resolvedTheme, setTheme } = useTheme()
  const options: Array<{ value: Theme; label: string; icon: typeof SunIcon }> = [
    { value: 'light', label: 'Claro', icon: SunIcon },
    { value: 'dark', label: 'Escuro', icon: MoonIcon },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <p className="text-sm text-muted-foreground">Escolha o tema da plataforma.</p>
      </CardHeader>
      <CardContent>
        <div className="grid max-w-md grid-cols-2 gap-3">
          {options.map((o) => {
            const active = resolvedTheme === o.value
            return (
              <button
                key={o.value}
                onClick={() => setTheme(o.value)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40',
                )}
              >
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg',
                    active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <o.icon className="size-5" />
                </div>
                <span className="text-sm font-medium">{o.label}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <MonitorIcon className="size-3.5" />
          O tema é salvo neste dispositivo.
        </p>
      </CardContent>
    </Card>
  )
}

const notificationDefs = [
  { key: 'inadimplencia', label: 'Alertas de inadimplência', desc: 'Avisar quando um aluno ficar em atraso.' },
  { key: 'faltas', label: 'Faltas de alunos', desc: 'Notificar faltas registradas nas turmas.' },
  { key: 'reservas', label: 'Reservas de sala', desc: 'Avisar sobre reservas pendentes de confirmação.' },
  { key: 'resumo', label: 'Resumo diário por e-mail', desc: 'Enviar um panorama do dia todo fim de tarde.' },
]

function NotificationsTab() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    inadimplencia: true,
    faltas: true,
    reservas: true,
    resumo: false,
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <p className="text-sm text-muted-foreground">Escolha o que você quer acompanhar.</p>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {notificationDefs.map((n) => (
          <div key={n.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">{n.label}</p>
              <p className="text-sm text-muted-foreground">{n.desc}</p>
            </div>
            <Switch
              checked={enabled[n.key]}
              onCheckedChange={(v) => {
                setEnabled((s) => ({ ...s, [n.key]: v }))
                toast.success(`${n.label}: ${v ? 'ativado' : 'desativado'}`)
              }}
              aria-label={n.label}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function AccountTab() {
  const user = useAuth((s) => s.user)
  if (!user) return null
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 text-lg">
              <AvatarFallback className="bg-primary/15 text-primary">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="gold" className="mt-1.5">
                {roleLabel[user.role]}
              </Badge>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="acc-name" label="Nome" defaultValue={user.name} />
            <Field id="acc-email" label="E-mail" type="email" defaultValue={user.email} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => toast.success('Perfil atualizado')}>Salvar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <p className="text-sm text-muted-foreground">Altere sua senha de acesso.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="acc-pass" label="Nova senha" type="password" placeholder="••••••••" />
            <Field id="acc-pass2" label="Confirmar senha" type="password" placeholder="••••••••" />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => toast.success('Senha alterada')}>
              Alterar senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Gerencie a instituição, aparência, notificações e sua conta." />
      <Tabs defaultValue="instituicao">
        <TabsList>
          <TabsTrigger value="instituicao">
            <BuildingIcon className="size-4" />
            Instituição
          </TabsTrigger>
          <TabsTrigger value="aparencia">
            <SunIcon className="size-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="notificacoes">
            <MonitorIcon className="size-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="conta">
            <UserIcon className="size-4" />
            Conta
          </TabsTrigger>
        </TabsList>
        <TabsContent value="instituicao">
          <InstitutionTab />
        </TabsContent>
        <TabsContent value="aparencia">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="notificacoes">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="conta">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
