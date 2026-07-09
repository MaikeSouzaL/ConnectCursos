/**
 * Camada de serviços (mock). Cada função retorna Promise, imitando uma API.
 * Trocar por chamadas HTTP/Supabase depois NÃO deve exigir mudanças na UI.
 */
import { clone, db, delay, saveDb } from './db'
import type {
  AttendanceRecord,
  AttendanceSeriesPoint,
  Alert,
  CashFlowPoint,
  Class,
  Course,
  DashboardKpis,
  Invoice,
  Payment,
  RevenueSeriesPoint,
  Room,
  RoomBooking,
  Student,
  Teacher,
} from './types'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const TODAY = new Date()
const THIS_MONTH = ym(TODAY)
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

// ————————————————————————————————————— Lookups auxiliares
export function courseName(id: string) {
  return db.courses.find((c) => c.id === id)?.name ?? '—'
}
export function teacherName(id: string) {
  return db.teachers.find((t) => t.id === id)?.name ?? '—'
}
export function roomName(id: string) {
  return db.rooms.find((r) => r.id === id)?.name ?? '—'
}
export function studentName(id: string) {
  return db.students.find((s) => s.id === id)?.name ?? '—'
}
export function className(id: string) {
  return db.classes.find((c) => c.id === id)?.name ?? '—'
}

// ————————————————————————————————————— Autenticação
/** Senha temporária legível gerada no pré-cadastro. */
function genTempPassword() {
  return `Conect${Math.floor(1000 + Math.random() * 9000)}`
}

function setCredential(email: string, password: string, mustChangePassword: boolean) {
  const existing = db.credentials.find((c) => c.email.toLowerCase() === email.toLowerCase())
  if (existing) {
    existing.password = password
    existing.mustChangePassword = mustChangePassword
  } else {
    db.credentials.push({ email, password, mustChangePassword })
  }
}

export const authService = {
  /** Valida e-mail + senha. Retorna { mustChange } ou null se inválido. */
  validate(email: string, password: string): { mustChange: boolean } | null {
    const cred = db.credentials.find((c) => c.email.toLowerCase() === email.trim().toLowerCase())
    if (!cred || cred.password !== password) return null
    return { mustChange: cred.mustChangePassword }
  },
  /** Troca a senha e limpa a obrigatoriedade de troca. */
  changePassword(email: string, newPassword: string) {
    setCredential(email, newPassword, false)
    saveDb()
  },
}

// ————————————————————————————————————— Alunos
export interface StudentFilters {
  search?: string
  status?: Student['status'] | 'todos'
  classId?: string
}
export interface StudentDetails {
  student: Student
  classes: Array<Class & { courseName: string; teacherName: string; roomName: string }>
  payments: Payment[]
  attendance: AttendanceRecord[]
  presenceRate: number
}

export const studentsService = {
  async list(filters: StudentFilters = {}): Promise<Student[]> {
    let out = db.students
    if (filters.status && filters.status !== 'todos') out = out.filter((s) => s.status === filters.status)
    if (filters.classId) out = out.filter((s) => s.classIds.includes(filters.classId!))
    if (filters.search) {
      const q = filters.search.toLowerCase()
      out = out.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    }
    return delay(clone(out))
  },
  async get(id: string): Promise<Student | undefined> {
    return delay(clone(db.students.find((s) => s.id === id)))
  },
  async details(id: string): Promise<StudentDetails | undefined> {
    const student = db.students.find((s) => s.id === id)
    if (!student) return delay(undefined)
    const classes = student.classIds
      .map((cid) => db.classes.find((c) => c.id === cid))
      .filter((c): c is Class => Boolean(c))
      .map((c) => ({
        ...c,
        courseName: courseName(c.courseId),
        teacherName: teacherName(c.teacherId),
        roomName: roomName(c.roomId),
      }))
    const payments = db.payments.filter((p) => p.personId === id)
    const attendance = db.attendance.filter((a) => a.personId === id)
    const present = attendance.filter((a) => a.status === 'presente' || a.status === 'atrasado').length
    const presenceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0
    return delay(clone({ student, classes, payments, attendance, presenceRate }))
  },
  async create(
    data: Omit<Student, 'id' | 'enrolledAt'>,
  ): Promise<{ student: Student; tempPassword: string }> {
    const student: Student = {
      ...data,
      id: `stu_${pad(db.students.length + 1)}`,
      enrolledAt: new Date().toISOString(),
    }
    db.students.push(student)
    // Efetiva a matrícula: adiciona o aluno às turmas escolhidas (respeitando a capacidade).
    student.classIds.forEach((cid) => {
      const cls = db.classes.find((c) => c.id === cid)
      if (cls && !cls.studentIds.includes(student.id) && cls.studentIds.length < cls.capacity) {
        cls.studentIds.push(student.id)
      }
    })
    // Gera credencial de acesso com senha temporária (troca obrigatória no 1º acesso).
    const tempPassword = genTempPassword()
    setCredential(student.email, tempPassword, true)
    saveDb()
    return delay(clone({ student, tempPassword }))
  },
  async update(id: string, patch: Partial<Student>): Promise<Student | undefined> {
    const s = db.students.find((x) => x.id === id)
    if (s) Object.assign(s, patch)
    saveDb()
    return delay(clone(s))
  },
}

