-- ============================================================================
-- Conect Cursos — Schema inicial
-- Modela todo o domínio (alunos, professores, cursos, turmas, salas, presença,
-- financeiro, agendamentos, notas fiscais e chat), com RLS por papel e o
-- gatilho que cria o perfil quando um usuário é criado no Auth.
-- ============================================================================

-- ————————————————————————————————————— Enums (unions do domínio) —————————————
create type public.role            as enum ('admin', 'professor', 'aluno');
create type public.student_status  as enum ('ativo', 'inadimplente', 'trancado', 'concluido');
create type public.teacher_status  as enum ('ativo', 'inativo');
create type public.course_status   as enum ('ativo', 'inativo');
create type public.class_status    as enum ('em_andamento', 'planejada', 'concluida');
create type public.attendance_status as enum ('presente', 'atrasado', 'falta', 'justificado');
create type public.attendance_method as enum ('qr', 'manual');
create type public.payment_status  as enum ('pago', 'pendente', 'atrasado');
create type public.payment_kind    as enum ('mensalidade', 'aluguel', 'despesa', 'outra_receita');
create type public.payment_method  as enum ('pix', 'cartao', 'boleto', 'dinheiro');
create type public.booking_type    as enum ('turma', 'aluguel', 'palestra', 'evento', 'manutencao');
create type public.booking_status  as enum ('confirmado', 'pendente', 'cancelado');
create type public.invoice_status  as enum ('emitida', 'cancelada');

-- ————————————————————————————————————— profiles ——————————————————————————————
-- Um perfil por usuário do Auth. `linked_id` aponta para teachers.id ou
-- students.id (nulo para o admin). O gatilho abaixo cria a linha no signup.
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  public.role not null default 'aluno',
  name                  text not null,
  email                 text not null,
  avatar_url            text,
  linked_id             uuid,
  must_change_password  boolean not null default false,
  created_at            timestamptz not null default now()
);

-- ————————————————————————————————————— teachers ——————————————————————————————
create table public.teachers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references public.profiles(id) on delete set null,
  name          text not null,
  email         text not null,
  phone         text not null default '',
  avatar_url    text,
  specialty     text not null default '',
  status        public.teacher_status not null default 'ativo',
  hired_at      timestamptz not null default now(),
  monthly_rent  numeric(10,2) not null default 0,
  rent_status   public.payment_status not null default 'pendente'
);

-- ————————————————————————————————————— students ——————————————————————————————
create table public.students (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references public.profiles(id) on delete set null,
  name         text not null,
  email        text not null,
  phone        text not null default '',
  avatar_url   text,
  cpf          text not null default '',
  birth_date   date,
  status       public.student_status not null default 'ativo',
  enrolled_at  timestamptz not null default now(),
  monthly_fee  numeric(10,2) not null default 0
);

-- ————————————————————————————————————— courses ———————————————————————————————
create table public.courses (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text not null default '',
  category        text not null default '',
  teacher_id      uuid references public.teachers(id) on delete set null,
  price_monthly   numeric(10,2) not null default 0,
  duration_months int not null default 1,
  workload_hours  int not null default 0,
  status          public.course_status not null default 'ativo',
  color           text not null default '#FFC400',
  created_at      timestamptz not null default now()
);

-- ————————————————————————————————————— rooms —————————————————————————————————
create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  capacity    int not null default 0,
  resources   text[] not null default '{}',
  color       text not null default '#FFC400',
  hourly_rate numeric(10,2) not null default 0
);

-- ————————————————————————————————————— classes (turmas) ——————————————————————
-- `schedule` guarda os horários semanais: [{ "weekday": 1, "start": "19:00", "end": "22:00" }]
create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  course_id   uuid references public.courses(id) on delete cascade,
  teacher_id  uuid references public.teachers(id) on delete set null,
  room_id     uuid references public.rooms(id) on delete set null,
  schedule    jsonb not null default '[]'::jsonb,
  start_date  date,
  end_date    date,
  capacity    int not null default 0,
  status      public.class_status not null default 'planejada'
);

-- ————————————————————————————————————— class_students (matrículas) ———————————
create table public.class_students (
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (class_id, student_id)
);

