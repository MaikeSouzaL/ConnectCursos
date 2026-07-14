import { useEffect, useState } from 'react'
import { BellIcon, BellOffIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-store'
import { ativarPush, desativarPush, pushEstado, type PushEstado } from '@/features/push/push'

/**
 * Liga/desliga os avisos no aparelho.
 *
 * É por aparelho, não por conta: cada celular/navegador tem a própria
 * inscrição. Por isso não vive junto das preferências da conta.
 */
export function PushCard() {
  const userId = useAuth((s) => s.user?.id)
  const [estado, setEstado] = useState<PushEstado | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    void pushEstado().then(setEstado)
  }, [])

  if (estado === null) return null

  // Nada a oferecer: navegador sem suporte, ou iPhone com o app fora da tela de início.
  if (estado === 'indisponivel') {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <BellOffIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Avisos indisponíveis neste aparelho</p>
            <p className="text-sm text-muted-foreground">
              No iPhone, instale o app na tela de início primeiro (Compartilhar → Adicionar à Tela
              de Início) e abra por lá.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const acao = async () => {
    if (!userId || ocupado) return
    setOcupado(true)
    try {
      const novo = estado === 'inscrito' ? await desativarPush() : await ativarPush(userId)
      setEstado(novo)
      if (novo === 'inscrito') toast.success('Avisos ativados neste aparelho')
      else if (novo === 'negado') {
        toast.error('Permissão negada', {
          description: 'Libere as notificações nas configurações do navegador para este site.',
        })
      } else toast.success('Avisos desativados neste aparelho')
    } catch (e) {
      toast.error('Não foi possível alterar', { description: (e as Error).message })
    } finally {
      setOcupado(false)
    }
  }

  const inscrito = estado === 'inscrito'
  const negado = estado === 'negado'

  return (
    <Card className={inscrito ? 'border-success/30 bg-success/5' : undefined}>
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            inscrito ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground'
          }`}
        >
          {inscrito ? <BellIcon className="size-4" /> : <BellOffIcon className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Avisos no celular</p>
          <p className="text-sm text-muted-foreground">
            {inscrito
              ? 'Você é avisado mesmo com o app fechado.'
              : negado
                ? 'Bloqueado nas configurações do navegador.'
                : 'Saiba na hora se uma aula for cancelada.'}
          </p>
        </div>
        <Button
          size="sm"
          variant={inscrito ? 'outline' : 'default'}
          className="shrink-0"
          disabled={ocupado || negado}
          onClick={acao}
        >
          {ocupado ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {inscrito ? 'Desativar' : 'Ativar'}
        </Button>
      </CardContent>
    </Card>
  )
}