// ————————————————————————————————————— Professores
export interface TeacherDetails {
  teacher: Teacher
  courses: Course[]
  classes: Class[]
  studentsCount: number
  rentPayments: Payment[]
}
export const teachersService = {
  async list(search?: string): Promise<Teacher[]> {
    let out = db.teachers
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((t) => t.name.toLowerCase().includes(q) || t.specialty.toLowerCase().includes(q))
    }
    return delay(clone(out))
  },
  async get(id: string): Promise<Teacher | undefined> {
    return delay(clone(db.teachers.find((t) => t.id === id)))
  },
  async details(id: string): Promise<TeacherDetails | undefined> {
    const teacher = db.teachers.find((t) => t.id === id)
    if (!teacher) return delay(undefined)
    const courses = db.courses.filter((c) => c.teacherId === id)
    const classes = db.classes.filter((c) => c.teacherId === id)
    const studentsCount = new Set(classes.flatMap((c) => c.studentIds)).size
    const rentPayments = db.payments.filter((p) => p.kind === 'aluguel' && p.personId === id)
    return delay(clone({ teacher, courses, classes, studentsCount, rentPayments }))
  },
  async create(
    data: Omit<Teacher, 'id' | 'hiredAt'>,
  ): Promise<{ teacher: Teacher; tempPassword: string }> {
    const teacher: Teacher = {
      ...data,
      id: `tea_${pad(db.teachers.length + 1)}`,
      hiredAt: new Date().toISOString(),
    }
    db.teachers.push(teacher)
    const tempPassword = genTempPassword()
    setCredential(teacher.email, tempPassword, true)
    saveDb()
    return delay(clone({ teacher, tempPassword }))
  },
  async update(id: string, patch: Partial<Teacher>): Promise<Teacher | undefined> {
    const t = db.teachers.find((x) => x.id === id)
    if (t) Object.assign(t, patch)
    saveDb()
    return delay(clone(t))
  },
}

// ————————————————————————————————————— Cursos
export interface CourseWithStats extends Course {
  teacherName: string
  classesCount: number
  studentsCount: number
}
export const coursesService = {
  async list(search?: string): Promise<CourseWithStats[]> {
    let out = db.courses
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
    }
    const withStats = out.map((c) => {
      const classes = db.classes.filter((cl) => cl.courseId === c.id)
      return {
        ...c,
        teacherName: teacherName(c.teacherId),
        classesCount: classes.length,
        studentsCount: new Set(classes.flatMap((cl) => cl.studentIds)).size,
      }
    })
    return delay(clone(withStats))
  },
  async get(id: string): Promise<Course | undefined> {
    return delay(clone(db.courses.find((c) => c.id === id)))
  },
  async create(data: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
    const course: Course = { ...data, id: `cur_${pad(db.courses.length + 1)}`, createdAt: new Date().toISOString() }
    db.courses.push(course)
    saveDb()
    return delay(clone(course))
  },
  async update(id: string, patch: Partial<Course>): Promise<Course | undefined> {
    const c = db.courses.find((x) => x.id === id)
    if (c) Object.assign(c, patch)
    saveDb()
    return delay(clone(c))
  },
}

