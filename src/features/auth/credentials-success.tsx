import { CheckCircle2Icon, CopyIcon, KeyRoundIcon, MailIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Exibe as credenciais de acesso (e-mail + senha temporária) para o admin
 * compartilhar com o professor/aluno recém-cadastrado.
 */
export function CredentialsSuccess({
  name,
  email,
  password,
  onDone,
}: {
  name: string
  email: string
  password: string
  onDone: () => void
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`E-mail: ${email}\nSenha temporária: ${password}`)
      toast.success('Credenciais copiadas')
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success">
          <CheckCircle2Icon className="size-7" />
        </div>
        <DialogTitle className="text-center">{name} cadastrado(a)!</DialogTitle>
        <p className="text-center text-sm text-muted-foreground">
          Compartilhe o acesso abaixo. No primeiro login o sistema pedirá a troca da senha.
        </p>
      </DialogHeader>

      <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
        <div className="flex items-center gap-3">
          <MailIcon className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">E-mail de acesso</p>
            <p className="truncate text-sm font-medium">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <KeyRoundIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Senha temporária</p>
            <p className="font-mono text-base font-semibold tracking-wide text-primary">{password}</p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={copy}>
          <CopyIcon className="size-4" />
          Copiar credenciais
        </Button>
        <Button onClick={onDone}>Concluir</Button>
      </DialogFooter>
    </>
  )
}
