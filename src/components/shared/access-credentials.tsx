import { useState } from 'react'
import { CheckCircle2Icon, CopyIcon, KeyRoundIcon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/use-async'
import { accessService } from '@/data/services'

/**
 * Acesso do aluno/professor: mostra a senha temporária enquanto ela vale (a
 * pessoa ainda não fez o 1º acesso) e deixa o admin gerar uma nova.
 *
 * A senha antiga NUNCA é recuperável — o Auth guarda só um hash. O que se vê
 * aqui é a temporária guardada em temp_credentials, que some quando a pessoa
 * define a própria senha. Só o admin enxerga isso (RLS).
 */
export function AccessCredentials({ userId, quem }: { userId?: string; quem: 'aluno' | 'professor' }) {
  const [reload, setReload] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [novaSenha, setNovaSenha] = useState<string | null>(null)

  const { data: senhaTemp, loading } = useAsync(
    () => (userId ? accessService.tempPassword(userId) : Promise.resolve(null)),
    [userId, reload],
  )

  if (!userId) return null

  const senha = novaSenha ?? senhaTemp

  const copiar = async () => {
    if (!senha) return
    try {
      await navigator.clipboard.writeText(senha)
      toast.success('Senha copiada')
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  const gerar = async () => {
    setGerando(true)
    try {
      const nova = await accessService.resetPassword(userId)
      setNovaSenha(nova)
      setConfirmando(false)
      setReload((r) => r + 1)
      toast.success('Nova senha gerada', { description: `O ${quem} vai entrar de novo com ela.` })
    } catch (e) {
      toast.error('Não foi possível gerar a senha', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
    } finally {
      setGerando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRoundIcon className="size-4 text-primary" />
          Acesso do {quem}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-10 w-full rounded-lg" />
        ) : senha ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {novaSenha
                ? 'Nova senha temporária — passe para a pessoa. Ela some quando o acesso for trocado.'
                : `Senha temporária — o ${quem} ainda não fez o primeiro acesso.`}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-secondary/50 px-3 py-2 font-mono text-base font-semibold tracking-wide text-primary">
                {senha}
              </code>
              <Button variant="outline" size="sm" onClick={copiar}>
                <CopyIcon className="size-4" />
                Copiar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-success" />O {quem} já definiu a própria senha.
          </div>
        )}

        {confirmando ? (
          <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">
              Isso derruba o acesso atual: o {quem} vai precisar entrar de novo com a nova senha
              temporária e trocá-la. Continuar?
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)} disabled={gerando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={gerar} disabled={gerando}>
                {gerando ? 'Gerando…' : 'Gerar nova senha'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmando(true)}>
            <RefreshCwIcon className="size-4" />
            Gerar nova senha
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