// ————————————————————————————————————— Turmas
export interface ClassWithStats extends Class {
  courseName: string
  teacherName: string
  roomName: string
  enrolled: number
  occupancy: number
}
export const classesService = {
  async list(search?: string): Promise<ClassWithStats[]> {
    let out = db.classes
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((c) => c.name.toLowerCase().includes(q))
    }
    const mapped = out.map((c) => ({
      ...c,
      courseName: courseName(c.courseId),
      teacherName: teacherName(c.teacherId),
      roomName: roomName(c.roomId),
      enrolled: c.studentIds.length,
      occupancy: Math.round((c.studentIds.length / c.capacity) * 100),
    }))
    return delay(clone(mapped))
  },
  async get(id: string): Promise<ClassWithStats | undefined> {
    const c = db.classes.find((x) => x.id === id)
    if (!c) return delay(undefined)
    return delay(
      clone({
        ...c,
        courseName: courseName(c.courseId),
        teacherName: teacherName(c.teacherId),
        roomName: roomName(c.roomId),
        enrolled: c.studentIds.length,
        occupancy: Math.round((c.studentIds.length / c.capacity) * 100),
      }),
    )
  },
  async students(id: string): Promise<Student[]> {
    const c = db.classes.find((x) => x.id === id)
    const list = c ? db.students.filter((s) => c.studentIds.includes(s.id)) : []
    return delay(clone(list))
  },
}

// ————————————————————————————————————— Salas & Agendamentos
export const roomsService = {
  async list(): Promise<Room[]> {
    return delay(clone(db.rooms))
  },
  async bookingsForWeek(weekStart: Date): Promise<RoomBooking[]> {
    const start = ymd(weekStart)
    const end = ymd(new Date(weekStart.getTime() + 6 * 864e5))
    const out = db.bookings.filter((b) => b.date >= start && b.date <= end)
    return delay(clone(out))
  },
  async createBooking(data: Omit<RoomBooking, 'id'>): Promise<RoomBooking> {
    const booking: RoomBooking = { ...data, id: `bkg_${pad(db.bookings.length + 1)}` }
    db.bookings.push(booking)
    saveDb()
    return delay(clone(booking))
  },
  async create(data: Omit<Room, 'id'>): Promise<Room> {
    const room: Room = { ...data, id: `room_${pad(db.rooms.length + 1)}` }
    db.rooms.push(room)
    saveDb()
    return delay(clone(room))
  },
  async update(id: string, patch: Partial<Room>): Promise<Room | undefined> {
    const r = db.rooms.find((x) => x.id === id)
    if (r) Object.assign(r, patch)
    saveDb()
    return delay(clone(r))
  },
}

// ————————————————————————————————————— Presença
export interface TodayStatus {
  state: 'nenhum' | 'dentro' | 'completo'
  checkInAt?: string
  checkOutAt?: string
}
export interface ScanResult {
  action: 'entrada' | 'saida' | 'completo'
  at: string
  record: AttendanceRecord
}

