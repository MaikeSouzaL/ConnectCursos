/**
 * Gerador de dados mock determinístico (pt-BR).
 * Nomes/valores são estáveis (RNG semeado); datas são ancoradas em "hoje"
 * para que "presença de hoje", "mês corrente" e agenda da semana façam sentido.
 */
import type {
  AttendanceRecord,
  Class,
  Course,
  Credential,
  Database,
  Invoice,
  Payment,
  Room,
  RoomBooking,
  Student,
  Teacher,
  User,
  WeeklySlot,
} from './types'

// —— RNG determinístico (mulberry32) ——
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20260709)
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const chance = (p: number) => rand() < p
const pad = (n: number) => String(n).padStart(2, '0')

// —— Helpers de data ——
const TODAY = new Date()
const iso = (d: Date) => d.toISOString()
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}
function atTime(d: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const x = new Date(d)
  x.setHours(h, m, int(0, 55), 0)
  return x
}

// —— Bancos de nomes ——
const FIRST = [
  'Ana', 'João', 'Maria', 'Pedro', 'Lucas', 'Julia', 'Gabriel', 'Beatriz', 'Rafael', 'Larissa',
  'Mateus', 'Camila', 'Bruno', 'Fernanda', 'Thiago', 'Amanda', 'Felipe', 'Carolina', 'Gustavo',
  'Isabela', 'Rodrigo', 'Letícia', 'Vinícius', 'Mariana', 'Daniel', 'Patrícia', 'Leonardo',
  'Sofia', 'André', 'Vitória', 'Marcelo', 'Helena', 'Diego', 'Bianca', 'Ricardo', 'Yasmin',
]
const LAST = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Almeida', 'Ferreira',
  'Rodrigues', 'Gomes', 'Martins', 'Araújo', 'Melo', 'Barbosa', 'Ribeiro', 'Carvalho', 'Rocha',
  'Dias', 'Nascimento', 'Cardoso', 'Teixeira', 'Moreira', 'Correia', 'Mendes',
]
const fullName = () => `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`
const emailFrom = (name: string, domain = 'email.com') =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '') +
  '@' +
  domain
const phone = () => `(11) 9${int(1000, 9999)}-${int(1000, 9999)}`
const cpf = () => `${int(100, 999)}.${int(100, 999)}.${int(100, 999)}-${int(10, 99)}`

// —— Salas ——
const ROOM_DEFS = [
  { name: 'Sala Aurora', cap: 24, res: ['Projetor', 'Ar-condicionado', 'Quadro branco'] },
  { name: 'Sala Nébula', cap: 18, res: ['TV 55"', 'Ar-condicionado'] },
  { name: 'Lab. Órbita', cap: 20, res: ['20 computadores', 'Projetor', 'Ar-condicionado'] },
  { name: 'Sala Cometa', cap: 30, res: ['Projetor', 'Som', 'Palco'] },
  { name: 'Sala Vega', cap: 12, res: ['TV 50"', 'Mesa redonda'] },
  { name: 'Auditório Galáxia', cap: 60, res: ['Palco', 'Som profissional', 'Projetor 4K'] },
]
const rooms: Room[] = ROOM_DEFS.map((r, i) => ({
  id: `room_${pad(i + 1)}`,
  name: r.name,
  capacity: r.cap,
  resources: r.res,
  color: `var(--chart-${(i % 5) + 1})`,
  hourlyRate: [60, 45, 90, 120, 40, 180][i],
}))

