import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { coursesService, teachersService } from '@/data/services'
import { useAsync } from '@/hooks/use-async'
import type { Course, CourseStatus } from '@/data/types'

const schema = z.object({
  name: z.string().min(3, 'Informe o nome do curso'),
  category: z.string().min(2, 'Informe a categoria'),
  description: z.string().min(10, 'Descreva o curso em poucas palavras'),
  teacherId: z.string().min(1, 'Selecione um professor'),
  priceMonthly: z.coerce.number().min(0, 'Valor inválido'),
  durationMonths: z.coerce.number().min(1, 'Duração inválida'),
  workloadHours: z.coerce.number().min(1, 'Carga horária inválida'),
  status: z.enum(['ativo', 'inativo']),
})
type FormValues = z.input<typeof schema>

export function NewCourseDialog({
  course,
  trigger,
  onSaved,
}: {
  /** Quando informado, o diálogo entra em modo de edição. */
  course?: Course
  trigger: React.ReactNode
  onSaved?: () => void
}) {
  const [open, setOpen] = useState(false)
  const editing = Boolean(course)
  const { data: teachers } = useAsync(() => teachersService.list(), [open])

  const defaults: FormValues = {
    name: course?.name ?? '',
    category: course?.category ?? '',
    description: course?.description ?? '',
    teacherId: course?.teacherId ?? '',
    priceMonthly: course?.priceMonthly ?? 350,
    durationMonths: course?.durationMonths ?? 6,
    workloadHours: course?.workloadHours ?? 60,
    status: course?.status ?? 'ativo',
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })

  // Reaplica os valores ao (re)abrir, para não guardar rascunho da vez anterior.
  useEffect(() => {
    if (open) reset(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      category: values.category,
      description: values.description,
      teacherId: values.teacherId,
      priceMonthly: Number(values.priceMonthly),
      durationMonths: Number(values.durationMonths),
      workloadHours: Number(values.workloadHours),
      status: values.status as CourseStatus,
    }
    try {
      if (course) {
        await coursesService.update(course.id, payload)
        toast.success('Curso atualizado', { description: values.name })
      } else {
        await coursesService.create({ ...payload, color: 'var(--chart-1)' })
        toast.success('Curso cadastrado', { description: values.name })
        reset()
      }
      setOpen(false)
      onSaved?.()
    } catch (err) {
      toast.error('Não foi possível salvar o curso', { description: (err as Error).message })
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar curso' : 'Novo curso'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Atualize os dados deste curso.' : 'Cadastre um curso no catálogo da Conect Cursos.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nome do curso</Label>
              <Input id="name" {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" {...register('category')} placeholder="Tecnologia" aria-invalid={!!errors.category} />
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Professor</Label>
              <Select
                value={watch('teacherId')}
                onValueChange={(v) => setValue('teacherId', v, { shouldValidate: true })}
              >
                <SelectTrigger aria-invalid={!!errors.teacherId}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {teachers?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.teacherId && <p className="text-xs text-destructive">{errors.teacherId.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" {...register('description')} aria-invalid={!!errors.description} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="priceMonthly">Mensalidade (R$)</Label>
              <Input id="priceMonthly" type="number" step="10" {...register('priceMonthly')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMonths">Duração (meses)</Label>
              <Input id="durationMonths" type="number" step="1" {...register('durationMonths')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workloadHours">Carga (horas)</Label>
              <Input id="workloadHours" type="number" step="1" {...register('workloadHours')} />
            </div>
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

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : editing ? 'Salvar' : 'Cadastrar curso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