export const attendanceService = {
  async byClassAndDate(classId: string, date: string): Promise<AttendanceRecord[]> {
    const out = db.attendance.filter((a) => a.classId === classId && a.date === date)
    return delay(clone(out))
  },
  /** Todos os registros de alunos numa data (log do balcão). */
  async byDate(date: string): Promise<AttendanceRecord[]> {
    const out = db.attendance
      .filter((a) => a.date === date && a.personRole === 'aluno')
      .sort((a, b) => (b.checkInAt ?? '').localeCompare(a.checkInAt ?? ''))
    return delay(clone(out))
  },
  async byPerson(personId: string): Promise<AttendanceRecord[]> {
    return delay(clone(db.attendance.filter((a) => a.personId === personId)))
  },
  async checkIn(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const rec: AttendanceRecord = { ...record, id: `att_${pad(db.attendance.length + 1)}` }
    db.attendance.push(rec)
    saveDb()
    return delay(clone(rec))
  },
  /** Situação da pessoa (aluno ou professor) hoje — para a home do app. */
  async todayStatus(personId: string, role: 'aluno' | 'professor' = 'aluno'): Promise<TodayStatus> {
    const date = ymd(new Date())
    const rec = db.attendance.find(
      (a) => a.personId === personId && a.date === date && a.personRole === role,
    )
    if (!rec || !rec.checkInAt) return delay({ state: 'nenhum' })
    if (rec.checkInAt && !rec.checkOutAt)
      return delay({ state: 'dentro', checkInAt: rec.checkInAt })
    return delay({ state: 'completo', checkInAt: rec.checkInAt, checkOutAt: rec.checkOutAt })
  },
  /**
   * Registra uma leitura de QR (aluno ou professor) no balcão.
   * 1ª leitura do dia = entrada; 2ª = saída; depois disso = já completo.
   */
  async registerScan(
    personId: string,
    at: string = new Date().toISOString(),
    role: 'aluno' | 'professor' = 'aluno',
  ): Promise<ScanResult> {
    const when = new Date(at)
    const date = ymd(when)
    const weekday = when.getDay()
    let rec = db.attendance.find(
      (a) => a.personId === personId && a.date === date && a.personRole === role,
    )
    if (!rec || !rec.checkInAt) {
      if (!rec) {
        let classId: string | undefined
        if (role === 'aluno') {
          const student = db.students.find((s) => s.id === personId)
          classId =
            student?.classIds.find((cid) =>
              db.classes.find((c) => c.id === cid)?.schedule.some((s) => s.weekday === weekday),
            ) ?? student?.classIds[0]
        } else {
          classId =
            db.classes.find(
              (c) => c.teacherId === personId && c.schedule.some((s) => s.weekday === weekday),
            )?.id ?? db.classes.find((c) => c.teacherId === personId)?.id
        }
        rec = {
          id: `att_${pad(db.attendance.length + 1)}`,
          personId,
          personRole: role,
          classId,
          date,
          method: 'qr',
          status: 'presente',
        }
        db.attendance.push(rec)
      }
      rec.checkInAt = at
      rec.status = 'presente'
      saveDb()
      return delay({ action: 'entrada', at, record: clone(rec) })
    }
    if (rec.checkInAt && !rec.checkOutAt) {
      rec.checkOutAt = at
      saveDb()
      return delay({ action: 'saida', at, record: clone(rec) })
    }
    return delay({ action: 'completo', at: rec.checkOutAt ?? at, record: clone(rec) })
  },
}

