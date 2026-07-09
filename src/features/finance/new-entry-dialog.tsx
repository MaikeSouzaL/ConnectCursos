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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { financeService } from '@/data/services'

export const EXPENSE_CATEGORIES = [
  'Aluguel',
  'Utilidades',
  'Serviços',
  'Marketing',
  'Material',
  'Folha',
  'Manutenção',
  'Impostos',
  'Outros',
]

const schema = z.object({
  kind: z.enum(['despesa', 'outra_receita']),
  description: z.string().min(2, 'Descreva o lançamento'),
  amount: z.coerce.number().positive('Valor inválido'),
  dueDate: z.string().min(1, 'Informe a data'),
  status: z.enum(['pago', 'pendente']),
  method: z.enum(['pix', 'cartao', 'boleto', 'dinheiro']),
  category: z.string().optional(),
})
type FormValues = z.input<typeof schema>

export function NewEntryDialog({
  trigger,
  onCreated,
}: {
  trigger: React.ReactNode
  onCreated?: () => void
}) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: 'despesa',
      status: 'pago',
      method: 'boleto',
      category: 'Outros',
      dueDate: new Date().toISOString().slice(0, 10),
    },
  })
  const kind = watch('kind')

  const onSubmit = handleSubmit(async (values) => {
    const paid = values.status === 'pago'
    await financeService.create({
      kind: values.kind,
      description: values.description,
      amount: Number(values.amount),
      dueDate: values.dueDate,
      status: values.status,
      method: values.method,
      paidAt: paid ? new Date().toISOString() : undefined,
      referenceMonth: values.dueDate.slice(0, 7),
      category: values.kind === 'despesa' ? values.category : undefined,
    })
    toast.success('Lançamento registrado', { description: values.description })
    reset()
    setOpen(false)
    onCreated?.()
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>Registre uma despesa ou outra receita da instituição.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={watch('kind')} onValueChange={(v) => setValue('kind', v as FormValues['kind'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa (saída)</SelectItem>
                  <SelectItem value="outra_receita">Outra receita (entrada)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-amount">Valor (R$)</Label>
              <Input id="entry-amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entry-desc">Descrição</Label>
            <Input id="entry-desc" {...register('description')} placeholder="Ex.: Conta de energia — julho" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          {kind === 'despesa' && (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={watch('category')} onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="entry-date">Data</Label>
              <Input id="entry-date" type="date" {...register('dueDate')} />
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormValues['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma</Label>
              <Select value={watch('method')} onValueChange={(v) => setValue('method', v as FormValues['method'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : 'Registrar lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
