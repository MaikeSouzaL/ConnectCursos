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
import { CredentialsSuccess } from '@/features/auth/credentials-success'
import { teachersService } from '@/data/services'
import { maskPhone } from '@/lib/masks'
import type { TeacherStatus } from '@/data/types'

const schema = z.object({
  name: z.string().min(3, 'Informe o nome completo'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(8, 'Telefone inválido'),
  specialty: z.string().min(2, 'Informe a especialidade'),
  monthlyRent: z.coerce.number().min(0, 'Valor inválido'),
  status: z.enum(['ativo', 'inativo']),
})
type FormValues = z.input<typeof schema>

export function NewTeacherDialog({
  trigger,
  onCreated,
}: {
  trigger: React.ReactNode
  onCreated?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'ativo', monthlyRent: 500 },
  })

  const onSubmit = handleSubmit(async (values) => {
    const { tempPassword } = await teachersService.create({
      name: values.name,
      email: values.email,
      phone: values.phone,
      specialty: values.specialty,
      monthlyRent: Number(values.monthlyRent),
      status: values.status as TeacherStatus,
      rentStatus: 'pendente',
    })
    toast.success('Professor cadastrado', { description: values.name })
    setCredentials({ name: values.name, email: values.email, password: tempPassword })
    onCreated?.()
  })

  const finish = () => {
    reset()
    setCredentials(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : finish())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {credentials ? (
          <CredentialsSuccess
            name={credentials.name}
            email={credentials.email}
            password={credentials.password}
            onDone={finish}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Novo professor</DialogTitle>
              <DialogDescription>Cadastre um professor na Conect Cursos.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                {...register('phone', { onChange: (e) => (e.target.value = maskPhone(e.target.value)) })}
                placeholder="(11) 90000-0000"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidade</Label>
            <Input id="specialty" {...register('specialty')} placeholder="Ex.: Violão, Inglês, Matemática" />
            {errors.specialty && <p className="text-xs text-destructive">{errors.specialty.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="monthlyRent">Aluguel/mês (R$)</Label>
              <Input id="monthlyRent" type="number" step="10" {...register('monthlyRent')} />
              {errors.monthlyRent && (
                <p className="text-xs text-destructive">{errors.monthlyRent.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => setValue('status', v as FormValues['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={finish}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando…' : 'Cadastrar professor'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