// —— Professores ——
const SPECIALTIES = [
  'Desenvolvimento Web', 'Ciência de Dados', 'Design Gráfico', 'Marketing Digital',
  'Inglês', 'Espanhol', 'Gestão & Finanças', 'Maquiagem Profissional',
]
const teachers: Teacher[] = SPECIALTIES.map((sp, i) => {
  const name = fullName()
  const rent = pick([800, 950, 1100, 1250, 700])
  return {
    id: `tea_${pad(i + 1)}`,
    name,
    email: emailFrom(name, 'conectcursos.com'),
    phone: phone(),
    specialty: sp,
    status: chance(0.9) ? 'ativo' : 'inativo',
    hiredAt: iso(addDays(TODAY, -int(120, 900))),
    monthlyRent: rent,
    rentStatus: chance(0.7) ? 'pago' : chance(0.5) ? 'pendente' : 'atrasado',
  }
})

// —— Cursos ——
const COURSE_DEFS: Array<{ name: string; cat: string; spec: string; price: number; dur: number; hrs: number }> = [
  { name: 'Desenvolvimento Web Full-Stack', cat: 'Tecnologia', spec: 'Desenvolvimento Web', price: 390, dur: 12, hrs: 240 },
  { name: 'Python para Análise de Dados', cat: 'Tecnologia', spec: 'Ciência de Dados', price: 350, dur: 8, hrs: 160 },
  { name: 'Excel Avançado & Power BI', cat: 'Tecnologia', spec: 'Ciência de Dados', price: 220, dur: 4, hrs: 80 },
  { name: 'Design Gráfico Profissional', cat: 'Design', spec: 'Design Gráfico', price: 310, dur: 6, hrs: 120 },
  { name: 'UX/UI Design', cat: 'Design', spec: 'Design Gráfico', price: 340, dur: 6, hrs: 120 },
  { name: 'Marketing Digital & Tráfego Pago', cat: 'Negócios', spec: 'Marketing Digital', price: 280, dur: 5, hrs: 100 },
  { name: 'Inglês — Conversação', cat: 'Idiomas', spec: 'Inglês', price: 260, dur: 12, hrs: 180 },
  { name: 'Espanhol Básico', cat: 'Idiomas', spec: 'Espanhol', price: 240, dur: 10, hrs: 150 },
  { name: 'Gestão Financeira Pessoal', cat: 'Negócios', spec: 'Gestão & Finanças', price: 200, dur: 3, hrs: 60 },
  { name: 'Maquiagem Profissional', cat: 'Beleza', spec: 'Maquiagem Profissional', price: 300, dur: 4, hrs: 90 },
]
const courses: Course[] = COURSE_DEFS.map((c, i) => {
  const teacher = teachers.find((t) => t.specialty === c.spec) ?? teachers[i % teachers.length]
  return {
    id: `cur_${pad(i + 1)}`,
    name: c.name,
    description: `Curso de ${c.name} com aulas práticas e certificado ao final.`,
    category: c.cat,
    teacherId: teacher.id,
    priceMonthly: c.price,
    durationMonths: c.dur,
    workloadHours: c.hrs,
    status: chance(0.9) ? 'ativo' : 'inativo',
    color: `var(--chart-${(i % 5) + 1})`,
    createdAt: iso(addDays(TODAY, -int(60, 700))),
  }
})

// —— Turmas ——
const SLOT_TEMPLATES: WeeklySlot[][] = [
  [{ weekday: 1, start: '19:00', end: '21:00' }, { weekday: 3, start: '19:00', end: '21:00' }],
  [{ weekday: 2, start: '19:00', end: '21:00' }, { weekday: 4, start: '19:00', end: '21:00' }],
  [{ weekday: 1, start: '14:00', end: '16:00' }, { weekday: 3, start: '14:00', end: '16:00' }],
  [{ weekday: 6, start: '09:00', end: '12:00' }],
  [{ weekday: 2, start: '09:00', end: '11:00' }, { weekday: 4, start: '09:00', end: '11:00' }],
  [{ weekday: 5, start: '19:00', end: '22:00' }],
]
const classes: Class[] = []
let classCount = 0
courses.forEach((course, ci) => {
  const nTurmas = ci < 4 ? 2 : 1
  for (let k = 0; k < nTurmas; k++) {
    classCount++
    const room = rooms[classCount % rooms.length]
    const schedule = SLOT_TEMPLATES[(classCount + k) % SLOT_TEMPLATES.length]
    const label = k === 0 ? 'A' : 'B'
    const status = chance(0.8) ? 'em_andamento' : chance(0.5) ? 'planejada' : 'concluida'
    classes.push({
      id: `cls_${pad(classCount)}`,
      name: `${course.name.split(' ').slice(0, 3).join(' ')} — Turma ${label}`,
      courseId: course.id,
      teacherId: course.teacherId,
      roomId: room.id,
      schedule,
      startDate: ymd(addDays(TODAY, -int(20, 120))),
      endDate: ymd(addDays(TODAY, int(60, 260))),
      studentIds: [],
      capacity: Math.min(room.capacity, int(12, 24)),
      status,
    })
  }
})

