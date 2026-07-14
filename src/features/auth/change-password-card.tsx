import { useState } from 'react'
import { KeyRoundIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-store'

/** Troca de senha dentro dos apps do aluno e do professor (mobile). */
export function ChangePasswordCard() {
  const changePassword = useAuth((s) => s.changePassword)
  const [openForm, setOpenForm] = useState(false)
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pass.length < 6) {
      toast.error('A senha deve ter ao menos 6 caracteres')
      return
    }
    if (pass !== confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    setSaving(true)
    const res = await changePassword(pass)
    setSaving(false)
    if (res.ok) {
      toast.success('Senha alterada', { description: 'Use a nova senha no próximo acesso.' })
      setPass('')
      setConfirm('')
      setOpenForm(false)
    } else {
      toast.error('Não foi possível alterar a senha', { description: res.error })
    }
  }

  if (!openForm) {
    return (
      <Card>
        <CardContent>
          <Button variant="outline" className="w-full justify-start" onClick={() => setOpenForm(true)}>
            <KeyRoundIcon className="size-4" />
            Alterar minha senha
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm font-medium">Alterar senha</p>
          <div className="space-y-2">
            <Label htmlFor="np">Nova senha</Label>
            <Input
              id="np"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="np2">Confirmar senha</Label>
            <Input
              id="np2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setOpenForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
