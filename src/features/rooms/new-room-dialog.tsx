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
import { roomsService } from '@/data/services'
import type { Room } from '@/data/types'

const schema = z.object({
  name: z.string().min(2, 'Informe o nome da sala'),
  capacity: z.coerce.number().int().positive('Capacidade inválida'),
  hourlyRate: z.coerce.number().min(0, 'Valor inválido'),
  resources: z.string().optional(),
})
type FormValues = z.input<typeof schema>

export function NewRoomDialog({
  room,
  trigger,
  onSaved,
}: {
  room?: Room
  trigger: React.ReactNode
  onSaved?: () => void
}) {
  const [open, setOpen] = useState(false)
  const editing = Boolean(room)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: room?.name ?? '',
      capacity: room?.capacity ?? 20,
      hourlyRate: room?.hourlyRate ?? 60,
      resources: room?.resources.join(', ') ?? '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const resources = (values.resources ?? '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
    if (room) {
      await roomsService.update(room.id, {
        name: values.name,
        capacity: Number(values.capacity),
        hourlyRate: Number(values.hourlyRate),
        resources,
      })
      toast.success('Sala atualizada', { description: values.name })
    } else {
      await roomsService.create({
        name: values.name,
        capacity: Number(values.capacity),
        hourlyRate: Number(values.hourlyRate),
        resources,
        color: `var(--chart-${Math.floor(Math.random() * 5) + 1})`,
      })
      toast.success('Sala cadastrada', { description: values.name })
      reset()
    }
    setOpen(false)
    onSaved?.()
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar sala' : 'Nova sala'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Atualize os dados desta sala.' : 'Cadastre uma sala do seu espaço.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Nome</Label>
            <Input id="room-name" {...register('name')} placeholder="Ex.: Sala Aurora" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="room-cap">Capacidade</Label>
              <Input id="room-cap" type="number" {...register('capacity')} />
              {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-rate">Valor/hora (R$)</Label>
              <Input id="room-rate" type="number" step="5" {...register('hourlyRate')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-res">Recursos (separados por vírgula)</Label>
            <Input id="room-res" {...register('resources')} placeholder="Projetor, Ar-condicionado, Quadro branco" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : editing ? 'Salvar' : 'Cadastrar sala'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
