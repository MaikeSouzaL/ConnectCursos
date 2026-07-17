import { useState } from 'react'
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
} from '@/components/ui/dialog'
import type { RemoveResult } from '@/data/services'

/**
 * Excluir aluno/professor de vez, com a trava do histórico. Se a pessoa já tem
 * pagamento ou presença, o backend recusa e a tela oferece inativar — a
 * contabilidade não vira registro fantasma.
 */
export function ExcluirCadastro({
  quem,
  nome,
  onExcluir,
  onInativar,
  voltarPara,
}: {
  quem: 'aluno' | 'professor'
  nome: string
  onExcluir: () => Promise<RemoveResult>
  onInativar: () => Promise<void>
  voltarPara: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [bloqueio, setBloqueio] = useState<{ pagamentos: number; presencas: number } | null>(null)

  const excluir = async () => {
    setOcupado(true)
    try {
      const r = await onExcluir()
      if (r.ok) {
        toast.success(`${quem === 'aluno' ? 'Aluno' : 'Professor'} excluído`, { description: nome })
        setOpen(false)
        navigate(voltarPara)
      } else {
        // Tem histórico: troca o diálogo para a opção de inativar.
        setBloqueio({ pagamentos: r.pagamentos, presencas: r.presencas })
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
      toast.success(`${quem === 'aluno' ? 'Aluno' : 'Professor'} inativado`, {
        description: 'Some das listas ativas, mas o histórico é mantido.',
      })
      setOpen(false)
      navigate(voltarPara)
    } catch (e) {
      toast.error('Não foi possível inativar', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
    } finally {
      setOcupado(false)
    }
  }

  const partes = bloqueio
    ? [
        bloqueio.pagamentos ? `${bloqueio.pagamentos} pagamento(s)` : '',
        bloqueio.presencas ? `${bloqueio.presencas} presença(s)` : '',
      ].filter(Boolean)
    : []

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setBloqueio(null)
      }}
    >
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon className="size-4" />
        Excluir
      </Button>

      <DialogContent>
        {bloqueio ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-warning/15 text-warning">
                <TriangleAlertIcon className="size-6" />
              </div>
              <DialogTitle className="text-center">Não dá para excluir</DialogTitle>
              <DialogDescription className="text-center">
                {nome} já tem {partes.join(' e ')} no sistema. Apagar sumiria com esse histórico.
                Você pode inativar: some das listas, mas os registros ficam.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={ocupado}>
                Cancelar
              </Button>
              <Button onClick={inativar} disabled={ocupado}>
                {ocupado ? 'Inativando…' : 'Inativar em vez de excluir'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Excluir {quem}?</DialogTitle>
              <DialogDescription>
                Isso remove <strong>{nome}</strong>, o login e as matrículas de vez. Não dá para
                desfazer. Se houver histórico financeiro, o sistema vai avisar e sugerir inativar.
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
