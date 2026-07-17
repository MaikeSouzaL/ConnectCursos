import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { RemoveResult } from '@/data/services'

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Excluir de vez, com a trava. Serve para aluno, professor, curso e turma, em
 * página de detalhe (volta para a lista) ou num card de lista (recarrega). Se
 * apagar levaria junto algo que importa, o backend recusa e a tela oferece
 * inativar/arquivar.
 */
export function ExcluirCadastro({
  tipo,
  nome,
  onExcluir,
  onInativar,
  inativarLabel = 'Inativar em vez de excluir',
  voltarPara,
  onConcluido,
  trigger,
}: {
  /** minúsculo: "aluno", "professor", "curso", "turma". */
  tipo: string
  nome: string
  onExcluir: () => Promise<RemoveResult>
  onInativar: () => Promise<void>
  inativarLabel?: string
  /** Para onde ir ao concluir (páginas de detalhe). */
  voltarPara?: string
  /** Ou, numa lista, o que fazer ao concluir (ex.: recarregar). */
  onConcluido?: () => void
  /** Gatilho customizado; se ausente, um botão "Excluir". */
  trigger?: ReactNode
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [bloqueio, setBloqueio] = useState<string | null>(null)

  const concluir = () => {
    setOpen(false)
    if (onConcluido) onConcluido()
    else if (voltarPara) navigate(voltarPara)
  }

  const excluir = async () => {
    setOcupado(true)
    try {
      const r = await onExcluir()
      if (r.ok) {
        toast.success(`${capitalizar(tipo)} excluído`, { description: nome })
        concluir()
      } else {
        setBloqueio(r.detalhe)
      }
    } catch (e) {
      toast.error('Não foi possível excluir', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
    } finally {
      setOcupado(false)
    }
  }

  const inativar = async () => {
    setOcupado(true)
    try {
      await onInativar()
      toast.success(`${capitalizar(tipo)} inativado`, {
        description: 'Some das listas ativas, mas o histórico é mantido.',
      })
      concluir()
    } catch (e) {
      toast.error('Não foi possível inativar', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setBloqueio(null)
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
            <Trash2Icon className="size-4" />
            Excluir
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        {bloqueio ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-warning/15 text-warning">
                <TriangleAlertIcon className="size-6" />
              </div>
              <DialogTitle className="text-center">Não dá para excluir</DialogTitle>
              <DialogDescription className="text-center">
                {nome} tem {bloqueio} no sistema. Apagar levaria isso junto. Você pode inativar: some
                das listas, mas os registros ficam.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={ocupado}>
                Cancelar
              </Button>
              <Button onClick={inativar} disabled={ocupado}>
                {ocupado ? 'Salvando…' : inativarLabel}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Excluir {tipo}?</DialogTitle>
              <DialogDescription>
                Isso remove <strong>{nome}</strong> de vez. Não dá para desfazer. Se houver
                histórico ligado, o sistema avisa e sugere inativar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={ocupado}>
                Cancelar
              </Button>
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={excluir}
                disabled={ocupado}
              >
                {ocupado ? 'Excluindo…' : 'Excluir'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