// —— Alunos ——
const students: Student[] = []
for (let i = 0; i < 48; i++) {
  const name = fullName()
  const enrolledClasses: string[] = []
  const nClasses = chance(0.25) ? 2 : 1
  for (let c = 0; c < nClasses; c++) {
    const cls = pick(classes)
    if (!enrolledClasses.includes(cls.id) && cls.status !== 'concluida') enrolledClasses.push(cls.id)
  }
  const roll = rand()
  const status: Student['status'] =
    roll < 0.68 ? 'ativo' : roll < 0.85 ? 'inadimplente' : roll < 0.94 ? 'trancado' : 'concluido'
  const monthlyFee = enrolledClasses.reduce((sum, id) => {
    const cls = classes.find((c) => c.id === id)
    const course = courses.find((c) => c.id === cls?.courseId)
    return sum + (course?.priceMonthly ?? 0)
  }, 0)
  const student: Student = {
    id: `stu_${pad(i + 1)}`,
    name,
    email: emailFrom(name),
    phone: phone(),
    cpf: cpf(),
    birthDate: ymd(addDays(TODAY, -int(6200, 16000))),
    status,
    enrolledAt: iso(addDays(TODAY, -int(10, 400))),
    classIds: enrolledClasses,
    monthlyFee: monthlyFee || 260,
  }
  students.push(student)
  enrolledClasses.forEach((id) => {
    const cls = classes.find((c) => c.id === id)
    if (cls && cls.studentIds.length < cls.capacity) cls.studentIds.push(student.id)
  })
}

// —— Presença (últimos ~12 dias úteis) ——
const attendance: AttendanceRecord[] = []
let attId = 0
for (let dayOffset = 0; dayOffset <= 16; dayOffset++) {
  const date = addDays(TODAY, -dayOffset)
  const weekday = date.getDay()
  classes.forEach((cls) => {
    if (cls.status !== 'em_andamento') return
    const slot = cls.schedule.find((s) => s.weekday === weekday)
    if (!slot) return
    // professor
    const teaPresent = chance(0.94)
    attendance.push({
      id: `att_${pad(++attId)}`,
      personId: cls.teacherId,
      personRole: 'professor',
      classId: cls.id,
      date: ymd(date),
      checkInAt: teaPresent ? iso(atTime(date, slot.start)) : undefined,
      checkOutAt: teaPresent ? iso(atTime(date, slot.end)) : undefined,
      method: 'qr',
      status: teaPresent ? 'presente' : 'falta',
    })
    // alunos
    cls.studentIds.forEach((sid) => {
      const roll = rand()
      const st: AttendanceRecord['status'] =
        roll < 0.8 ? 'presente' : roll < 0.9 ? 'atrasado' : roll < 0.96 ? 'falta' : 'justificado'
      const present = st === 'presente' || st === 'atrasado'
      attendance.push({
        id: `att_${pad(++attId)}`,
        personId: sid,
        personRole: 'aluno',
        classId: cls.id,
        date: ymd(date),
        checkInAt: present ? iso(atTime(date, st === 'atrasado' ? slot.start : slot.start)) : undefined,
        checkOutAt: present && dayOffset > 0 ? iso(atTime(date, slot.end)) : undefined,
        method: 'qr',
        status: st,
      })
    })
  })
}

