import { useEffect, useState } from 'react'
import { BuildingIcon, MonitorIcon, MoonIcon, SunIcon, UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUploadButton } from '@/components/shared/image-upload'
import { PersonAvatar } from '@/components/shared/person-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Logomark } from '@/components/brand/Logo'
import { useAsync } from '@/hooks/use-async'
import { avatarService, institutionService, preferencesService, type Institution } from '@/data/services'
import { roleLabel, useAuth } from '@/features/auth/auth-store'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { maskCNPJ, maskPhone } from '@/lib/masks'
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
  const userId = useAuth((s) => s.user?.id)
  const { data, loading } = useAsync(() => institutionService.get(), [])
  const [form, setForm] = useState<Institution | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  if (loading || !form) return <Skeleton className="h-96 w-full rounded-xl" />

  const set = (patch: Partial<Institution>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const enviarLogo = async (file: File) => {
    if (!userId) return
    try {
      const atualizado = await institutionService.uploadLogo(userId, file)
      set({ logoUrl: atualizado.logoUrl })
      toast.success('Logo atualizada', { description: 'Ela já aparece no QR impresso do balcão.' })
    } catch (err) {
      toast.error('Não foi possível enviar a logo', { description: (err as Error).message })
    }
  }

  const removerLogo = async () => {
    try {
      await institutionService.removeLogo()
      set({ logoUrl: null })
      toast.success('Logo removida', { description: 'Voltamos para a logo padrão da Conect.' })
    } catch (err) {
      toast.error('Não foi possível remover', { description: (err as Error).message })
    }
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da instituição')
      return
    }
    setSaving(true)
    try {
      await institutionService.update(form)
      toast.success('Dados da instituição salvos')
    } catch (err) {
      toast.error('Não foi possível salvar', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da instituição</CardTitle>
        <p className="text-sm text-muted-foreground">Informações exibidas em recibos e relatórios.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-black ring-1 ring-border">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo da instituição" className="size-full object-contain p-1" />
            ) : (
              <Logomark className="size-11" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-semibold">{form.name || 'Conect Cursos'}</p>
            <p className="text-sm text-muted-foreground">
              {form.logoUrl ? 'Logo própria — aparece no QR impresso.' : 'Usando a logo padrão da Conect.'}
            </p>
          </div>
          <div className="flex gap-2">
            <ImageUploadButton label="Trocar logo" onPick={enviarLogo} />
            {form.logoUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={removerLogo}>
                Remover
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="inst-name"
            label="Nome fantasia"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
          <Field
            id="inst-cnpj"
            label="CNPJ"
            value={form.cnpj}
            onChange={(e) => set({ cnpj: maskCNPJ(e.target.value) })}
            placeholder="00.000.000/0000-00"
          />
          <Field
            id="inst-phone"
            label="Telefone"
            value={form.phone}
            onChange={(e) => set({ phone: maskPhone(e.target.value) })}
            placeholder="(11) 3456-7890"
          />
          <Field
            id="inst-email"
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="contato@conectcursos.com"
          />
          <div className="sm:col-span-2">
            <Field
              id="inst-address"
              label="Endereço"
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="Rua, número — cidade/UF"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Field
              id="inst-opening"
              label="Saldo inicial em caixa (R$)"
              type="number"
              step="100"
              value={String(form.openingBalance)}
              onChange={(e) => set({ openingBalance: Number(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Dinheiro que a instituição já tinha em caixa/banco. É o ponto de partida do saldo no
              Fluxo de caixa.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
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

const notificationDefaults: Record<string, boolean> = {
  inadimplencia: true,
  faltas: true,
  reservas: true,
  resumo: false,
}

function NotificationsTab() {
  const user = useAuth((s) => s.user)
  const { data } = useAsync(
    () => (user ? preferencesService.get(user.id) : Promise.resolve({})),
    [user?.id],
  )
  const [enabled, setEnabled] = useState<Record<string, boolean>>(notificationDefaults)

  useEffect(() => {
    if (data) setEnabled({ ...notificationDefaults, ...data })
  }, [data])

  const toggle = async (key: string, label: string, value: boolean) => {
    if (!user) return
    const previous = enabled
    const next = { ...enabled, [key]: value }
    setEnabled(next) // otimista
    try {
      await preferencesService.update(user.id, next)
      toast.success(`${label}: ${value ? 'ativado' : 'desativado'}`)
    } catch (err) {
      setEnabled(previous) // desfaz se falhar
      toast.error('Não foi possível salvar a preferência', { description: (err as Error).message })
    }
  }

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
              checked={enabled[n.key] ?? false}
              onCheckedChange={(v) => toggle(n.key, n.label, v)}
              aria-label={n.label}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function AccountTab() {
  const { user, updateProfile, changePassword, setAvatar } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  if (!user) return null

  const enviarFoto = async (file: File) => {
    if (!user) return
    try {
      // Mesmo caminho da selfie do professor/aluno; o admin não tem cadastro
      // vinculado, então só o perfil é atualizado.
      const url = await avatarService.uploadSelfie(user.id, file, user.role, user.linkedId)
      setAvatar(url)
      toast.success('Foto atualizada')
    } catch (err) {
      toast.error('Não foi possível enviar a foto', { description: (err as Error).message })
    }
  }

  const saveProfile = async () => {
    if (name.trim().length < 3) {
      toast.error('Informe seu nome completo')
      return
    }
    setSavingProfile(true)
    const res = await updateProfile(name.trim())
    setSavingProfile(false)
    if (res.ok) toast.success('Perfil atualizado')
    else toast.error('Não foi possível salvar o perfil', { description: res.error })
  }

  const savePassword = async () => {
    if (pass.length < 6) {
      toast.error('A senha deve ter ao menos 6 caracteres')
      return
    }
    if (pass !== confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    setSavingPass(true)
    const res = await changePassword(pass)
    setSavingPass(false)
    if (res.ok) {
      toast.success('Senha alterada', { description: 'Use a nova senha no próximo acesso.' })
      setPass('')
      setConfirm('')
    } else {
      toast.error('Não foi possível alterar a senha', { description: res.error })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <PersonAvatar
              name={user.name}
              src={user.avatarUrl}
              className="size-16 shrink-0 text-lg"
              fallbackClassName="bg-primary/15 text-primary"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="gold" className="mt-1.5">
                {roleLabel[user.role]}
              </Badge>
            </div>
            <ImageUploadButton label={user.avatarUrl ? 'Trocar foto' : 'Enviar foto'} onPick={enviarFoto} />
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="acc-name" label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="space-y-2">
              <Label htmlFor="acc-email">E-mail (login)</Label>
              <Input id="acc-email" type="email" value={user.email} readOnly disabled />
              <p className="text-xs text-muted-foreground">O e-mail é o seu login e não pode ser alterado aqui.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Salvando…' : 'Salvar'}
            </Button>
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
            <Field
              id="acc-pass"
              label="Nova senha"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <Field
              id="acc-pass2"
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={savePassword} disabled={savingPass || !pass}>
              {savingPass ? 'Alterando…' : 'Alterar senha'}
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
