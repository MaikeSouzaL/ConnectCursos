import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRightIcon, CalendarCheckIcon, QrCodeIcon, WalletIcon } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { homeFor } from '@/app/routes-config'
import { roleLabel, useAuth } from '@/features/auth/auth-store'
import type { Role } from '@/data/types'

const highlights = [
  { icon: QrCodeIcon, title: 'Presença por QR Code', desc: 'Entrada e saída registradas em segundos.' },
  { icon: CalendarCheckIcon, title: 'Salas & agenda', desc: 'Controle de aulas e aluguel de salas.' },
  { icon: WalletIcon, title: 'Financeiro completo', desc: 'Mensalidades, aluguéis e inadimplência.' },
]

export function LoginPage() {
  const { loginAs, loginWithPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@conectcursos.com')
  const [password, setPassword] = useState('admin123')

  const enter = (role: Role) => {
    loginAs(role)
    navigate(homeFor(role))
  }

  const submit = () => {
    const res = loginWithPassword(email, password)
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
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">Acesse o painel da Conect Cursos.</p>
          </div>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
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
            <Button type="submit" className="w-full" size="lg">
              Entrar
              <ArrowRightIcon className="size-4" />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou entre como (demo)</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['admin', 'professor', 'aluno'] as Role[]).map((r) => (
              <Button key={r} variant="outline" size="sm" onClick={() => enter(r)}>
                {roleLabel[r]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
