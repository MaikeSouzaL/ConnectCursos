-- Performance de RLS (advisors 0003 e 0001).
--
-- 1) auth.uid() escrito direto na policy é reavaliado LINHA A LINHA. Envolvido
--    num subselect, o planner o trata como InitPlan e roda uma vez por
--    consulta. Numa listagem de mil alunos, é uma chamada em vez de mil.
--    As policies que só usam private.* já não sofrem disso: a função é STABLE
--    e o planner cacheia dentro da consulta.
--    A semântica não muda — (select auth.uid()) devolve o mesmo valor.
--
-- 2) FK sem índice coberto: toda checagem de integridade vira varredura.

-- ————————————————————————————————————— profiles
drop policy "profiles: ler o próprio ou admin" on public.profiles;
create policy "profiles: ler o próprio ou admin" on public.profiles for select
  using (id = (select auth.uid()) or private.is_admin());
drop policy "profiles: atualizar o próprio" on public.profiles;
create policy "profiles: atualizar o próprio" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ————————————————————————————————————— teachers
drop policy "teachers: autenticado lê" on public.teachers;
create policy "teachers: autenticado lê" on public.teachers for select
  using ((select auth.uid()) is not null);
drop policy "teachers: atualizar o próprio" on public.teachers;
create policy "teachers: atualizar o próprio" on public.teachers for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ————————————————————————————————————— students
drop policy "students: admin, próprio ou professor da turma" on public.students;
create policy "students: admin, próprio ou professor da turma" on public.students for select
  using (private.is_admin() or user_id = (select auth.uid()) or private.teaches_student(id));
drop policy "students: atualizar o próprio" on public.students;
create policy "students: atualizar o próprio" on public.students for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ————————————————————————————————————— leitura ampla (autenticado)
drop policy "courses: autenticado lê" on public.courses;
create policy "courses: autenticado lê" on public.courses for select
  using ((select auth.uid()) is not null);

drop policy "rooms: autenticado lê" on public.rooms;
create policy "rooms: autenticado lê" on public.rooms for select
  using ((select auth.uid()) is not null);

drop policy "classes: autenticado lê" on public.classes;
create policy "classes: autenticado lê" on public.classes for select
  using ((select auth.uid()) is not null);

drop policy "class_students: autenticado lê" on public.class_students;
create policy "class_students: autenticado lê" on public.class_students for select
  using ((select auth.uid()) is not null);

drop policy "bookings: autenticado lê" on public.room_bookings;
create policy "bookings: autenticado lê" on public.room_bookings for select
  using ((select auth.uid()) is not null);

drop policy "institution: autenticado lê" on public.institution;
create policy "institution: autenticado lê" on public.institution for select
  using ((select auth.uid()) is not null);

-- ————————————————————————————————————— messages
drop policy "messages: participante envia" on public.messages;
create policy "messages: participante envia" on public.messages for insert
  with check (
    (select auth.uid()) is not null
    and author_id = (select auth.uid())
    and private.can_read_channel(channel_id)
  );

-- ————————————————————————————————————— push_subscriptions
drop policy "push: dono lê" on public.push_subscriptions;
create policy "push: dono lê" on public.push_subscriptions for select
  using (user_id = (select auth.uid()));
drop policy "push: dono inscreve" on public.push_subscriptions;
create policy "push: dono inscreve" on public.push_subscriptions for insert
  with check (user_id = (select auth.uid()));
drop policy "push: dono atualiza" on public.push_subscriptions;
create policy "push: dono atualiza" on public.push_subscriptions for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy "push: dono remove" on public.push_subscriptions;
create policy "push: dono remove" on public.push_subscriptions for delete
  using (user_id = (select auth.uid()));

-- ————————————————————————————————————— FK sem índice (minha omissão na 0013)
create index class_cancellations_created_by_idx on public.class_cancellations (created_by);
