/**
 * Camada de serviços. Alunos, professores, cursos, turmas e salas já leem/gravam
 * no Supabase (mesmas assinaturas de antes — a UI não muda). Presença, financeiro,
 * dashboard, chat e notas fiscais ainda usam o mock local até seus blocos (B5/B6).
 */
import { supabase } from '@/lib/supabase'
import type { Database } from './database.types'
import type {
  AttendanceRecord,
  AttendanceSeriesPoint,
  Alert,
  CashFlowPoint,
  Class,
  Course,
  DashboardKpis,
  Invoice,
  Message,
  Payment,
  Role,
  RevenueSeriesPoint,
  Room,
  RoomBooking,
  Student,
  Teacher,
  WeeklySlot,
} from './types'

type Tables = Database['public']['Tables']

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const TODAY = new Date()
const THIS_MONTH = ym(TODAY)
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const num = (v: number | string | null | undefined) => (v == null ? 0 : Number(v))

// ————————————————————————————————————— Mapeadores (linha do banco → domínio)
function mapStudent(r: Tables['students']['Row'], classIds: string[] = []): Student {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    avatarUrl: r.avatar_url ?? undefined,
    cpf: r.cpf,
    birthDate: r.birth_date ?? '',
    status: r.status,
    enrolledAt: r.enrolled_at,
    classIds,
    monthlyFee: num(r.monthly_fee),
  }
}
function mapTeacher(r: Tables['teachers']['Row']): Teacher {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    avatarUrl: r.avatar_url ?? undefined,
    specialty: r.specialty,
    status: r.status,
    hiredAt: r.hired_at,
    monthlyRent: num(r.monthly_rent),
    rentStatus: r.rent_status,
  }
}
function mapCourse(r: Tables['courses']['Row']): Course {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    teacherId: r.teacher_id ?? '',
    priceMonthly: num(r.price_monthly),
    durationMonths: r.duration_months,
    workloadHours: r.workload_hours,
    status: r.status,
    color: r.color,
    createdAt: r.created_at,
  }
}
function mapRoom(r: Tables['rooms']['Row']): Room {
  return {
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    resources: r.resources ?? [],
    color: r.color,
    hourlyRate: num(r.hourly_rate),
  }
}
function mapClass(r: Tables['classes']['Row'], studentIds: string[] = []): Class {
  return {
    id: r.id,
    name: r.name,
    courseId: r.course_id ?? '',
    teacherId: r.teacher_id ?? '',
    roomId: r.room_id ?? '',
    schedule: (r.schedule as unknown as WeeklySlot[]) ?? [],
    startDate: r.start_date ?? '',
    endDate: r.end_date ?? '',
    studentIds,
    capacity: r.capacity,
    status: r.status,
  }
}
function mapBooking(r: Tables['room_bookings']['Row']): RoomBooking {
  return {
    id: r.id,
    roomId: r.room_id,
    title: r.title,
    type: r.type,
    status: r.status,
    date: r.date,
    start: r.start_time,
    end: r.end_time,
    renterName: r.renter_name ?? undefined,
    classId: r.class_id ?? undefined,
    teacherId: r.teacher_id ?? undefined,
    price: r.price ?? undefined,
  }
}

// ————————————————————————————————————— Cache de lookups (nomes exibidos nas telas)
// Alimentado após o login (preloadLookups) e a cada list(). Os helpers síncronos
// leem do cache; se não achar, caem no mock (transição enquanto B5/B6 não migram).
const roomsCache = new Map<string, Room>()
const coursesCache = new Map<string, Course>()
const teachersCache = new Map<string, Teacher>()
const studentsCache = new Map<string, Student>()
const classesCache = new Map<string, Class>()

export async function preloadLookups(): Promise<void> {
  const [rooms, courses, teachers, students, classes] = await Promise.all([
    supabase.from('rooms').select('*'),
    supabase.from('courses').select('*'),
    supabase.from('teachers').select('*'),
    supabase.from('students').select('*'),
    supabase.from('classes').select('*'),
  ])
  roomsCache.clear()
  rooms.data?.forEach((r) => roomsCache.set(r.id, mapRoom(r)))
  coursesCache.clear()
  courses.data?.forEach((r) => coursesCache.set(r.id, mapCourse(r)))
  teachersCache.clear()
  teachers.data?.forEach((r) => teachersCache.set(r.id, mapTeacher(r)))
  studentsCache.clear()
  students.data?.forEach((r) => studentsCache.set(r.id, mapStudent(r)))
  classesCache.clear()
  classes.data?.forEach((r) => classesCache.set(r.id, mapClass(r)))
}

export function courseName(id: string) {
  return coursesCache.get(id)?.name ?? '—'
}
export function teacherName(id: string) {
  return teachersCache.get(id)?.name ?? '—'
}
export function roomName(id: string) {
  return roomsCache.get(id)?.name ?? '—'
}
export function studentName(id: string) {
  return studentsCache.get(id)?.name ?? '—'
}
export function className(id: string) {
  return classesCache.get(id)?.name ?? '—'
}

/** Mensagem de erro do corpo de uma Edge Function. */
async function fnError(error: unknown, fallback: string): Promise<string> {
  try {
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json()
      if (body?.error) return String(body.error)
    }
  } catch {
    /* ignora */
  }
  return (error as Error)?.message ?? fallback
}

/**
 * Vencimento da próxima mensalidade: dia 10. Se o dia 10 deste mês já passou,
 * joga para o mês seguinte (evita nascer atrasada).
 */
