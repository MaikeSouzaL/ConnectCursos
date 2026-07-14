import { useEffect, useState } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'
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
import { classesService, coursesService, roomsService, teachersService } from '@/data/services'
import { useAsync } from '@/hooks/use-async'
import type { Class, ClassStatus, WeeklySlot } from '@/data/types'

const WEEKDAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

export function NewClassDialog({
  klass,
  trigger,
  onSaved,
}: {
  /** Quando informada, o diálogo entra em modo de edição. */
  klass?: Class
  trigger: React.ReactNode
  onSaved?: () => void
}) {
  const [open, setOpen] = useState(false)
  const editing = Boolean(klass)
  const { data: courses } = useAsync(() => coursesService.list(), [open])
  const { data: teachers } = useAsync(() => teachersService.list(), [open])
  const { data: rooms } = useAsync(() => roomsService.list(), [open])

  const [courseId, setCourseId] = useState(klass?.courseId ?? '')
  const [teacherId, setTeacherId] = useState(klass?.teacherId ?? '')
  const [roomId, setRoomId] = useState(klass?.roomId ?? '')
  const [name, setName] = useState(klass?.name ?? '')
  const [capacity, setCapacity] = useState(String(klass?.capacity ?? 20))
  const [startDate, setStartDate] = useState(klass?.startDate ?? '')
  const [endDate, setEndDate] = useState(klass?.endDate ?? '')
  const [status, setStatus] = useState<ClassStatus>(klass?.status ?? 'planejada')
  const [slots, setSlots] = useState<WeeklySlot[]>(
    klass?.schedule?.length ? klass.schedule : [{ weekday: 1, start: '19:00', end: '22:00' }],
  )
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setCourseId(klass?.courseId ?? '')
    setTeacherId(klass?.teacherId ?? '')
    setRoomId(klass?.roomId ?? '')
    setName(klass?.name ?? '')
    setCapacity(String(klass?.capacity ?? 20))
    setStartDate(klass?.startDate ?? '')
    setEndDate(klass?.endDate ?? '')
    setStatus(klass?.status ?? 'planejada')
    setSlots(klass?.schedule?.length ? klass.schedule : [{ weekday: 1, start: '19:00', end: '22:00' }])
  }

  // Reaplica os valores ao (re)abrir, para não guardar rascunho da vez anterior.
  useEffect(() => {
    if (open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Ao escolher o curso num cadastro novo, sugere o nome e o professor do curso.
  useEffect(() => {
    if (!courseId || editing) return
    const course = courses?.find((c) => c.id === courseId)
    if (course) {
      if (!name) setName(`${course.name} — Turma A`)
      if (course.teacherId) setTeacherId(course.teacherId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const setSlot = (i: number, patch: Partial<WeeklySlot>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const addSlot = () => setSlots((prev) => [...prev, { weekday: 3, start: '19:00', end: '22:00' }])
  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, idx) => idx !== i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !courseId || !teacherId || !roomId) {
      toast.error('Preencha curso, professor, sala e nome da turma.')
      return
    }
    setSubmitting(true)
    const payload = {
      name: name.trim(),
      courseId,
      teacherId,
      roomId,
      schedule: slots,
      startDate,
      endDate,
      capacity: Number(capacity) || 0,
      status,
    }
    try {
      if (klass) {
        await classesService.update(klass.id, payload)
        toast.success('Turma atualizada', { description: name })
      } else {
        await classesService.create({ ...payload, studentIds: [] })
        toast.success('Turma criada', { description: name })
      }
      setOpen(false)
      onSaved?.()
    } catch (err) {
      toast.error('Não foi possível salvar a turma', { description: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar turma' : 'Nova turma'}</DialogTitle>
          <DialogDescription>Vincule curso, professor e sala, e defina os horários.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Curso</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Professor</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {rooms?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="class-name">Nome da turma</Label>
              <Input id="class-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Turma A — Noite" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidade</Label>
              <Input id="capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ClassStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Início</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Término</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Horários semanais */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horários</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addSlot}>
                <PlusIcon className="size-4" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={String(s.weekday)} onValueChange={(v) => setSlot(i, { weekday: Number(v) })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="time" value={s.start} onChange={(e) => setSlot(i, { start: e.target.value })} className="w-28" />
                  <Input type="time" value={s.end} onChange={(e) => setSlot(i, { end: e.target.value })} className="w-28" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeSlot(i)}
                    disabled={slots.length === 1}
                    aria-label="Remover horário"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando…' : editing ? 'Salvar' : 'Criar turma'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
