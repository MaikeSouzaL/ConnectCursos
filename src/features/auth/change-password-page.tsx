import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRoundIcon, ShieldCheckIcon } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { homeFor } from '@/app/routes-config'
import { roleLabel, useAuth } from '@/features/auth/auth-store'

export function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!user) return <Navigate to="/login" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pass.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.')
      return
    }
    if (pass !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    const res = await changePassword(pass)
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível definir a senha.')
      return
    }
    toast.success('Senha definida com sucesso', { description: 'Bem-vindo(a) à Conect Cursos!' })
    navigate(homeFor(user.role))
  }

  const firstName = user.name.split(' ')[0]

  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-black bg-brand-glow p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo showTagline />
        </div>
        <Card>
          <CardContent className="space-y-5 py-2">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRoundIcon className="size-7" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">Olá, {firstName}! 👋</h1>
                {user.mustChangePassword ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Este é seu primeiro acesso como{' '}
                    <strong className="text-foreground">{roleLabel[user.role]}</strong>. Defina uma nova
                    senha para continuar.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Defina uma nova senha para a sua conta.
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pass">Nova senha</Label>
                <Input
                  id="new-pass"
                  type="password"
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value)
                    setError(null)
                  }}
                  placeholder="Mínimo de 6 caracteres"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pass">Confirmar senha</Label>
                <Input
                  id="confirm-pass"
                  type="password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value)
                    setError(null)
                  }}
                  placeholder="Repita a senha"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full">
                <ShieldCheckIcon className="size-4" />
                Definir senha e entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