-- ————————————————————————————————————— attendance ————————————————————————————
create table public.attendance (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null,
  person_role  text not null check (person_role in ('aluno', 'professor')),
  class_id     uuid references public.classes(id) on delete set null,
  date         date not null,
  check_in_at  timestamptz,
  check_out_at timestamptz,
  method       public.attendance_method not null default 'qr',
  status       public.attendance_status not null default 'presente',
  created_at   timestamptz not null default now()
);

-- ————————————————————————————————————— payments —————————————————————————————
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  kind            public.payment_kind not null,
  person_id       uuid,
  description     text not null default '',
  amount          numeric(10,2) not null default 0,
  due_date        date not null,
  paid_at         timestamptz,
  status          public.payment_status not null default 'pendente',
  method          public.payment_method,
  reference_month text not null,
  category        text,
  created_at      timestamptz not null default now()
);

-- ————————————————————————————————————— room_bookings —————————————————————————
create table public.room_bookings (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  title       text not null,
  type        public.booking_type not null,
  status      public.booking_status not null default 'confirmado',
  date        date not null,
  start_time  text not null,
  end_time    text not null,
  renter_name text,
  class_id    uuid references public.classes(id) on delete set null,
  teacher_id  uuid references public.teachers(id) on delete set null,
  price       numeric(10,2)
);

-- ————————————————————————————————————— invoices —————————————————————————————
create table public.invoices (
  id          uuid primary key default gen_random_uuid(),
  number      text not null unique,
  customer    text not null,
  description text not null default '',
  amount      numeric(10,2) not null default 0,
  date        date not null,
  status      public.invoice_status not null default 'emitida',
  created_at  timestamptz not null default now()
);

-- ————————————————————————————————————— messages (chat) ———————————————————————
-- channel_id = 'geral' ou o id (uuid em texto) da turma. Os canais são
-- derivados das turmas na camada de serviço; aqui guardamos só as mensagens.
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  text not null,
  author_id   uuid,
  author_name text not null,
  author_role public.role not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

-- ————————————————————————————————————— Índices (FKs / consultas quentes) ——————
create index idx_teachers_user      on public.teachers(user_id);
create index idx_students_user      on public.students(user_id);
create index idx_courses_teacher    on public.courses(teacher_id);
create index idx_classes_course     on public.classes(course_id);
create index idx_classes_teacher    on public.classes(teacher_id);
create index idx_classes_room       on public.classes(room_id);
create index idx_class_students_stu on public.class_students(student_id);
create index idx_attendance_person  on public.attendance(person_id);
create index idx_attendance_class   on public.attendance(class_id);
create index idx_attendance_date    on public.attendance(date);
create index idx_payments_person    on public.payments(person_id);
create index idx_payments_refmonth  on public.payments(reference_month);
create index idx_payments_status    on public.payments(status);
create index idx_bookings_room      on public.room_bookings(room_id);
create index idx_bookings_date      on public.room_bookings(date);
create index idx_bookings_teacher   on public.room_bookings(teacher_id);
create index idx_bookings_class     on public.room_bookings(class_id);
create index idx_messages_channel   on public.messages(channel_id);

-- ============================================================================
-- Funções auxiliares (SECURITY DEFINER) — usadas nas políticas de RLS
-- ============================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_linked_id()
returns uuid language sql stable security definer set search_path = public as $$
  select linked_id from public.profiles where id = auth.uid();
$$;

create or replace function public.my_role()
returns public.role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Professor leciona alguma turma em que o aluno está matriculado?
create or replace function public.teaches_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.classes c
    join public.class_students cs on cs.class_id = c.id
    join public.teachers t on t.id = c.teacher_id
    where cs.student_id = p_student_id and t.user_id = auth.uid()
  );
$$;

-- Professor é o responsável pela turma da presença?
create or replace function public.teaches_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classes c
    join public.teachers t on t.id = c.teacher_id
    where c.id = p_class_id and t.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Gatilho: cria o perfil quando um usuário nasce no Auth
