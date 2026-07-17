import { useState } from 'react'
import { RotateCcwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Botão "Reativar" — atalho para tirar um cadastro do estado inativo (trancado,
 * inativo, concluída) e voltar para ativo, sem abrir o Editar. Quem renderiza
 * decide quando mostrar (só quando está inativo) e para qual status volta.
 */
export function ReativarBotao({
  tipo,
  onReativar,
  onConcluido,
  iconOnly = false,
}: {
  /** minúsculo: "aluno", "professor", "curso", "turma". */
  tipo: string
  onReativar: () => Promise<void>
  onConcluido?: () => void
  /** Num card de lista: só o ícone, sem texto. */
  iconOnly?: boolean
}) {
  const [ocupado, setOcupado] = useState(false)

  const reativar = async () => {
    setOcupado(true)
    try {
      await onReativar()
      toast.success(`${capitalizar(tipo)} reativado`, { description: 'Voltou para as listas ativas.' })
      onConcluido?.()
    } catch (e) {
      toast.error('Não foi possível reativar', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
    } finally {
      setOcupado(false)
    }
  }

  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Reativar ${tipo}`}
        className="text-muted-foreground hover:text-success"
        onClick={reativar}
        disabled={ocupado}
      >
        <RotateCcwIcon className="size-4" />
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={reativar} disabled={ocupado}>
      <RotateCcwIcon className="size-4" />
      {ocupado ? 'Reativando…' : 'Reativar'}
    </Button>
  )
}