// —— Pagamentos ——
const payments: Payment[] = []
let payId = 0
const thisMonth = ym(TODAY)
const prevMonth = ym(addDays(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), -1))
const dueThis = `${thisMonth}-10`
const duePrev = `${prevMonth}-10`

students.forEach((s) => {
  // mês anterior — quase todos pagos
  payments.push({
    id: `pay_${pad(++payId)}`,
    kind: 'mensalidade',
    personId: s.id,
    description: `Mensalidade ${prevMonth} — ${s.name}`,
    amount: s.monthlyFee,
    dueDate: duePrev,
    paidAt: chance(0.95) ? iso(addDays(TODAY, -int(28, 40))) : undefined,
    status: chance(0.95) ? 'pago' : 'atrasado',
    method: pick(['pix', 'cartao', 'boleto']),
    referenceMonth: prevMonth,
  })
  // mês corrente — depende do status
  const paid = s.status !== 'inadimplente' && chance(0.7)
  payments.push({
    id: `pay_${pad(++payId)}`,
    kind: 'mensalidade',
    personId: s.id,
    description: `Mensalidade ${thisMonth} — ${s.name}`,
    amount: s.monthlyFee,
    dueDate: dueThis,
    paidAt: paid ? iso(addDays(TODAY, -int(0, 8))) : undefined,
    status: paid ? 'pago' : s.status === 'inadimplente' ? 'atrasado' : 'pendente',
    method: paid ? pick(['pix', 'cartao', 'boleto']) : undefined,
    referenceMonth: thisMonth,
  })
})

// aluguel dos professores (receita da instituição)
teachers.forEach((t) => {
  payments.push({
    id: `pay_${pad(++payId)}`,
    kind: 'aluguel',
    personId: t.id,
    description: `Aluguel de sala ${thisMonth} — ${t.name}`,
    amount: t.monthlyRent,
    dueDate: `${thisMonth}-05`,
    paidAt: t.rentStatus === 'pago' ? iso(addDays(TODAY, -int(1, 9))) : undefined,
    status: t.rentStatus,
    method: t.rentStatus === 'pago' ? 'pix' : undefined,
    referenceMonth: thisMonth,
  })
})

// despesas fixas
const EXPENSES = [
  { d: 'Aluguel do imóvel', a: 6800, c: 'Aluguel' },
  { d: 'Energia elétrica', a: 1450, c: 'Utilidades' },
  { d: 'Internet & telefonia', a: 380, c: 'Utilidades' },
  { d: 'Limpeza e conservação', a: 900, c: 'Serviços' },
  { d: 'Marketing e anúncios', a: 1200, c: 'Marketing' },
  { d: 'Material de escritório', a: 320, c: 'Material' },
  { d: 'Folha — recepção', a: 2100, c: 'Folha' },
]
EXPENSES.forEach((e) => {
  payments.push({
    id: `pay_${pad(++payId)}`,
    kind: 'despesa',
    description: e.d,
    amount: e.a,
    dueDate: `${thisMonth}-05`,
    paidAt: chance(0.8) ? iso(addDays(TODAY, -int(1, 10))) : undefined,
    status: chance(0.8) ? 'pago' : 'pendente',
    method: 'boleto',
    referenceMonth: thisMonth,
    category: e.c,
  })
})