-- Lê metadados (role, name, linked_id, must_change_password). Impede um 2º admin.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.role := coalesce((new.raw_user_meta_data->>'role')::public.role, 'aluno');
begin
  if v_role = 'admin' and exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Já existe um administrador cadastrado nesta instituição';
  end if;

  insert into public.profiles (id, role, name, email, linked_id, must_change_password)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'linked_id', '')::uuid,
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.teachers       enable row level security;
alter table public.students       enable row level security;
alter table public.courses        enable row level security;
alter table public.rooms          enable row level security;
alter table public.classes        enable row level security;
alter table public.class_students enable row level security;
alter table public.attendance     enable row level security;
alter table public.payments       enable row level security;
alter table public.room_bookings  enable row level security;
alter table public.invoices       enable row level security;
alter table public.messages       enable row level security;

-- ————— profiles —————
create policy "profiles: ler o próprio ou admin"
  on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: admin insere"
  on public.profiles for insert with check (public.is_admin());
create policy "profiles: atualizar o próprio"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin atualiza qualquer"
  on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "profiles: admin remove"
  on public.profiles for delete using (public.is_admin());

-- ————— teachers —————
create policy "teachers: autenticado lê"
  on public.teachers for select using (auth.uid() is not null);
create policy "teachers: admin escreve"
  on public.teachers for all using (public.is_admin()) with check (public.is_admin());
create policy "teachers: atualizar o próprio"
  on public.teachers for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ————— students —————
create policy "students: admin, próprio ou professor da turma"
  on public.students for select
  using (public.is_admin() or user_id = auth.uid() or public.teaches_student(id));
create policy "students: admin escreve"
  on public.students for all using (public.is_admin()) with check (public.is_admin());
create policy "students: atualizar o próprio"
  on public.students for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ————— courses / rooms / classes / class_students (leitura ampla; escrita admin) —————
create policy "courses: autenticado lê"
  on public.courses for select using (auth.uid() is not null);
create policy "courses: admin escreve"
  on public.courses for all using (public.is_admin()) with check (public.is_admin());

create policy "rooms: autenticado lê"
  on public.rooms for select using (auth.uid() is not null);
create policy "rooms: admin escreve"
  on public.rooms for all using (public.is_admin()) with check (public.is_admin());

create policy "classes: autenticado lê"
  on public.classes for select using (auth.uid() is not null);
create policy "classes: admin escreve"
  on public.classes for all using (public.is_admin()) with check (public.is_admin());

create policy "class_students: autenticado lê"
  on public.class_students for select using (auth.uid() is not null);
create policy "class_students: admin escreve"
  on public.class_students for all using (public.is_admin()) with check (public.is_admin());

-- ————— attendance (presença) —————
create policy "attendance: admin, próprio ou professor da turma"
  on public.attendance for select
  using (public.is_admin() or person_id = public.my_linked_id() or public.teaches_class(class_id));
create policy "attendance: registrar (admin ou próprio)"
  on public.attendance for insert
  with check (public.is_admin() or person_id = public.my_linked_id());
create policy "attendance: atualizar (admin ou próprio)"
  on public.attendance for update
  using (public.is_admin() or person_id = public.my_linked_id());
create policy "attendance: admin remove"
  on public.attendance for delete using (public.is_admin());

-- ————— payments (financeiro) —————
create policy "payments: admin ou próprio"
  on public.payments for select
  using (public.is_admin() or person_id = public.my_linked_id());
create policy "payments: admin escreve"
  on public.payments for all using (public.is_admin()) with check (public.is_admin());

-- ————— room_bookings (agenda de salas) —————
create policy "bookings: autenticado lê"
  on public.room_bookings for select using (auth.uid() is not null);
create policy "bookings: admin ou professor dono escreve"
  on public.room_bookings for all
  using (public.is_admin() or teacher_id = public.my_linked_id())
  with check (public.is_admin() or teacher_id = public.my_linked_id());

-- ————— invoices (notas fiscais) — admin apenas —————
create policy "invoices: admin"
  on public.invoices for all using (public.is_admin()) with check (public.is_admin());

-- ————— messages (chat) — autenticado lê; autor envia como si mesmo —————
create policy "messages: autenticado lê"
  on public.messages for select using (auth.uid() is not null);
create policy "messages: autor envia"
  on public.messages for insert with check (auth.uid() is not null and author_id = auth.uid());