function nextDueDate(): { dueDate: string; referenceMonth: string } {
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth()
  if (now.getDate() > 10) {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  const ymStr = `${year}-${pad(month + 1)}`
  return { dueDate: `${ymStr}-10`, referenceMonth: ymStr }
}

/**
 * Sincroniza o login (Auth) quando o admin corrige o e-mail/nome de um professor
 * ou aluno — o e-mail é a credencial de acesso. Não faz nada se a pessoa ainda
 * não tem login ou se nada relevante mudou. Lança se a sincronização falhar.
 */
async function syncLogin(
  table: 'students' | 'teachers',
  id: string,
  email?: string,
  name?: string,
): Promise<void> {
  if (email === undefined && name === undefined) return
  const { data: current } = await supabase
    .from(table)
    .select('user_id, email, name')
    .eq('id', id)
    .maybeSingle()
  if (!current?.user_id) return

  const nextEmail = email !== undefined && email !== current.email ? email : undefined
  const nextName = name !== undefined && name !== current.name ? name : undefined
  if (!nextEmail && !nextName) return

  const { error } = await supabase.functions.invoke('admin-update-user', {
    body: { user_id: current.user_id, email: nextEmail, name: nextName },
  })
  if (error) throw new Error(await fnError(error, 'Falha ao atualizar o acesso'))
}

/** classId → studentIds a partir da tabela de matrículas. */
async function enrollmentsByStudent(): Promise<Map<string, string[]>> {
  const { data } = await supabase.from('class_students').select('class_id, student_id')
  const map = new Map<string, string[]>()
  data?.forEach((l) => {
    const arr = map.get(l.student_id) ?? []
    arr.push(l.class_id)
    map.set(l.student_id, arr)
  })
  return map
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
    const [{ data }, enroll] = await Promise.all([
      supabase.from('students').select('*').order('name'),
      enrollmentsByStudent(),
    ])
    let out = (data ?? []).map((r) => mapStudent(r, enroll.get(r.id) ?? []))
    out.forEach((s) => studentsCache.set(s.id, s))
    if (filters.status && filters.status !== 'todos') out = out.filter((s) => s.status === filters.status)
    if (filters.classId) out = out.filter((s) => s.classIds.includes(filters.classId!))
    if (filters.search) {
      const q = filters.search.toLowerCase()
      out = out.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    }
    return out
  },
  async get(id: string): Promise<Student | undefined> {
    const { data } = await supabase.from('students').select('*').eq('id', id).maybeSingle()
    if (!data) return undefined
    const { data: links } = await supabase.from('class_students').select('class_id').eq('student_id', id)
    return mapStudent(data, (links ?? []).map((l) => l.class_id))
  },
  async details(id: string): Promise<StudentDetails | undefined> {
    const { data: srow } = await supabase.from('students').select('*').eq('id', id).maybeSingle()
    if (!srow) return undefined
    const [{ data: links }, { data: payments }, { data: attendance }] = await Promise.all([
      supabase.from('class_students').select('class_id').eq('student_id', id),
      supabase.from('payments').select('*').eq('person_id', id),
      supabase.from('attendance').select('*').eq('person_id', id),
    ])
    const classIds = (links ?? []).map((l) => l.class_id)
    const { data: classRows } = classIds.length
      ? await supabase.from('classes').select('*').in('id', classIds)
      : { data: [] as Tables['classes']['Row'][] }
    const classes = (classRows ?? []).map((c) => ({
      ...mapClass(c),
      courseName: courseName(c.course_id ?? ''),
      teacherName: teacherName(c.teacher_id ?? ''),
      roomName: roomName(c.room_id ?? ''),
    }))
    const att = (attendance ?? []).map(mapAttendance)
    const present = att.filter((a) => a.status === 'presente' || a.status === 'atrasado').length
    const presenceRate = att.length ? Math.round((present / att.length) * 100) : 0
    const student = mapStudent(srow, classIds)
    studentsCache.set(student.id, student)
    return { student, classes, payments: (payments ?? []).map(mapPayment), attendance: att, presenceRate }
  },
  async create(
    data: Omit<Student, 'id' | 'enrolledAt'>,
  ): Promise<{ student: Student; tempPassword: string }> {
    const { data: row, error } = await supabase
      .from('students')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar_url: data.avatarUrl ?? null,
        cpf: data.cpf,
        birth_date: data.birthDate || null,
        status: data.status,
        monthly_fee: data.monthlyFee,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Falha ao cadastrar aluno')

    if (data.classIds.length) {
      await supabase
        .from('class_students')
        .insert(data.classIds.map((cid) => ({ class_id: cid, student_id: row.id })))
    }

    const { data: fn, error: fnErr } = await supabase.functions.invoke('admin-create-user', {
      body: { email: data.email, name: data.name, role: 'aluno', linked_id: row.id },
    })
    if (fnErr) {
      await supabase.from('students').delete().eq('id', row.id)
      throw new Error(await fnError(fnErr, 'Falha ao criar o acesso do aluno'))
    }

    // Já deixa a 1ª mensalidade lançada (pendente), para o aluno e o financeiro
    // enxergarem a cobrança desde o cadastro.
    if (data.monthlyFee > 0) {
      const { dueDate, referenceMonth } = nextDueDate()
      await supabase.from('payments').insert({
        kind: 'mensalidade',
        person_id: row.id,
        description: `Mensalidade ${referenceMonth} — ${data.name}`,
        amount: data.monthlyFee,
        due_date: dueDate,
        status: 'pendente',
        reference_month: referenceMonth,
      })
    }

    const student = mapStudent(row, data.classIds)
    studentsCache.set(student.id, student)
    return { student, tempPassword: (fn as { tempPassword: string }).tempPassword }
  },
  async update(id: string, patch: Partial<Student>): Promise<Student | undefined> {
    // O e-mail é o login: sincroniza o Auth ANTES de gravar, para não desencontrar
    // o cadastro do acesso caso a sincronização falhe.
    await syncLogin('students', id, patch.email, patch.name)

    const upd: Tables['students']['Update'] = {}
    if (patch.name !== undefined) upd.name = patch.name
    if (patch.email !== undefined) upd.email = patch.email
    if (patch.phone !== undefined) upd.phone = patch.phone
    if (patch.cpf !== undefined) upd.cpf = patch.cpf
    if (patch.birthDate !== undefined) upd.birth_date = patch.birthDate || null
    if (patch.status !== undefined) upd.status = patch.status
    if (patch.monthlyFee !== undefined) upd.monthly_fee = patch.monthlyFee
    if (patch.avatarUrl !== undefined) upd.avatar_url = patch.avatarUrl
    const { data: row } = await supabase.from('students').update(upd).eq('id', id).select().single()

    if (patch.classIds) {
      await supabase.from('class_students').delete().eq('student_id', id)
      if (patch.classIds.length) {
        await supabase
          .from('class_students')
          .insert(patch.classIds.map((cid) => ({ class_id: cid, student_id: id })))
      }
    }
    if (!row) return undefined
    const { data: links } = await supabase.from('class_students').select('class_id').eq('student_id', id)
    const student = mapStudent(row, (links ?? []).map((l) => l.class_id))
    studentsCache.set(student.id, student)
    return student
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
    const { data } = await supabase.from('teachers').select('*').order('name')
    let out = (data ?? []).map(mapTeacher)
    out.forEach((t) => teachersCache.set(t.id, t))
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((t) => t.name.toLowerCase().includes(q) || t.specialty.toLowerCase().includes(q))
    }
    return out
  },
  async get(id: string): Promise<Teacher | undefined> {
    const { data } = await supabase.from('teachers').select('*').eq('id', id).maybeSingle()
    return data ? mapTeacher(data) : undefined
  },
  async details(id: string): Promise<TeacherDetails | undefined> {
    const { data: trow } = await supabase.from('teachers').select('*').eq('id', id).maybeSingle()
    if (!trow) return undefined
    const [{ data: courses }, { data: classes }, { data: rentPayments }] = await Promise.all([
      supabase.from('courses').select('*').eq('teacher_id', id),
      supabase.from('classes').select('*').eq('teacher_id', id),
      supabase.from('payments').select('*').eq('kind', 'aluguel').eq('person_id', id),
    ])
    const classIds = (classes ?? []).map((c) => c.id)
    let studentsCount = 0
    if (classIds.length) {
      const { data: links } = await supabase
        .from('class_students')
        .select('student_id')
        .in('class_id', classIds)
      studentsCount = new Set((links ?? []).map((l) => l.student_id)).size
    }
    return {
      teacher: mapTeacher(trow),
      courses: (courses ?? []).map(mapCourse),
      classes: (classes ?? []).map((c) => mapClass(c)),
      studentsCount,
      rentPayments: (rentPayments ?? []).map(mapPayment),
    }
  },
  async create(
    data: Omit<Teacher, 'id' | 'hiredAt'>,
  ): Promise<{ teacher: Teacher; tempPassword: string }> {
    const { data: row, error } = await supabase
      .from('teachers')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar_url: data.avatarUrl ?? null,
        specialty: data.specialty,
        status: data.status,
        monthly_rent: data.monthlyRent,
        rent_status: data.rentStatus,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Falha ao cadastrar professor')

    const { data: fn, error: fnErr } = await supabase.functions.invoke('admin-create-user', {
      body: { email: data.email, name: data.name, role: 'professor', linked_id: row.id },
    })
    if (fnErr) {
      await supabase.from('teachers').delete().eq('id', row.id)
      throw new Error(await fnError(fnErr, 'Falha ao criar o acesso do professor'))
    }
    const teacher = mapTeacher(row)
    teachersCache.set(teacher.id, teacher)
    return { teacher, tempPassword: (fn as { tempPassword: string }).tempPassword }
  },
  async update(id: string, patch: Partial<Teacher>): Promise<Teacher | undefined> {
    await syncLogin('teachers', id, patch.email, patch.name)

    const upd: Tables['teachers']['Update'] = {}
    if (patch.name !== undefined) upd.name = patch.name
    if (patch.email !== undefined) upd.email = patch.email
    if (patch.phone !== undefined) upd.phone = patch.phone
    if (patch.specialty !== undefined) upd.specialty = patch.specialty
    if (patch.status !== undefined) upd.status = patch.status
    if (patch.monthlyRent !== undefined) upd.monthly_rent = patch.monthlyRent
    if (patch.rentStatus !== undefined) upd.rent_status = patch.rentStatus
    if (patch.avatarUrl !== undefined) upd.avatar_url = patch.avatarUrl
    const { data: row } = await supabase.from('teachers').update(upd).eq('id', id).select().single()
    if (!row) return undefined
    const teacher = mapTeacher(row)
    teachersCache.set(teacher.id, teacher)
    return teacher
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
    const [{ data: courses }, { data: classes }, { data: links }] = await Promise.all([
      supabase.from('courses').select('*').order('name'),
      supabase.from('classes').select('id, course_id'),
      supabase.from('class_students').select('class_id, student_id'),
    ])
    ;(courses ?? []).forEach((r) => coursesCache.set(r.id, mapCourse(r)))
    const classesByCourse = new Map<string, string[]>()
    ;(classes ?? []).forEach((c) => {
      if (!c.course_id) return
      const arr = classesByCourse.get(c.course_id) ?? []
      arr.push(c.id)
      classesByCourse.set(c.course_id, arr)
    })
    const studentsByClass = new Map<string, Set<string>>()
    ;(links ?? []).forEach((l) => {
      const set = studentsByClass.get(l.class_id) ?? new Set<string>()
      set.add(l.student_id)
      studentsByClass.set(l.class_id, set)
    })
    let out: CourseWithStats[] = (courses ?? []).map((r) => {
      const clsIds = classesByCourse.get(r.id) ?? []
      const studs = new Set<string>()
      clsIds.forEach((cid) => studentsByClass.get(cid)?.forEach((s) => studs.add(s)))
      return {
        ...mapCourse(r),
        teacherName: teacherName(r.teacher_id ?? ''),
        classesCount: clsIds.length,
        studentsCount: studs.size,
      }
    })
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
    }
    return out
  },
  async get(id: string): Promise<Course | undefined> {
    const { data } = await supabase.from('courses').select('*').eq('id', id).maybeSingle()
    return data ? mapCourse(data) : undefined
  },
  async create(data: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
    const { data: row, error } = await supabase
      .from('courses')
      .insert({
        name: data.name,
        description: data.description,
        category: data.category,
        teacher_id: data.teacherId || null,
        price_monthly: data.priceMonthly,
        duration_months: data.durationMonths,
        workload_hours: data.workloadHours,
        status: data.status,
        color: data.color,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Falha ao criar curso')
    const course = mapCourse(row)
    coursesCache.set(course.id, course)
    return course
  },
  async update(id: string, patch: Partial<Course>): Promise<Course | undefined> {
    const upd: Tables['courses']['Update'] = {}
    if (patch.name !== undefined) upd.name = patch.name
    if (patch.description !== undefined) upd.description = patch.description
    if (patch.category !== undefined) upd.category = patch.category
    if (patch.teacherId !== undefined) upd.teacher_id = patch.teacherId || null
    if (patch.priceMonthly !== undefined) upd.price_monthly = patch.priceMonthly
    if (patch.durationMonths !== undefined) upd.duration_months = patch.durationMonths
    if (patch.workloadHours !== undefined) upd.workload_hours = patch.workloadHours
    if (patch.status !== undefined) upd.status = patch.status
    if (patch.color !== undefined) upd.color = patch.color
    const { data: row } = await supabase.from('courses').update(upd).eq('id', id).select().single()
    if (!row) return undefined
    const course = mapCourse(row)
    coursesCache.set(course.id, course)
    return course
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
async function enrollmentsByClass(classIds?: string[]): Promise<Map<string, string[]>> {
  let q = supabase.from('class_students').select('class_id, student_id')
  if (classIds && classIds.length) q = q.in('class_id', classIds)
  const { data } = await q
  const map = new Map<string, string[]>()
  data?.forEach((l) => {
    const arr = map.get(l.class_id) ?? []
    arr.push(l.student_id)
    map.set(l.class_id, arr)
  })
  return map
}
function withClassStats(c: Class): ClassWithStats {
  return {
    ...c,
    courseName: courseName(c.courseId),
    teacherName: teacherName(c.teacherId),
    roomName: roomName(c.roomId),
    enrolled: c.studentIds.length,
    occupancy: c.capacity ? Math.round((c.studentIds.length / c.capacity) * 100) : 0,
  }
}
export const classesService = {
  async list(search?: string): Promise<ClassWithStats[]> {
    const [{ data }, byClass] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      enrollmentsByClass(),
    ])
    ;(data ?? []).forEach((r) => classesCache.set(r.id, mapClass(r)))
    let out = (data ?? []).map((r) => withClassStats(mapClass(r, byClass.get(r.id) ?? [])))
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((c) => c.name.toLowerCase().includes(q))
    }
    return out
  },
  async get(id: string): Promise<ClassWithStats | undefined> {
    const { data } = await supabase.from('classes').select('*').eq('id', id).maybeSingle()
    if (!data) return undefined
    const { data: links } = await supabase.from('class_students').select('student_id').eq('class_id', id)
    return withClassStats(mapClass(data, (links ?? []).map((l) => l.student_id)))
  },
  async students(id: string): Promise<Student[]> {
    const { data: links } = await supabase.from('class_students').select('student_id').eq('class_id', id)
    const ids = (links ?? []).map((l) => l.student_id)
    if (!ids.length) return []
    const [{ data }, enroll] = await Promise.all([
      supabase.from('students').select('*').in('id', ids),
      enrollmentsByStudent(),
    ])
    return (data ?? []).map((r) => mapStudent(r, enroll.get(r.id) ?? []))
  },
  async create(data: Omit<Class, 'id'>): Promise<Class> {
    const { data: row, error } = await supabase
      .from('classes')
      .insert({
        name: data.name,
        course_id: data.courseId || null,
        teacher_id: data.teacherId || null,
        room_id: data.roomId || null,
        schedule: data.schedule as unknown as Database['public']['Tables']['classes']['Insert']['schedule'],
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        capacity: data.capacity,
        status: data.status,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Falha ao criar turma')
    if (data.studentIds?.length) {
      await supabase
        .from('class_students')
        .insert(data.studentIds.map((sid) => ({ class_id: row.id, student_id: sid })))
    }
    const klass = mapClass(row, data.studentIds ?? [])
    classesCache.set(klass.id, klass)
    return klass
  },
  async update(id: string, patch: Partial<Class>): Promise<Class | undefined> {
    const upd: Tables['classes']['Update'] = {}
    if (patch.name !== undefined) upd.name = patch.name
    if (patch.courseId !== undefined) upd.course_id = patch.courseId || null
    if (patch.teacherId !== undefined) upd.teacher_id = patch.teacherId || null
    if (patch.roomId !== undefined) upd.room_id = patch.roomId || null
    if (patch.schedule !== undefined)
      upd.schedule = patch.schedule as unknown as Tables['classes']['Update']['schedule']
    if (patch.startDate !== undefined) upd.start_date = patch.startDate || null
    if (patch.endDate !== undefined) upd.end_date = patch.endDate || null
    if (patch.capacity !== undefined) upd.capacity = patch.capacity
    if (patch.status !== undefined) upd.status = patch.status
    const { data: row } = await supabase.from('classes').update(upd).eq('id', id).select().single()
    if (!row) return undefined

    if (patch.studentIds) {
      await supabase.from('class_students').delete().eq('class_id', id)
      if (patch.studentIds.length) {
        await supabase
          .from('class_students')
          .insert(patch.studentIds.map((sid) => ({ class_id: id, student_id: sid })))
      }
    }
    const { data: links } = await supabase.from('class_students').select('student_id').eq('class_id', id)
    const klass = mapClass(row, (links ?? []).map((l) => l.student_id))
    classesCache.set(klass.id, klass)
    return klass
  },
}

// ————————————————————————————————————— Salas & Agendamentos
export const roomsService = {
  async list(): Promise<Room[]> {
    const { data } = await supabase.from('rooms').select('*').order('name')
    const out = (data ?? []).map(mapRoom)
    out.forEach((r) => roomsCache.set(r.id, r))
    return out
  },
  async bookingsForWeek(weekStart: Date): Promise<RoomBooking[]> {
    const start = ymd(weekStart)
    const end = ymd(new Date(weekStart.getTime() + 6 * 864e5))
    const { data } = await supabase
      .from('room_bookings')
      .select('*')
      .gte('date', start)
      .lte('date', end)
    return (data ?? []).map(mapBooking)
  },
  async createBooking(data: Omit<RoomBooking, 'id'>): Promise<RoomBooking> {
    const { data: row, error } = await supabase
      .from('room_bookings')
      .insert({
        room_id: data.roomId,
        title: data.title,
        type: data.type,
        status: data.status,
        date: data.date,
        start_time: data.start,
        end_time: data.end,
        renter_name: data.renterName ?? null,
        class_id: data.classId ?? null,
        teacher_id: data.teacherId ?? null,
        price: data.price ?? null,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Falha ao criar reserva')
    return mapBooking(row)
  },
  async create(data: Omit<Room, 'id'>): Promise<Room> {
    const { data: row, error } = await supabase
      .from('rooms')
      .insert({
        name: data.name,
        capacity: data.capacity,
        resources: data.resources,
        color: data.color,
        hourly_rate: data.hourlyRate,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Falha ao criar sala')
    const room = mapRoom(row)
    roomsCache.set(room.id, room)
    return room
  },
  async update(id: string, patch: Partial<Room>): Promise<Room | undefined> {
    const upd: Tables['rooms']['Update'] = {}
    if (patch.name !== undefined) upd.name = patch.name
    if (patch.capacity !== undefined) upd.capacity = patch.capacity
    if (patch.resources !== undefined) upd.resources = patch.resources
    if (patch.color !== undefined) upd.color = patch.color
    if (patch.hourlyRate !== undefined) upd.hourly_rate = patch.hourlyRate
    const { data: row } = await supabase.from('rooms').update(upd).eq('id', id).select().single()
    if (!row) return undefined
    const room = mapRoom(row)
    roomsCache.set(room.id, room)
    return room
  },
}

// ————————————————————————————————————— Instituição (linha única)
export interface Institution {
  name: string
  cnpj: string
  phone: string
  email: string
  address: string
  logoUrl?: string
}
function mapInstitution(r: Tables['institution']['Row'] | null): Institution {
  return {
    name: r?.name ?? 'Conect Cursos',
    cnpj: r?.cnpj ?? '',
    phone: r?.phone ?? '',
    email: r?.email ?? '',
    address: r?.address ?? '',
    logoUrl: r?.logo_url ?? undefined,
  }
}
export const institutionService = {
  async get(): Promise<Institution> {
    const { data } = await supabase.from('institution').select('*').eq('id', true).maybeSingle()
    return mapInstitution(data)
  },
  async update(patch: Partial<Institution>): Promise<Institution> {
    const upd: Tables['institution']['Update'] = { updated_at: new Date().toISOString() }
    if (patch.name !== undefined) upd.name = patch.name
    if (patch.cnpj !== undefined) upd.cnpj = patch.cnpj
    if (patch.phone !== undefined) upd.phone = patch.phone
    if (patch.email !== undefined) upd.email = patch.email
    if (patch.address !== undefined) upd.address = patch.address
    if (patch.logoUrl !== undefined) upd.logo_url = patch.logoUrl
    const { data, error } = await supabase
      .from('institution')
      .update(upd)
      .eq('id', true)
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Falha ao salvar os dados da instituição')
    return mapInstitution(data)
  },
}

// ————————————————————————————————————— Preferências de notificação (por usuário)
export const preferencesService = {
  async get(userId: string): Promise<Record<string, boolean>> {
    const { data } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .maybeSingle()
    return (data?.notification_prefs as Record<string, boolean> | null) ?? {}
  },
  async update(userId: string, prefs: Record<string, boolean>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: prefs })
      .eq('id', userId)
    if (error) throw new Error(error.message)
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Presença, financeiro, dashboard, chat (com Realtime) e notas fiscais — Supabase.
// ═══════════════════════════════════════════════════════════════════════════

function mapPayment(r: Tables['payments']['Row']): Payment {
  return {
    id: r.id,
    kind: r.kind,
    personId: r.person_id ?? undefined,
    description: r.description,
    amount: num(r.amount),
    dueDate: r.due_date,
    paidAt: r.paid_at ?? undefined,
    status: r.status,
    method: r.method ?? undefined,
    referenceMonth: r.reference_month,
    category: r.category ?? undefined,
  }
}
function mapAttendance(r: Tables['attendance']['Row']): AttendanceRecord {
  return {
    id: r.id,
    personId: r.person_id,
    personRole: r.person_role as 'aluno' | 'professor',
    classId: r.class_id ?? undefined,
    date: r.date,
    checkInAt: r.check_in_at ?? undefined,
    checkOutAt: r.check_out_at ?? undefined,
    method: r.method,
    status: r.status,
  }
}

// ————————————————————————————————————— Presença (Supabase)
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
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .eq('date', date)
    return (data ?? []).map(mapAttendance)
  },
  async byDate(date: string): Promise<AttendanceRecord[]> {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date)
      .eq('person_role', 'aluno')
      .order('check_in_at', { ascending: false })
    return (data ?? []).map(mapAttendance)
  },
  async byPerson(personId: string): Promise<AttendanceRecord[]> {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('person_id', personId)
      .order('date', { ascending: false })
    return (data ?? []).map(mapAttendance)
  },
  async checkIn(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        person_id: record.personId,
        person_role: record.personRole,
        class_id: record.classId ?? null,
        date: record.date,
        check_in_at: record.checkInAt ?? null,
        check_out_at: record.checkOutAt ?? null,
        method: record.method,
        status: record.status,
      })
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Falha ao registrar presença')
    return mapAttendance(data)
  },
  async todayStatus(personId: string, role: 'aluno' | 'professor' = 'aluno'): Promise<TodayStatus> {
    const date = ymd(new Date())
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('person_id', personId)
      .eq('date', date)
      .eq('person_role', role)
      .maybeSingle()
    if (!data || !data.check_in_at) return { state: 'nenhum' }
    if (data.check_in_at && !data.check_out_at)
      return { state: 'dentro', checkInAt: data.check_in_at }
    return { state: 'completo', checkInAt: data.check_in_at, checkOutAt: data.check_out_at ?? undefined }
  },
  /** 1ª leitura do dia = entrada; 2ª = saída; depois = já completo. */
  async registerScan(
    personId: string,
    at: string = new Date().toISOString(),
    role: 'aluno' | 'professor' = 'aluno',
  ): Promise<ScanResult> {
    const when = new Date(at)
    const date = ymd(when)
    const weekday = when.getDay()
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('person_id', personId)
      .eq('date', date)
      .eq('person_role', role)
      .maybeSingle()

    if (!existing) {
      // Descobre a turma do dia (pela grade da semana).
      let classId: string | undefined
      if (role === 'aluno') {
        const { data: links } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', personId)
        const classIds = (links ?? []).map((l) => l.class_id)
        if (classIds.length) {
          const { data: classes } = await supabase
            .from('classes')
            .select('id, schedule')
            .in('id', classIds)
          classId =
            classes?.find((c) =>
              (c.schedule as unknown as WeeklySlot[]).some((s) => s.weekday === weekday),
            )?.id ?? classIds[0]
        }
      } else {
        const { data: classes } = await supabase
          .from('classes')
          .select('id, schedule')
          .eq('teacher_id', personId)
        classId =
          classes?.find((c) =>
            (c.schedule as unknown as WeeklySlot[]).some((s) => s.weekday === weekday),
          )?.id ?? classes?.[0]?.id
      }
      const { data: inserted, error } = await supabase
        .from('attendance')
        .insert({
          person_id: personId,
          person_role: role,
          class_id: classId ?? null,
          date,
          check_in_at: at,
          method: 'qr',
          status: 'presente',
        })
        .select()
        .single()
      if (error || !inserted) throw new Error(error?.message ?? 'Falha ao registrar entrada')
      return { action: 'entrada', at, record: mapAttendance(inserted) }
    }

    if (!existing.check_in_at) {
      const { data: updated } = await supabase
        .from('attendance')
        .update({ check_in_at: at, status: 'presente' })
        .eq('id', existing.id)
        .select()
        .single()
      return { action: 'entrada', at, record: mapAttendance(updated ?? existing) }
    }
    if (!existing.check_out_at) {
      const { data: updated } = await supabase
        .from('attendance')
        .update({ check_out_at: at })
        .eq('id', existing.id)
        .select()
        .single()
      return { action: 'saida', at, record: mapAttendance(updated ?? existing) }
    }
    return { action: 'completo', at: existing.check_out_at ?? at, record: mapAttendance(existing) }
  },
}

// ————————————————————————————————————— Financeiro (Supabase)
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
    let q = supabase.from('payments').select('*')
    if (filters.kind && filters.kind !== 'todos') q = q.eq('kind', filters.kind)
    if (filters.status && filters.status !== 'todos') q = q.eq('status', filters.status)
    if (filters.month) q = q.eq('reference_month', filters.month)
    const { data } = await q.order('due_date', { ascending: false })
    return (data ?? []).map(mapPayment)
  },
  async receivables(): Promise<Payment[]> {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .neq('kind', 'despesa')
      .neq('status', 'pago')
      .order('due_date')
    return (data ?? []).map(mapPayment)
  },
  async payables(): Promise<Payment[]> {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('kind', 'despesa')
      .neq('status', 'pago')
      .order('due_date')
    return (data ?? []).map(mapPayment)
  },
  async summary(month = THIS_MONTH): Promise<FinanceSummary> {
    const { data } = await supabase.from('payments').select('*').eq('reference_month', month)
    const monthly = (data ?? []).map(mapPayment)
    const revenue = sum(
      monthly.filter((p) => p.kind !== 'despesa' && p.status === 'pago').map((p) => p.amount),
    )
    const expense = sum(
      monthly.filter((p) => p.kind === 'despesa' && p.status === 'pago').map((p) => p.amount),
    )
    const overdueList = monthly.filter((p) => p.kind !== 'despesa' && p.status === 'atrasado')
    const pending = sum(
      monthly.filter((p) => p.kind !== 'despesa' && p.status === 'pendente').map((p) => p.amount),
    )
    return {
      revenue,
      expense,
      net: revenue - expense,
      overdue: sum(overdueList.map((p) => p.amount)),
      overdueCount: overdueList.length,
      pending,
    }
  },
  async markPaid(id: string): Promise<Payment | undefined> {
    const { data: cur } = await supabase.from('payments').select('method').eq('id', id).maybeSingle()
    const { data } = await supabase
      .from('payments')
      .update({ status: 'pago', paid_at: new Date().toISOString(), method: cur?.method ?? 'pix' })
      .eq('id', id)
      .select()
      .single()
    return data ? mapPayment(data) : undefined
  },
  async create(data: Omit<Payment, 'id'>): Promise<Payment> {
    const { data: row, error } = await supabase
      .from('payments')
      .insert({
        kind: data.kind,
        person_id: data.personId ?? null,
        description: data.description,
        amount: data.amount,
        due_date: data.dueDate,
        paid_at: data.paidAt ?? null,
        status: data.status,
        method: data.method ?? null,
        reference_month: data.referenceMonth,
        category: data.category ?? null,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Falha ao lançar')
    return mapPayment(row)
  },
  /**
   * Rotina de cobrança do mês: lança a mensalidade (pendente, vence dia 10) de
   * cada aluno ativo que ainda não tem cobrança nesse mês. Idempotente — pode
   * rodar quantas vezes quiser que não duplica.
   */
  async generateMonthlyFees(month = THIS_MONTH): Promise<{ created: number; skipped: number }> {
    const [{ data: students }, { data: existing }] = await Promise.all([
      supabase
        .from('students')
        .select('id, name, monthly_fee, enrolled_at')
        .in('status', ['ativo', 'inadimplente']),
      supabase
        .from('payments')
        .select('person_id')
        .eq('kind', 'mensalidade')
        .eq('reference_month', month),
    ])
    const already = new Set((existing ?? []).map((p) => p.person_id))
    // Elegível: tem mensalidade combinada e já estava matriculado no mês de referência.
    const eligible = (students ?? []).filter(
      (s) => num(s.monthly_fee) > 0 && s.enrolled_at.slice(0, 7) <= month,
    )
    const toCreate = eligible.filter((s) => !already.has(s.id))
    if (toCreate.length) {
      const { error } = await supabase.from('payments').insert(
        toCreate.map((s) => ({
          kind: 'mensalidade' as const,
          person_id: s.id,
          description: `Mensalidade ${month} — ${s.name}`,
          amount: num(s.monthly_fee),
          due_date: `${month}-10`,
          status: 'pendente' as const,
          reference_month: month,
        })),
      )
      if (error) throw new Error(error.message)
    }
    return { created: toCreate.length, skipped: eligible.length - toCreate.length }
  },
  /** Fluxo de caixa real do ano corrente, mês a mês, a partir dos pagamentos. */
  async cashFlow(openingBalance = 0): Promise<CashFlowPoint[]> {
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const year = TODAY.getFullYear()
    const cm = TODAY.getMonth()
    const { data } = await supabase
      .from('payments')
      .select('*')
      .gte('reference_month', `${year}-01`)
      .lte('reference_month', `${year}-12`)
    const payments = (data ?? []).map(mapPayment)
    let saldo = openingBalance
    const out: CashFlowPoint[] = []
    for (let i = 0; i < 12; i++) {
      const ymStr = `${year}-${pad(i + 1)}`
      const monthP = payments.filter((p) => p.referenceMonth === ymStr)
      const entradas = sum(
        monthP.filter((p) => p.kind !== 'despesa' && p.status === 'pago').map((p) => p.amount),
      )
      const saidas = sum(
        monthP.filter((p) => p.kind === 'despesa' && p.status === 'pago').map((p) => p.amount),
      )
      saldo += entradas - saidas
      out.push({ month: MONTHS[i], ym: ymStr, entradas, saidas, saldo, realizado: i <= cm })
    }
    return out
  },
}

// ————————————————————————————————————— Comunicação (chat) — Supabase + Realtime
export interface ChatChannel {
  id: string
  name: string
  kind: 'geral' | 'turma'
  courseName?: string
  memberCount: number
  lastMessageAt?: string
}

function mapMessage(r: Tables['messages']['Row']): Message {
  return {
    id: r.id,
    channelId: r.channel_id,
    authorId: r.author_id ?? '',
    authorName: r.author_name,
    authorRole: r.author_role,
    content: r.content,
    at: r.created_at,
  }
}

/** Monta a lista de canais: Geral + turmas em andamento, com contagem de membros. */
async function buildChannels(): Promise<ChatChannel[]> {
  const [{ data: classes }, { data: links }, { data: msgs }, geral] = await Promise.all([
    supabase.from('classes').select('id, name, course_id').neq('status', 'concluida').order('name'),
    supabase.from('class_students').select('class_id'),
    supabase.from('messages').select('channel_id, created_at'),
    supabase.from('students').select('id', { count: 'exact', head: true }).neq('status', 'concluido'),
  ])
  const countByClass = new Map<string, number>()
  ;(links ?? []).forEach((l) => countByClass.set(l.class_id, (countByClass.get(l.class_id) ?? 0) + 1))
  const lastAt = (id: string) =>
    (msgs ?? [])
      .filter((m) => m.channel_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at
  const geralChannel: ChatChannel = {
    id: 'geral',
    name: 'Geral',
    kind: 'geral',
    memberCount: geral.count ?? 0,
    lastMessageAt: lastAt('geral'),
  }
  const turmas: ChatChannel[] = (classes ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    kind: 'turma' as const,
    courseName: courseName(c.course_id ?? ''),
    memberCount: countByClass.get(c.id) ?? 0,
    lastMessageAt: lastAt(c.id),
  }))
  return [geralChannel, ...turmas]
}

