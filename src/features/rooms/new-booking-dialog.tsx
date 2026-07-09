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
import { roomsService } from '@/data/services'
import type { BookingType, Room } from '@/data/types'

const schema = z
  .object({
    roomId: z.string().min(1, 'Selecione a sala'),
    title: z.string().min(2, 'Informe um título'),
    type: z.enum(['turma', 'aluguel', 'palestra', 'evento', 'manutencao']),
    date: z.string().min(1, 'Informe a data'),
    start: z.string().min(1, 'Início'),
    end: z.string().min(1, 'Fim'),
    renterName: z.string().optional(),
    price: z.coerce.number().min(0).optional(),
  })
  .refine((v) => v.start < v.end, { message: 'O fim deve ser após o início', path: ['end'] })

type FormValues = z.input<typeof schema>

const typeLabels: Record<BookingType, string> = {
  turma: 'Turma',
  aluguel: 'Aluguel',
  palestra: 'Palestra',
  evento: 'Evento',
  manutencao: 'Manutenção',
}

export function NewBookingDialog({
  rooms,
  trigger,
  defaultDate,
  onCreated,
}: {
  rooms: Room[]
  trigger: React.ReactNode
  defaultDate?: string
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
      type: 'aluguel',
      start: '19:00',
      end: '21:00',
      date: defaultDate ?? new Date().toISOString().slice(0, 10),
      price: 0,
    },
  })

  const type = watch('type')

  const onSubmit = handleSubmit(async (values) => {
    await roomsService.createBooking({
      roomId: values.roomId,
      title: values.title,
      type: values.type as BookingType,
      status: 'confirmado',
      date: values.date,
      start: values.start,
      end: values.end,
      renterName: values.renterName || undefined,
      price: Number(values.price) || 0,
    })
    toast.success('Reserva criada', { description: values.title })
    reset()
    setOpen(false)
    onCreated?.()
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova reserva</DialogTitle>
          <DialogDescription>Reserve uma sala para turma, aluguel ou evento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...register('title')} placeholder="Ex.: Aluguel — Workshop de Fotografia" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={watch('roomId')} onValueChange={(v) => setValue('roomId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roomId && <p className="text-xs text-destructive">{errors.roomId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setValue('type', v as FormValues['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(typeLabels) as BookingType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...register('date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Início</Label>
              <Input id="start" type="time" {...register('start')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fim</Label>
              <Input id="end" type="time" {...register('end')} />
              {errors.end && <p className="text-xs text-destructive">{errors.end.message}</p>}
            </div>
          </div>

          {type !== 'turma' && type !== 'manutencao' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="renterName">Responsável / locatário</Label>
                <Input id="renterName" {...register('renterName')} placeholder="Nome de quem alugou" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Valor (R$)</Label>
                <Input id="price" type="number" step="10" {...register('price')} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : 'Criar reserva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