// ————————————————————————————————————— Financeiro
export interface FinanceSummary {
  revenue: number
  expense: number
  net: number
  overdue: number
  overdueCount: number
  pending: number
}
export interface PaymentFilters {
  kind?: Payment['kind'] | 'todos'
  status?: Payment['status'] | 'todos'
  month?: string
}
export const financeService = {
  async list(filters: PaymentFilters = {}): Promise<Payment[]> {
    let out = db.payments
    if (filters.kind && filters.kind !== 'todos') out = out.filter((p) => p.kind === filters.kind)
    if (filters.status && filters.status !== 'todos') out = out.filter((p) => p.status === filters.status)
    if (filters.month) out = out.filter((p) => p.referenceMonth === filters.month)
    out = [...out].sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    return delay(clone(out))
  },
  /** Contas a receber: receitas ainda não recebidas (mensalidades, aluguéis, outras). */
  async receivables(): Promise<Payment[]> {
    return delay(clone(db.payments.filter((p) => p.kind !== 'despesa' && p.status !== 'pago')))
  },
  /** Contas a pagar: despesas ainda não pagas. */
  async payables(): Promise<Payment[]> {
    return delay(clone(db.payments.filter((p) => p.kind === 'despesa' && p.status !== 'pago')))
  },
  async summary(month = THIS_MONTH): Promise<FinanceSummary> {
    const monthly = db.payments.filter((p) => p.referenceMonth === month)
    const revenue = sum(
      monthly.filter((p) => p.kind !== 'despesa' && p.status === 'pago').map((p) => p.amount),
    )
    // Regime de caixa: só despesas efetivamente pagas (consistente com o DRE).
    const expense = sum(
      monthly.filter((p) => p.kind === 'despesa' && p.status === 'pago').map((p) => p.amount),
    )
    const overdueList = monthly.filter((p) => p.kind !== 'despesa' && p.status === 'atrasado')
    const pending = sum(
      monthly.filter((p) => p.kind !== 'despesa' && p.status === 'pendente').map((p) => p.amount),
    )
    return delay({
      revenue,
      expense,
      net: revenue - expense,
      overdue: sum(overdueList.map((p) => p.amount)),
      overdueCount: overdueList.length,
      pending,
    })
  },
  async markPaid(id: string): Promise<Payment | undefined> {
    const p = db.payments.find((x) => x.id === id)
    if (p) {
      p.status = 'pago'
      p.paidAt = new Date().toISOString()
      p.method = p.method ?? 'pix'
    }
    saveDb()
    return delay(clone(p))
  },
  /** Lança uma nova despesa/receita no financeiro. */
  async create(data: Omit<Payment, 'id'>): Promise<Payment> {
    const payment: Payment = { ...data, id: `pay_${pad(db.payments.length + 1)}` }
    db.payments.push(payment)
    saveDb()
    return delay(clone(payment))
  },
  /**
   * Fluxo de caixa dos 12 meses do ano corrente.
   * O mês atual reflete os valores reais (pagos); os anteriores são
   * projeção determinística; os futuros ficam zerados.
   */
  async cashFlow(openingBalance = 8000): Promise<CashFlowPoint[]> {
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const now = TODAY
    const year = now.getFullYear()
    const cm = now.getMonth()
    const monthly = db.payments.filter((p) => p.referenceMonth === THIS_MONTH)
    const realIn = sum(
      monthly.filter((p) => p.kind !== 'despesa' && p.status === 'pago').map((p) => p.amount),
    )
    const realOut = sum(
      monthly.filter((p) => p.kind === 'despesa' && p.status === 'pago').map((p) => p.amount),
    )

    let saldo = openingBalance
    const out: CashFlowPoint[] = []
    for (let i = 0; i < 12; i++) {
      const ymStr = `${year}-${pad(i + 1)}`
      if (i > cm) {
        out.push({ month: MONTHS[i], ym: ymStr, entradas: 0, saidas: 0, saldo, realizado: false })
        continue
      }
      let entradas: number
      let saidas: number
      if (i === cm) {
        entradas = realIn
        saidas = realOut
      } else {
        entradas = Math.round(38000 * (0.82 + i * 0.03) + (i % 2 ? 1600 : -900))
        saidas = Math.round(14000 * (0.9 + i * 0.015) + (i % 2 ? -500 : 700))
      }
      saldo += entradas - saidas
      out.push({ month: MONTHS[i], ym: ymStr, entradas, saidas, saldo, realizado: true })
    }
    return delay(out)
  },
}

// ————————————————————————————————————— Notas fiscais
export const invoicesService = {
  async list(): Promise<Invoice[]> {
    return delay(clone([...db.invoices].sort((a, b) => b.number.localeCompare(a.number))))
  },
  async create(data: Omit<Invoice, 'id' | 'number' | 'status'>): Promise<Invoice> {
    const nextNum = String(1200 + db.invoices.length + 1).padStart(6, '0')
    const invoice: Invoice = { ...data, id: `nf_${pad(db.invoices.length + 1)}`, number: nextNum, status: 'emitida' }
    db.invoices.push(invoice)
    saveDb()
    return delay(clone(invoice))
  },
  async cancel(id: string): Promise<Invoice | undefined> {
    const nf = db.invoices.find((x) => x.id === id)
    if (nf) nf.status = 'cancelada'
    saveDb()
    return delay(clone(nf))
  },
}