export const messagesService = {
  async channels(): Promise<ChatChannel[]> {
    return buildChannels()
  },
  async channelsFor(role: Role, linkedId?: string): Promise<ChatChannel[]> {
    const all = await buildChannels()
    if (role === 'admin') return all
    if (role === 'aluno') {
      const { data: links } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', linkedId ?? '')
      const ids = new Set((links ?? []).map((l) => l.class_id))
      return all.filter((c) => c.id === 'geral' || ids.has(c.id))
    }
    const { data: classes } = await supabase.from('classes').select('id').eq('teacher_id', linkedId ?? '')
    const ids = new Set((classes ?? []).map((c) => c.id))
    return all.filter((c) => c.id === 'geral' || ids.has(c.id))
  },
  async list(channelId: string): Promise<Message[]> {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at')
    return (data ?? []).map(mapMessage)
  },
  async members(channelId: string): Promise<Student[]> {
    if (channelId === 'geral') {
      const { data } = await supabase.from('students').select('*').neq('status', 'concluido').order('name')
      return (data ?? []).map((r) => mapStudent(r))
    }
    const { data: links } = await supabase
      .from('class_students')
      .select('student_id')
      .eq('class_id', channelId)
    const ids = (links ?? []).map((l) => l.student_id)
    if (!ids.length) return []
    const { data } = await supabase.from('students').select('*').in('id', ids).order('name')
    return (data ?? []).map((r) => mapStudent(r))
  },
  async send(
    channelId: string,
    author: { id: string; name: string; role: Role },
    content: string,
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        author_id: author.id,
        author_name: author.name,
        author_role: author.role,
        content: content.trim(),
      })
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Falha ao enviar mensagem')
    return mapMessage(data)
  },
  /** Assina novas mensagens de um canal em tempo real. Retorna a função de cancelamento. */
  subscribe(channelId: string, onMessage: (m: Message) => void): () => void {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => onMessage(mapMessage(payload.new as Tables['messages']['Row'])),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  },
}

