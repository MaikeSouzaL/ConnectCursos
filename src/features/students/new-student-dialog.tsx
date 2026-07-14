import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useAsync } from '@/hooks/use-async'
import { classesService, coursesService, studentsService } from '@/data/services'
import { formatBRL } from '@/lib/format'
import { maskCPF, maskPhone } from '@/lib/masks'
import { formatSchedule } from '@/lib/schedule'
import type { Student, StudentStatus } from '@/data/types'

const schema = z.object({
  name: z.string().min(3, 'Informe o nome completo'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(8, 'Telefone inválido'),
  cpf: z.string().min(11, 'CPF inválido'),
  birthDate: z.string().min(1, 'Informe a data'),
  status: z.enum(['ativo', 'inadimplente', 'trancado', 'concluido']),
})
type FormValues = z.input<typeof schema>

export function NewStudentDialog({
  student,
  trigger,
  onSaved,
}: {
  /** Quando informado, o diálogo entra em modo de edição. */
  student?: Student
  trigger: React.ReactNode
  onSaved?: () => void
}) {
  const [open, setOpen] = useState(false)
  const editing = Boolean(student)
  const [selectedClasses, setSelectedClasses] = useState<string[]>(student?.classIds ?? [])
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null)

  const { data: classes } = useAsync(() => classesService.list(''), [open])
  const { data: courses } = useAsync(() => coursesService.list(''), [open])

  const priceByCourse = useMemo(() => {
    const map = new Map<string, number>()
    courses?.forEach((c) => map.set(c.id, c.priceMonthly))
    return map
  }, [courses])

  // Turmas com vaga — mais as em que o aluno já está (senão sumiriam ao editar).
  const available = useMemo(
    () =>
      (classes ?? []).filter(
        (c) =>
          c.status !== 'concluida' &&
          (c.enrolled < c.capacity || (student?.classIds ?? []).includes(c.id)),
      ),
    [classes, student],
  )

  const monthlyFee = useMemo(
    () =>
      selectedClasses.reduce((sum, cid) => {
        const cls = available.find((c) => c.id === cid) ?? classes?.find((c) => c.id === cid)
        return sum + (cls ? (priceByCourse.get(cls.courseId) ?? 0) : 0)
      }, 0),
    [selectedClasses, available, classes, priceByCourse],
  )

  const defaults: FormValues = {
    name: student?.name ?? '',
    email: student?.email ?? '',
    phone: student?.phone ?? '',
    cpf: student?.cpf ?? '',
    birthDate: student?.birthDate || '2000-01-01',
    status: student?.status ?? 'ativo',
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
    if (open) {
      reset(defaults)
      setSelectedClasses(student?.classIds ?? [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleClass = (id: string, checked: boolean) =>
    setSelectedClasses((s) => (checked ? [...s, id] : s.filter((x) => x !== id)))

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      cpf: values.cpf,
      birthDate: values.birthDate,
      monthlyFee,
      status: values.status as StudentStatus,
      classIds: selectedClasses,
    }
    try {
      if (student) {
        await studentsService.update(student.id, payload)
        toast.success('Aluno atualizado', { description: values.name })
        setOpen(false)
        onSaved?.()
        return
      }
      const { tempPassword } = await studentsService.create(payload)
      toast.success('Aluno cadastrado', {
        description: selectedClasses.length
          ? `${values.name} · matriculado em ${selectedClasses.length} turma(s)`
          : values.name,
      })
      setCredentials({ name: values.name, email: values.email, password: tempPassword })
      onSaved?.()
    } catch (err) {
      toast.error('Não foi possível salvar o aluno', { description: (err as Error).message })
    }
  })

  const finish = () => {
    reset(defaults)
    setSelectedClasses(student?.classIds ?? [])
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
              <DialogTitle>{editing ? 'Editar aluno' : 'Novo aluno'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Atualize os dados e as matrículas. Alterar o e-mail também altera o login dele.'
                  : 'Cadastre e matricule um aluno na Conect Cursos.'}
              </DialogDescription>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                {...register('cpf', { onChange: (e) => (e.target.value = maskCPF(e.target.value)) })}
                placeholder="000.000.000-00"
              />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Nascimento</Label>
              <Input id="birthDate" type="date" {...register('birthDate')} />
            </div>
          </div>

          {/* Matrícula em turmas */}
          <div className="space-y-2">
            <Label>Matricular em turmas</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {available.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma turma com vaga disponível.</p>
              ) : (
                available.map((c) => {
                  const checked = selectedClasses.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      htmlFor={`cls-${c.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                    >
                      <Checkbox
                        id={`cls-${c.id}`}
                        checked={checked}
                        onCheckedChange={(v) => toggleClass(c.id, v === true)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.courseName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.name} · {formatSchedule(c.schedule)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular text-muted-foreground">
                        {formatBRL(priceByCourse.get(c.courseId) ?? 0)}/mês
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="trancado">Trancado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mensalidade</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-secondary/50 px-3">
                <span className="font-display font-semibold tabular">{formatBRL(monthlyFee)}</span>
                <span className="ml-1 text-xs text-muted-foreground">/mês</span>
              </div>
            </div>
          </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={finish}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando…' : editing ? 'Salvar' : 'Cadastrar aluno'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
