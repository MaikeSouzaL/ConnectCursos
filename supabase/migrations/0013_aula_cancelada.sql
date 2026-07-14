-- Professor avisa que não vai poder dar a aula.
--
-- O aviso é por turma + data, e só os alunos daquela turma recebem — a graça
-- é o aluno não perder a viagem até o local.
create table public.class_cancellations (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  date       date not null,
  reason     text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  -- Um aviso por turma/dia; remarcar em cima do mesmo dia é update, não duplicata.
  unique (class_id, date)
);

create index class_cancellations_class_date_idx on public.class_cancellations (class_id, date);

alter table public.class_cancellations enable row level security;

-- Lê: o admin, o professor da turma e os alunos matriculados nela.
create policy "cancelamentos: turma envolvida lê" on public.class_cancellations for select
  using (
    private.is_admin()
    or private.teaches_class(class_id)
    or exists (
      select 1 from public.class_students cs
      where cs.class_id = class_cancellations.class_id
        and cs.student_id = private.my_linked_id()
    )
  );

-- Escreve: só o admin e o professor daquela turma. Um professor não cancela
-- a aula de outro.
create policy "cancelamentos: professor da turma avisa" on public.class_cancellations for insert
  with check (private.is_admin() or private.teaches_class(class_id));

create policy "cancelamentos: professor da turma corrige" on public.class_cancellations for update
  using (private.is_admin() or private.teaches_class(class_id))
  with check (private.is_admin() or private.teaches_class(class_id));

-- Desfaz o aviso (a aula vai acontecer afinal).
create policy "cancelamentos: professor da turma desfaz" on public.class_cancellations for delete
  using (private.is_admin() or private.teaches_class(class_id));

-- Tempo real: o aluno recebe o aviso com o app aberto, sem recarregar.
alter publication supabase_realtime add table public.class_cancellations;