// ————————————————————————————————————— Notas fiscais (Supabase)
function mapInvoice(r: Tables['invoices']['Row']): Invoice {
  return {
    id: r.id,
    number: r.number,
    customer: r.customer,
    description: r.description,
    amount: num(r.amount),
    date: r.date,
    status: r.status,
  }
}
export const invoicesService = {
  async list(): Promise<Invoice[]> {
    const { data } = await supabase.from('invoices').select('*').order('number', { ascending: false })
    return (data ?? []).map(mapInvoice)
  },
  async create(data: Omit<Invoice, 'id' | 'number' | 'status'>): Promise<Invoice> {
    const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true })
    const nextNum = String(1200 + (count ?? 0) + 1).padStart(6, '0')
    const { data: row, error } = await supabase
      .from('invoices')
      .insert({
        number: nextNum,
        customer: data.customer,
        description: data.description,
        amount: data.amount,
        date: data.date,
        status: 'emitida',
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Falha ao emitir nota')
    return mapInvoice(row)
  },
  async cancel(id: string): Promise<Invoice | undefined> {
    const { data } = await supabase
      .from('invoices')
      .update({ status: 'cancelada' })
      .eq('id', id)
      .select()
      .single()
    return data ? mapInvoice(data) : undefined
  },
}

// ————————————————————————————————————— Dashboard (Supabase)
export interface TodayAgendaItem extends RoomBooking {
  roomName: string
}
export const dashboardService = {
  async kpis(): Promise<DashboardKpis> {
    const [students, attendance, payments, bookings, classes, teachers, rooms] = await Promise.all([
      supabase.from('students').select('status'),
      supabase.from('attendance').select('date, person_role, status'),
      supabase.from('payments').select('kind, status, amount, reference_month'),
      supabase.from('room_bookings').select('date, start_time, end_time'),
      supabase.from('classes').select('status'),
      supabase.from('teachers').select('status'),
      supabase.from('rooms').select('id'),
    ])
    const srows = students.data ?? []
    const activeStudents = srows.filter((s) => s.status === 'ativo' || s.status === 'inadimplente').length

    const arows = attendance.data ?? []
    const dates = [...new Set(arows.map((a) => a.date))].sort().reverse()
    const lastDate = dates[0]
    const dayRecs = arows.filter((a) => a.date === lastDate && a.person_role === 'aluno')
    const present = dayRecs.filter((a) => a.status === 'presente' || a.status === 'atrasado').length
    const presenceTodayRate = dayRecs.length ? Math.round((present / dayRecs.length) * 100) : 0

    const prows = payments.data ?? []
    const overdueList = prows.filter((p) => p.kind === 'mensalidade' && p.status === 'atrasado')
    const monthly = prows.filter((p) => p.reference_month === THIS_MONTH)
    const monthlyRevenue = sum(
      monthly.filter((p) => p.kind !== 'despesa' && p.status === 'pago').map((p) => num(p.amount)),
    )
    const monthlyExpense = sum(
      monthly.filter((p) => p.kind === 'despesa' && p.status === 'pago').map((p) => num(p.amount)),
    )

    const weekStart = new Date(TODAY)
    weekStart.setDate(TODAY.getDate() - TODAY.getDay())
    const weekBookings = (bookings.data ?? []).filter((b) => b.date >= ymd(weekStart))
    const bookedHours = sum(
      weekBookings.map((b) => {
        const [sh, sm] = b.start_time.split(':').map(Number)
        const [eh, em] = b.end_time.split(':').map(Number)
        return eh + em / 60 - (sh + sm / 60)
      }),
    )
    const availableHours = (rooms.data?.length ?? 0) * 12 * 6
    const roomOccupancyRate = availableHours ? Math.round((bookedHours / availableHours) * 100) : 0

    return {
      activeStudents,
      studentsTrend: 0,
      presenceTodayRate,
      overdueAmount: sum(overdueList.map((p) => num(p.amount))),
      overdueCount: overdueList.length,
      monthlyRevenue,
      revenueTrend: 0,
      monthlyExpense,
      netResult: monthlyRevenue - monthlyExpense,
      roomOccupancyRate,
      activeClasses: (classes.data ?? []).filter((c) => c.status === 'em_andamento').length,
      activeTeachers: (teachers.data ?? []).filter((t) => t.status === 'ativo').length,
    }
  },

  async revenueSeries(): Promise<RevenueSeriesPoint[]> {
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const { data } = await supabase.from('payments').select('amount, kind, status, reference_month')
    const rows = data ?? []
    const out: RevenueSeriesPoint[] = []
    for (let k = 5; k >= 0; k--) {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - k, 1)
      const key = ym(d)
      const monthP = rows.filter((p) => p.reference_month === key && p.status === 'pago')
      out.push({
        month: MONTHS[d.getMonth()],
        receita: sum(monthP.filter((p) => p.kind !== 'despesa').map((p) => num(p.amount))),
        despesa: sum(monthP.filter((p) => p.kind === 'despesa').map((p) => num(p.amount))),
      })
    }
    return out
  },

  async attendanceSeries(): Promise<AttendanceSeriesPoint[]> {
    const { data } = await supabase.from('attendance').select('date, person_role, status')
    const rows = (data ?? []).filter((a) => a.person_role === 'aluno')
    const dates = [...new Set(rows.map((a) => a.date))].sort().slice(-7)
    return dates.map((date) => {
      const recs = rows.filter((a) => a.date === date)
      const [, m, d] = date.split('-')
      return {
        day: `${d}/${m}`,
        presenca: recs.filter((a) => a.status === 'presente' || a.status === 'atrasado').length,
        falta: recs.filter((a) => a.status === 'falta').length,
      }
    })
  },

  async alerts(): Promise<Alert[]> {
    const [students, teachers, bookings] = await Promise.all([
      supabase.from('students').select('id, name').eq('status', 'inadimplente').limit(4),
      supabase.from('teachers').select('id, name').eq('rent_status', 'atrasado').limit(2),
      supabase.from('room_bookings').select('id, title, room_id').eq('status', 'pendente').limit(2),
    ])
    const alerts: Alert[] = []
    ;(students.data ?? []).forEach((s) => {
      alerts.push({
        id: `al_${s.id}`,
        kind: 'inadimplencia',
        severity: 'danger',
        title: 'Mensalidade em atraso',
        description: `${s.name} está com a mensalidade de ${THIS_MONTH} atrasada.`,
        at: new Date().toISOString(),
      })
    })
    ;(teachers.data ?? []).forEach((t) => {
      alerts.push({
        id: `al_${t.id}`,
        kind: 'aluguel',
        severity: 'warning',
        title: 'Aluguel de sala pendente',
        description: `${t.name} está com o aluguel da sala em atraso.`,
        at: new Date().toISOString(),
      })
    })
    ;(bookings.data ?? []).forEach((b) => {
      alerts.push({
        id: `al_${b.id}`,
        kind: 'sala',
        severity: 'info',
        title: 'Reserva de sala a confirmar',
        description: `${b.title} (${roomName(b.room_id)}) aguarda confirmação.`,
        at: new Date().toISOString(),
      })
    })
    return alerts
  },

  async todayAgenda(): Promise<TodayAgendaItem[]> {
    const today = ymd(TODAY)
    const { data } = await supabase
      .from('room_bookings')
      .select('*')
      .eq('date', today)
      .order('start_time')
    return (data ?? []).map((b) => ({ ...mapBooking(b), roomName: roomName(b.room_id) }))
  },
}