// —— Agendamentos da semana (salas) ——
const bookings: RoomBooking[] = []
let bkId = 0
const startOfWeek = addDays(TODAY, -TODAY.getDay()) // domingo
for (let d = 0; d < 7; d++) {
  const date = addDays(startOfWeek, d)
  const weekday = date.getDay()
  classes.forEach((cls) => {
    if (cls.status === 'concluida') return
    const slot = cls.schedule.find((s) => s.weekday === weekday)
    if (!slot) return
    const course = courses.find((c) => c.id === cls.courseId)
    bookings.push({
      id: `bkg_${pad(++bkId)}`,
      roomId: cls.roomId,
      title: cls.name,
      type: 'turma',
      status: 'confirmado',
      date: ymd(date),
      start: slot.start,
      end: slot.end,
      classId: cls.id,
      teacherId: cls.teacherId,
      price: 0,
      renterName: course?.name,
    })
  })
}
// alguns aluguéis avulsos / palestras em horários livres
const EXTRA_BOOKINGS = [
  { title: 'Palestra: Empreendedorismo', type: 'palestra' as const, renter: 'Coletivo Startup SP', wd: 6, start: '14:00', end: '17:00', room: 'room_06', price: 540 },
  { title: 'Aluguel — Workshop de Fotografia', type: 'aluguel' as const, renter: 'Studio Foco', wd: 5, start: '14:00', end: '18:00', room: 'room_04', price: 480 },
  { title: 'Reunião de Condomínio', type: 'evento' as const, renter: 'Associação de Moradores', wd: 0, start: '10:00', end: '12:00', room: 'room_06', price: 360 },
  { title: 'Aluguel — Curso de Barbearia', type: 'aluguel' as const, renter: 'Barber Pro', wd: 3, start: '09:00', end: '12:00', room: 'room_02', price: 270 },
]
EXTRA_BOOKINGS.forEach((e) => {
  const date = addDays(startOfWeek, e.wd)
  bookings.push({
    id: `bkg_${pad(++bkId)}`,
    roomId: e.room,
    title: e.title,
    type: e.type,
    status: chance(0.8) ? 'confirmado' : 'pendente',
    date: ymd(date),
    start: e.start,
    end: e.end,
    renterName: e.renter,
    price: e.price,
  })
})

// —— Usuários (auth demo) ——
const activeTeacher = teachers.find((t) => t.status === 'ativo') ?? teachers[0]
const activeStudent = students.find((s) => s.status === 'ativo' && s.classIds.length > 0) ?? students[0]
const users: User[] = [
  { id: 'usr_admin', name: 'Marina Diretora', email: 'admin@conectcursos.com', role: 'admin' },
  {
    id: 'usr_prof',
    name: activeTeacher.name,
    email: activeTeacher.email,
    role: 'professor',
    linkedId: activeTeacher.id,
  },
  {
    id: 'usr_aluno',
    name: activeStudent.name,
    email: activeStudent.email,
    role: 'aluno',
    linkedId: activeStudent.id,
  },
]

// —— Credenciais (login) ——
// Semente já "onboardada" (senha padrão, sem troca forçada). Cadastros novos
// feitos pelo admin recebem senha temporária com troca obrigatória.
const credentials: Credential[] = [
  { email: 'admin@conectcursos.com', password: 'admin123', mustChangePassword: false },
  ...teachers.map((t) => ({ email: t.email, password: 'conect123', mustChangePassword: false })),
  ...students.map((s) => ({ email: s.email, password: 'conect123', mustChangePassword: false })),
]

// —— Notas fiscais (registro; a emissão real exige integração com a SEFAZ) ——
const invoices: Invoice[] = students.slice(0, 8).map((s, i) => ({
  id: `nf_${pad(i + 1)}`,
  number: String(1200 + i).padStart(6, '0'),
  customer: s.name,
  description: `Serviços educacionais — ${ym(addDays(TODAY, -int(0, 20)))}`,
  amount: s.monthlyFee,
  date: ymd(addDays(TODAY, -int(0, 25))),
  status: chance(0.9) ? 'emitida' : 'cancelada',
}))

export function createDatabase(): Database {
  return {
    users,
    teachers,
    students,
    courses,
    classes,
    rooms,
    bookings,
    attendance,
    payments,
    credentials,
    invoices,
  }
}
