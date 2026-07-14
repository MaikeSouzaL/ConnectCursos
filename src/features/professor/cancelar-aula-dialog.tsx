import { useState } from 'react'
import { CalendarOffIcon, Loader2Icon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cancellationsService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'

/**
 * Professor avisa que não vai poder dar a aula.
 * O aviso chega em tempo real só para os alunos daquela turma.
 */
export function CancelarAulaDialog({
  classId,
  defaultDate,
  onSaved,
}: {
  classId: string
  defaultDate: string
  onSaved?: () => void
}) {
  const userId = useAuth((s) => s.user?.id)
  const [aberto, setAberto] = useState(false)
  const [date, setDate] = useState(defaultDate)
  const [reason, setReason] = useState('')
  const [salvando, setSalvando] = useState(false)

  const enviar = async () => {
    if (!date || salvando) return
    setSalvando(true)
    try {
      await cancellationsService.cancel(classId, date, reason, userId)
      toast.success('Aviso enviado', { description: 'Os alunos da turma foram avisados agora.' })
      setAberto(false)
      setReason('')
      onSaved?.()
    } catch (e) {
      toast.error('Não foi possível avisar', { description: (e as Error).message })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <CalendarOffIcon className="size-4" />
          Não vou poder dar aula
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avisar que não haverá aula</DialogTitle>
          <DialogDescription>
            Só os alunos desta turma recebem o aviso, na hora — para não irem até o local à toa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-date">Dia da aula</Label>
            <Input id="cancel-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: consulta médica, imprevisto…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)} disabled={salvando}>
            Voltar
          </Button>
          <Button onClick={enviar} disabled={!date || salvando}>
            {salvando ? <Loader2Icon className="size-4 animate-spin" /> : <CalendarOffIcon className="size-4" />}
            Avisar a turma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
