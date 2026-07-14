/**
 * Modelo de domínio da Conect Cursos.
 * Tipos compartilhados por toda a UI. A implementação atual é mock (em memória),
 * mas os contratos abaixo são desenhados para trocar por API/Supabase depois.
 */

export type Role = 'admin' | 'professor' | 'aluno'

export type ID = string

// ————————————————————————————————————————————————————————————
// Status (unions)
// ————————————————————————————————————————————————————————————

export type StudentStatus = 'ativo' | 'inadimplente' | 'trancado' | 'concluido'
export type TeacherStatus = 'ativo' | 'inativo'
export type CourseStatus = 'ativo' | 'inativo'
export type ClassStatus = 'em_andamento' | 'planejada' | 'concluida'

export type AttendanceStatus = 'presente' | 'atrasado' | 'falta' | 'justificado'
export type AttendanceMethod = 'qr' | 'manual'

export type PaymentStatus = 'pago' | 'pendente' | 'atrasado'
export type PaymentKind = 'mensalidade' | 'aluguel' | 'despesa' | 'outra_receita'

export type BookingType = 'turma' | 'aluguel' | 'palestra' | 'evento' | 'manutencao'
export type BookingStatus = 'confirmado' | 'pendente' | 'cancelado'

// ————————————————————————————————————————————————————————————
// Entidades
// ————————————————————————————————————————————————————————————

export interface Course {
  id: ID
  name: string
  description: string
  category: string
  teacherId: ID
  priceMonthly: number
  durationMonths: number
  workloadHours: number
  status: CourseStatus
  /** cor de destaque (token de gráfico ou hex de marca) */
  color: string
  createdAt: string
}

export interface Teacher {
  id: ID
  name: string
  email: string
  phone: string
  avatarUrl?: string
  specialty: string
  status: TeacherStatus
  hiredAt: string
  /** Valor mensal que o professor paga pelo aluguel da sala. */
  monthlyRent: number
  /** Situação do aluguel do mês corrente. */
  rentStatus: PaymentStatus
}

export interface Student {
  id: ID
  name: string
  email: string
  phone: string
  avatarUrl?: string
  cpf: string
  birthDate: string
  status: StudentStatus
  enrolledAt: string
  classIds: ID[]
  /** Valor da mensalidade combinada. */
  monthlyFee: number
}

export interface Room {
  id: ID
  name: string
  capacity: number
  resources: string[]
  color: string
  /** Valor de referência para aluguel avulso (por período). */
  hourlyRate: number
}

export interface WeeklySlot {
  /** 0 = domingo … 6 = sábado */
  weekday: number
  start: string // 'HH:mm'
  end: string // 'HH:mm'
}

export interface Class {
  id: ID
  name: string
  courseId: ID
  teacherId: ID
  roomId: ID
  schedule: WeeklySlot[]
  startDate: string
  endDate: string
  studentIds: ID[]
  capacity: number
  status: ClassStatus
}

export interface AttendanceRecord {
  id: ID
  /** Referência à pessoa (aluno ou professor). */
  personId: ID
  personRole: 'aluno' | 'professor'
  classId?: ID
  date: string // ISO date 'yyyy-MM-dd'
  checkInAt?: string // ISO datetime
  checkOutAt?: string // ISO datetime
  method: AttendanceMethod
  status: AttendanceStatus
}

export interface Payment {
  id: ID
  kind: PaymentKind
  /** aluno (mensalidade) ou professor (aluguel); vazio para despesas gerais. */
  personId?: ID
  description: string
  amount: number
  dueDate: string // 'yyyy-MM-dd'
  paidAt?: string // ISO datetime
  status: PaymentStatus
  method?: 'pix' | 'cartao' | 'boleto' | 'dinheiro'
  /** mês de referência 'yyyy-MM' */
  referenceMonth: string
  /** categoria contábil (para despesas). */
  category?: string
}

export interface RoomBooking {
  id: ID
  roomId: ID
  title: string
  type: BookingType
  status: BookingStatus
  date: string // 'yyyy-MM-dd'
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  /** Se for aluguel/palestra externa. */
  renterName?: string
  /** Se vinculado a uma turma/professor. */
  classId?: ID
  teacherId?: ID
  /** Valor cobrado pelo uso (aluguel). */
  price?: number
}

export interface User {
  id: ID
  name: string
  email: string
  role: Role
  avatarUrl?: string
  /** Vincula o usuário à entidade (teacherId ou studentId). */
  linkedId?: ID
  /** true enquanto o usuário ainda não trocou a senha temporária. */
  mustChangePassword?: boolean
}

export interface Message {
  id: ID
  /** 'geral', o id da turma, ou 'dm:{studentId}' */
  channelId: string
  authorId: string
  authorName: string
  authorRole: Role
  content: string
  /** Caminho da imagem no Storage; a URL de exibição é assinada na hora. */
  imagePath?: string
  at: string // ISO datetime
}

export type InvoiceStatus = 'emitida' | 'cancelada'

export interface Invoice {
  id: ID
  number: string
  customer: string
  description: string
  amount: number
  date: string // 'yyyy-MM-dd'
  status: InvoiceStatus
}

// ————————————————————————————————————————————————————————————
// Agregados / views
// ————————————————————————————————————————————————————————————

export interface DashboardKpis {
  activeStudents: number
  studentsTrend: number
  presenceTodayRate: number
  overdueAmount: number
  overdueCount: number
  monthlyRevenue: number
  revenueTrend: number
  monthlyExpense: number
  netResult: number
  roomOccupancyRate: number
  activeClasses: number
  activeTeachers: number
}

export interface RevenueSeriesPoint {
  month: string // 'MMM'
  receita: number
  despesa: number
}

export interface CashFlowPoint {
  month: string // 'Jan'
  ym: string // 'yyyy-MM'
  entradas: number
  saidas: number
  /** saldo acumulado ao fim do mês */
  saldo: number
  realizado: boolean
}

export interface AttendanceSeriesPoint {
  day: string // 'dd/MM'
  presenca: number
  falta: number
}

export interface Alert {
  id: ID
  kind: 'inadimplencia' | 'falta' | 'aluguel' | 'sala' | 'sistema'
  severity: 'info' | 'warning' | 'danger'
  title: string
  description: string
  at: string
}

