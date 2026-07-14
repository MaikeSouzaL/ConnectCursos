import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { invoicesService } from '@/data/services'

const schema = z.object({
  customer: z.string().min(2, 'Informe o cliente'),
  description: z.string().min(2, 'Informe a descrição'),
  amount: z.coerce.number().positive('Valor inválido'),
  date: z.string().min(1, 'Informe a data'),
})
type FormValues = z.input<typeof schema>

export function NewInvoiceDialog({ trigger, onCreated }: { trigger: React.ReactNode; onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  })

  const onSubmit = handleSubmit(async (values) => {
    let nf
    try {
      nf = await invoicesService.create({
        customer: values.customer,
        description: values.description,
        amount: Number(values.amount),
        date: values.date,
      })
    } catch (e) {
      // Sem isto a falha morria em silêncio: o diálogo fechava e nenhuma nota
      // era emitida.
      toast.error('Não foi possível registrar a nota', {
        description: e instanceof Error ? e.message : 'Tente novamente.',
      })
      return
    }
    toast.success('Nota registrada', { description: `NF nº ${nf.number}` })
    reset()
    setOpen(false)
    onCreated?.()
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emitir nota fiscal</DialogTitle>
          <DialogDescription>Registre uma NF de serviço. A numeração é gerada automaticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nf-customer">Cliente</Label>
            <Input id="nf-customer" {...register('customer')} placeholder="Nome do aluno/cliente" />
            {errors.customer && <p className="text-xs text-destructive">{errors.customer.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nf-desc">Descrição do serviço</Label>
            <Input id="nf-desc" {...register('description')} placeholder="Ex.: Serviços educacionais — julho/2026" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nf-amount">Valor (R$)</Label>
              <Input id="nf-amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nf-date">Data</Label>
              <Input id="nf-date" type="date" {...register('date')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando…' : 'Registrar nota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
