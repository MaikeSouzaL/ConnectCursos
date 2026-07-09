import { Badge } from '@/components/ui/badge'
import type {
  AttendanceStatus,
  BookingStatus,
  ClassStatus,
  PaymentStatus,
  StudentStatus,
  TeacherStatus,
} from '@/data/types'

type Variant = React.ComponentProps<typeof Badge>['variant']
type Entry = { label: string; variant: Variant }

const student: Record<StudentStatus, Entry> = {
  ativo: { label: 'Ativo', variant: 'success' },
  inadimplente: { label: 'Inadimplente', variant: 'danger' },
  trancado: { label: 'Trancado', variant: 'secondary' },
  concluido: { label: 'Concluído', variant: 'info' },
}
const teacher: Record<TeacherStatus, Entry> = {
  ativo: { label: 'Ativo', variant: 'success' },
  inativo: { label: 'Inativo', variant: 'secondary' },
}
const course: Record<'ativo' | 'inativo', Entry> = {
  ativo: { label: 'Ativo', variant: 'success' },
  inativo: { label: 'Inativo', variant: 'secondary' },
}
const klass: Record<ClassStatus, Entry> = {
  em_andamento: { label: 'Em andamento', variant: 'success' },
  planejada: { label: 'Planejada', variant: 'info' },
  concluida: { label: 'Concluída', variant: 'secondary' },
}
const payment: Record<PaymentStatus, Entry> = {
  pago: { label: 'Pago', variant: 'success' },
  pendente: { label: 'Pendente', variant: 'warning' },
  atrasado: { label: 'Atrasado', variant: 'danger' },
}
const attendance: Record<AttendanceStatus, Entry> = {
  presente: { label: 'Presente', variant: 'success' },
  atrasado: { label: 'Atrasado', variant: 'warning' },
  falta: { label: 'Falta', variant: 'danger' },
  justificado: { label: 'Justificado', variant: 'info' },
}
const booking: Record<BookingStatus, Entry> = {
  confirmado: { label: 'Confirmado', variant: 'success' },
  pendente: { label: 'Pendente', variant: 'warning' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
}

const maps = { student, teacher, course, class: klass, payment, attendance, booking }

type Kind = keyof typeof maps

export function StatusBadge({
  kind,
  value,
  className,
}: {
  kind: Kind
  value: string
  className?: string
}) {
  const entry = (maps[kind] as Record<string, Entry>)[value] ?? {
    label: value,
    variant: 'secondary' as Variant,
  }
  return (
    <Badge variant={entry.variant} className={className}>
      {entry.label}
    </Badge>
  )
}
