-- Correção (QA): o professor precisa poder registrar/atualizar a presença dos
-- alunos da turma que leciona. As políticas antigas só permitiam admin ou o próprio.
drop policy "attendance: registrar (admin ou próprio)" on public.attendance;
create policy "attendance: registrar (admin, próprio ou professor)" on public.attendance for insert
  with check (
    private.is_admin()
    or person_id = private.my_linked_id()
    or private.teaches_class(class_id)
  );

drop policy "attendance: atualizar (admin ou próprio)" on public.attendance;
create policy "attendance: atualizar (admin, próprio ou professor)" on public.attendance for update
  using (
    private.is_admin()
    or person_id = private.my_linked_id()
    or private.teaches_class(class_id)
  );
