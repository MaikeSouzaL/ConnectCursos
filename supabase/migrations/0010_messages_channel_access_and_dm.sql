-- Segurança do chat: antes, QUALQUER usuário autenticado lia TODAS as mensagens
-- (inclusive de turmas que não são dele). Agora o acesso é por participação.
-- Canais: 'geral' | <uuid da turma> | 'dm:<uuid do aluno>' (conversa com a secretaria).
create or replace function private.can_read_channel(p_channel text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- Avisos gerais: todo mundo logado.
  if p_channel = 'geral' then
    return true;
  end if;

  -- Conversa direta: só o admin e o próprio aluno.
  if p_channel like 'dm:%' then
    begin
      v_id := substring(p_channel from 4)::uuid;
    exception when others then
      return false;
    end;
    return private.is_admin()
      or exists (select 1 from public.students s where s.id = v_id and s.user_id = auth.uid());
  end if;

  -- Turma: admin, o professor da turma e os alunos matriculados.
  begin
    v_id := p_channel::uuid;
  exception when others then
    return false;
  end;
  return private.is_admin()
    or private.teaches_class(v_id)
    or exists (
      select 1 from public.class_students cs
      join public.students s on s.id = cs.student_id
      where cs.class_id = v_id and s.user_id = auth.uid()
    );
end;
$$;
grant execute on function private.can_read_channel(text) to anon, authenticated;

drop policy "messages: autenticado lê" on public.messages;
create policy "messages: participantes leem" on public.messages for select
  using (private.can_read_channel(channel_id));

drop policy "messages: autor envia" on public.messages;
create policy "messages: participante envia" on public.messages for insert
  with check (
    auth.uid() is not null
    and author_id = auth.uid()
    and private.can_read_channel(channel_id)
  );
