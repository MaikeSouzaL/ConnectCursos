import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRightIcon, CalendarCheckIcon, Loader2Icon, QrCodeIcon, ShieldCheckIcon, WalletIcon } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { homeFor } from '@/app/routes-config'
import { useAuth } from '@/features/auth/auth-store'

const highlights = [
  { icon: QrCodeIcon, title: 'Presença por QR Code', desc: 'Entrada e saída registradas em segundos.' },
  { icon: CalendarCheckIcon, title: 'Salas & agenda', desc: 'Controle de aulas e aluguel de salas.' },
  { icon: WalletIcon, title: 'Financeiro completo', desc: 'Mensalidades, aluguéis e inadimplência.' },
]

export function LoginPage() {
  const { loginWithPassword, createAdmin, adminExists } = useAuth()
  const navigate = useNavigate()

  // null = ainda verificando se existe admin
  const [setupMode, setSetupMode] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    adminExists().then((exists) => setSetupMode(!exists))
  }, [adminExists])

  const submitLogin = async () => {
    setSubmitting(true)
    const res = await loginWithPassword(email, password)
    setSubmitting(false)
    if (!res.ok) {
      toast.error('E-mail ou senha inválidos', {
        description: 'Confira os dados. Novos usuários usam a senha temporária enviada pela instituição.',
      })
      return
    }
    if (res.mustChange) {
      navigate('/trocar-senha')
    } else {
      const user = useAuth.getState().user
      navigate(user ? homeFor(user.role) : '/')
    }
  }

  const submitSetup = async () => {
    if (password.length < 6) {
      toast.error('A senha deve ter ao menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem.')
      return
    }
    setSubmitting(true)
    const res = await createAdmin(name, email, password)
    setSubmitting(false)
    if (!res.ok) {
      toast.error('Não foi possível configurar o administrador', { description: res.error })
      return
    }
    toast.success('Administrador configurado!', { description: 'Bem-vindo(a) à Conect Cursos.' })
    navigate('/admin')
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel de marca */}
      <div className="relative hidden overflow-hidden bg-brand-black bg-brand-glow lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo showTagline />
        <div className="space-y-8">
          <h1 className="max-w-md font-display text-4xl font-bold leading-tight tracking-tight text-white">
            A gestão da sua instituição, <span className="text-brand-gradient">conectada ao futuro.</span>
          </h1>
          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h.title} className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-brand-gold ring-1 ring-white/10">
                  <h.icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-white">{h.title}</p>
                  <p className="text-sm text-white/60">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Conect Cursos. Todos os direitos reservados.</p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo showTagline />
          </div>

          {setupMode === null ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2Icon className="size-6 animate-spin" />
              <p className="text-sm">Carregando…</p>
            </div>
          ) : setupMode ? (
            // ————— Primeiro acesso: configurar administrador —————
            <>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheckIcon className="size-6" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="font-display text-2xl font-bold tracking-tight">Configurar instituição</h2>
                  <p className="text-sm text-muted-foreground">Crie a conta do administrador.</p>
                </div>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitSetup()
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Seu nome</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@conectcursos.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? <Loader2Icon className="size-4 animate-spin" /> : <ShieldCheckIcon className="size-4" />}
                  Criar administrador e entrar
                </Button>
              </form>
            </>
          ) : (
            // ————— Login normal —————
            <>
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
                <p className="text-sm text-muted-foreground">Acesse o painel da Conect Cursos.</p>
              </div>

              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitLogin()
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@conectcursos.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button type="button" className="text-xs font-medium text-primary hover:underline">
                      Esqueceu a senha?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
                  Entrar
                  {!submitting && <ArrowRightIcon className="size-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
