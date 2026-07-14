-- Move as funções auxiliares de RLS para um schema privado (não exposto pela API),
-- eliminando os avisos 0028/0029. As políticas passam a referenciar private.*.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function private.my_linked_id()
returns uuid language sql stable security definer set search_path = public as $$
  select linked_id from public.profiles where id = auth.uid();
$$;
create or replace function private.my_role()
returns public.role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function private.teaches_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classes c
    join public.class_students cs on cs.class_id = c.id
    join public.teachers t on t.id = c.teacher_id
    where cs.student_id = p_student_id and t.user_id = auth.uid()
  );
$$;
create or replace function private.teaches_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classes c
    join public.teachers t on t.id = c.teacher_id
    where c.id = p_class_id and t.user_id = auth.uid()
  );
$$;
grant execute on function private.is_admin(), private.my_linked_id(), private.my_role(),
  private.teaches_student(uuid), private.teaches_class(uuid) to anon, authenticated;

-- profiles
drop policy "profiles: ler o próprio ou admin" on public.profiles;
create policy "profiles: ler o próprio ou admin" on public.profiles for select
  using (id = auth.uid() or private.is_admin());
drop policy "profiles: admin insere" on public.profiles;
create policy "profiles: admin insere" on public.profiles for insert with check (private.is_admin());
drop policy "profiles: admin atualiza qualquer" on public.profiles;
create policy "profiles: admin atualiza qualquer" on public.profiles for update
  using (private.is_admin()) with check (private.is_admin());
drop policy "profiles: admin remove" on public.profiles;
create policy "profiles: admin remove" on public.profiles for delete using (private.is_admin());

-- teachers
drop policy "teachers: admin escreve" on public.teachers;
create policy "teachers: admin escreve" on public.teachers for all
  using (private.is_admin()) with check (private.is_admin());

-- students
drop policy "students: admin, próprio ou professor da turma" on public.students;
create policy "students: admin, próprio ou professor da turma" on public.students for select
  using (private.is_admin() or user_id = auth.uid() or private.teaches_student(id));
drop policy "students: admin escreve" on public.students;
create policy "students: admin escreve" on public.students for all
  using (private.is_admin()) with check (private.is_admin());

-- courses / rooms / classes / class_students
drop policy "courses: admin escreve" on public.courses;
create policy "courses: admin escreve" on public.courses for all
  using (private.is_admin()) with check (private.is_admin());
drop policy "rooms: admin escreve" on public.rooms;
create policy "rooms: admin escreve" on public.rooms for all
  using (private.is_admin()) with check (private.is_admin());
drop policy "classes: admin escreve" on public.classes;
create policy "classes: admin escreve" on public.classes for all
  using (private.is_admin()) with check (private.is_admin());
drop policy "class_students: admin escreve" on public.class_students;
create policy "class_students: admin escreve" on public.class_students for all
  using (private.is_admin()) with check (private.is_admin());

-- attendance
drop policy "attendance: admin, próprio ou professor da turma" on public.attendance;
create policy "attendance: admin, próprio ou professor da turma" on public.attendance for select
  using (private.is_admin() or person_id = private.my_linked_id() or private.teaches_class(class_id));
drop policy "attendance: registrar (admin ou próprio)" on public.attendance;
create policy "attendance: registrar (admin ou próprio)" on public.attendance for insert
  with check (private.is_admin() or person_id = private.my_linked_id());
drop policy "attendance: atualizar (admin ou próprio)" on public.attendance;
create policy "attendance: atualizar (admin ou próprio)" on public.attendance for update
  using (private.is_admin() or person_id = private.my_linked_id());
drop policy "attendance: admin remove" on public.attendance;
create policy "attendance: admin remove" on public.attendance for delete using (private.is_admin());

-- payments
drop policy "payments: admin ou próprio" on public.payments;
create policy "payments: admin ou próprio" on public.payments for select
  using (private.is_admin() or person_id = private.my_linked_id());
drop policy "payments: admin escreve" on public.payments;
create policy "payments: admin escreve" on public.payments for all
  using (private.is_admin()) with check (private.is_admin());

-- room_bookings
drop policy "bookings: admin ou professor dono escreve" on public.room_bookings;
create policy "bookings: admin ou professor dono escreve" on public.room_bookings for all
  using (private.is_admin() or teacher_id = private.my_linked_id())
  with check (private.is_admin() or teacher_id = private.my_linked_id());

-- invoices
drop policy "invoices: admin" on public.invoices;
create policy "invoices: admin" on public.invoices for all
  using (private.is_admin()) with check (private.is_admin());

-- Remove as funções auxiliares do schema público
drop function public.is_admin();
drop function public.my_linked_id();
drop function public.my_role();
drop function public.teaches_student(uuid);
drop function public.teaches_class(uuid);