// ————————————————————————————————————— Dashboard
export interface TodayAgendaItem extends RoomBooking {
  roomName: string
}
export const dashboardService = {
  async kpis(): Promise<DashboardKpis> {
    const activeStudents = db.students.filter(
      (s) => s.status === 'ativo' || s.status === 'inadimplente',
    ).length

    // presença: usa o dia mais recente com registros
    const dates = [...new Set(db.attendance.map((a) => a.date))].sort().reverse()
    const lastDate = dates[0]
    const dayRecs = db.attendance.filter((a) => a.date === lastDate && a.personRole === 'aluno')
    const present = dayRecs.filter((a) => a.status === 'presente' || a.status === 'atrasado').length
    const presenceTodayRate = dayRecs.length ? Math.round((present / dayRecs.length) * 100) : 0

    const overdueList = db.payments.filter(
      (p) => p.kind === 'mensalidade' && p.status === 'atrasado',
    )
    const monthly = db.payments.filter((p) => p.referenceMonth === THIS_MONTH)
    const monthlyRevenue = sum(
      monthly.filter((p) => p.kind !== 'despesa' && p.status === 'pago').map((p) => p.amount),
    )
    const monthlyExpense = sum(
      monthly.filter((p) => p.kind === 'despesa' && p.status === 'pago').map((p) => p.amount),
    )

    const weekStart = new Date(TODAY)
    weekStart.setDate(TODAY.getDate() - TODAY.getDay())
    const weekBookings = db.bookings.filter((b) => b.date >= ymd(weekStart))
    const bookedHours = sum(
      weekBookings.map((b) => {
        const [sh, sm] = b.start.split(':').map(Number)
        const [eh, em] = b.end.split(':').map(Number)
        return eh + em / 60 - (sh + sm / 60)
      }),
    )
    const availableHours = db.rooms.length * 12 * 6
    const roomOccupancyRate = Math.round((bookedHours / availableHours) * 100)

    return delay({
      activeStudents,
      studentsTrend: 8.2,
      presenceTodayRate,
      overdueAmount: sum(overdueList.map((p) => p.amount)),
      overdueCount: overdueList.length,
      monthlyRevenue,
      revenueTrend: 12.4,
      monthlyExpense,
      netResult: monthlyRevenue - monthlyExpense,
      roomOccupancyRate,
      activeClasses: db.classes.filter((c) => c.status === 'em_andamento').length,
      activeTeachers: db.teachers.filter((t) => t.status === 'ativo').length,
    })
  },

  async revenueSeries(): Promise<RevenueSeriesPoint[]> {
    const labels = ['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']
    const baseRev = 42000
    const baseExp = 15000
    return delay(
      labels.map((month, i) => ({
        month,
        receita: Math.round(baseRev * (0.86 + i * 0.045) + (i % 2 ? 1800 : -900)),
        despesa: Math.round(baseExp * (0.92 + i * 0.02) + (i % 2 ? -600 : 700)),
      })),
    )
  },

  async attendanceSeries(): Promise<AttendanceSeriesPoint[]> {
    const dates = [...new Set(db.attendance.map((a) => a.date))].sort().slice(-7)
    return delay(
      dates.map((date) => {
        const recs = db.attendance.filter((a) => a.date === date && a.personRole === 'aluno')
        const [, m, d] = date.split('-')
        return {
          day: `${d}/${m}`,
          presenca: recs.filter((a) => a.status === 'presente' || a.status === 'atrasado').length,
          falta: recs.filter((a) => a.status === 'falta').length,
        }
      }),
    )
  },

  async alerts(): Promise<Alert[]> {
    const alerts: Alert[] = []
    const overdueStudents = db.students.filter((s) => s.status === 'inadimplente').slice(0, 4)
    overdueStudents.forEach((s) => {
      alerts.push({
        id: `al_${s.id}`,
        kind: 'inadimplencia',
        severity: 'danger',
        title: 'Mensalidade em atraso',
        description: `${s.name} está com a mensalidade de ${THIS_MONTH} atrasada.`,
        at: new Date().toISOString(),
      })
    })
    db.teachers
      .filter((t) => t.rentStatus === 'atrasado')
      .slice(0, 2)
      .forEach((t) => {
        alerts.push({
          id: `al_${t.id}`,
          kind: 'aluguel',
          severity: 'warning',
          title: 'Aluguel de sala pendente',
          description: `${t.name} está com o aluguel da sala em atraso.`,
          at: new Date().toISOString(),
        })
      })
    const pendingBookings = db.bookings.filter((b) => b.status === 'pendente').slice(0, 2)
    pendingBookings.forEach((b) => {
      alerts.push({
        id: `al_${b.id}`,
        kind: 'sala',
        severity: 'info',
        title: 'Reserva de sala a confirmar',
        description: `${b.title} (${roomName(b.roomId)}) aguarda confirmação.`,
        at: new Date().toISOString(),
      })
    })
    return delay(alerts)
  },

  async todayAgenda(): Promise<TodayAgendaItem[]> {
    const today = ymd(TODAY)
    const items = db.bookings
      .filter((b) => b.date === today)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((b) => ({ ...b, roomName: roomName(b.roomId) }))
    return delay(clone(items))
  },
}
