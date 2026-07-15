-- ═══════════════════════════════════════════════════════════════════════════
-- Verificações de segurança e integridade — Conect Cursos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Cole no SQL Editor do Supabase (dev OU produção) e rode. Ele NÃO deixa
-- rastro: tudo acontece dentro de uma transação que se desfaz sozinha no fim
-- (o resultado sai como uma mensagem de erro — é assim que ele imprime e some).
--
-- Por que este arquivo existe: cada trava aqui foi provada uma vez, à mão, e
-- essa prova morria junto com a sessão. Um `drop policy` distraído, um upsert
-- "simplificado", e o furo volta calado — trava de segurança não avisa quando
-- some, e nenhum typecheck ou lint enxerga RLS.
--
-- Rode depois de mexer em RLS, em policy de Storage, ou em qualquer migration.
-- Toda linha tem que dizer OK.
--
-- Precisa de um admin, um professor e um aluno (com turma) cadastrados, e de
-- uma sala. Ele avisa se faltar.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  admin_user uuid; prof_user uuid; prof_id uuid; aluno_user uuid; aluno_id uuid;
  sala uuid; minha_turma uuid; turma_alheia uuid; outro_prof uuid; outro_aluno uuid;
  n int; st text; r text := E'\n';

  -- Anota uma checagem. `esperado` é o que a trava deve fazer.
  procedure_dummy int;
begin
  select p.id into admin_user from public.profiles p where p.role='admin' limit 1;
  select p.id, p.linked_id into prof_user, prof_id
    from public.profiles p where p.role='professor' and p.linked_id is not null limit 1;
  select p.id, p.linked_id into aluno_user, aluno_id
    from public.profiles p where p.role='aluno' and p.linked_id is not null limit 1;
  select id into sala from public.rooms limit 1;
  select cs.class_id into minha_turma from public.class_students cs where cs.student_id = aluno_id limit 1;
  select s.id into outro_aluno from public.students s where s.id <> aluno_id limit 1;

  if admin_user is null or prof_user is null or aluno_user is null or sala is null or minha_turma is null then
    raise exception 'Faltam dados base: precisa de admin, professor, aluno matriculado numa turma, e uma sala.';
  end if;

  -- Cenário de apoio: turma de OUTRO professor, onde o aluno NÃO está.
  insert into public.teachers (name, email) values ('__verif__', '__verif__@invalido')
    returning id into outro_prof;
  insert into public.classes (name, teacher_id) values ('__verif__ alheia', outro_prof)
    returning id into turma_alheia;

  -- ═══════════════════════════ 1. Sala: uma locação por horário (0018)
  r := r || E'RESERVA DE SALA (0018)\n';
  insert into public.room_bookings (room_id, title, type, status, date, start_time, end_time)
  values (sala, '__verif__ A', 'aluguel', 'confirmado', '2099-01-10', '19:00', '22:00');

  begin
    insert into public.room_bookings (room_id, title, type, status, date, start_time, end_time)
    values (sala, '__verif__ B', 'aluguel', 'confirmado', '2099-01-10', '19:00', '22:00');
    r := r || E'  FALHA  mesmo horario e recusado\n';
  exception when exclusion_violation then r := r || E'  OK     mesmo horario e recusado\n';
  end;

  begin
    insert into public.room_bookings (room_id, title, type, status, date, start_time, end_time)
    values (sala, '__verif__ C', 'aluguel', 'confirmado', '2099-01-10', '21:00', '23:00');
    r := r || E'  FALHA  sobreposicao parcial e recusada\n';
  exception when exclusion_violation then r := r || E'  OK     sobreposicao parcial e recusada\n';
  end;

  begin
    insert into public.room_bookings (room_id, title, type, status, date, start_time, end_time)
    values (sala, '__verif__ D', 'aluguel', 'confirmado', '2099-01-10', '22:00', '23:00');
    r := r || E'  OK     reserva colada (22h logo apos 19h-22h) e aceita\n';
  exception when exclusion_violation then r := r || E'  FALHA  reserva colada (22h logo apos 19h-22h) e aceita\n';
  end;

  update public.room_bookings set status='cancelado' where title='__verif__ A';
  begin
    insert into public.room_bookings (room_id, title, type, status, date, start_time, end_time)
    values (sala, '__verif__ E', 'aluguel', 'confirmado', '2099-01-10', '19:00', '22:00');
    r := r || E'  OK     horario de reserva cancelada volta a ser vendavel\n';
  exception when exclusion_violation then r := r || E'  FALHA  horario de reserva cancelada volta a ser vendavel\n';
  end;

  -- ═══════════════════════════ 2. Presença: um registro por dia (0019)
  r := r || E'\nPRESENCA (0019)\n';
  insert into public.attendance (person_id, person_role, class_id, date, check_in_at, method, status)
  values (aluno_id, 'aluno', minha_turma, '2099-01-10', now(), 'qr', 'presente');

  begin
    insert into public.attendance (person_id, person_role, class_id, date, check_in_at, method, status)
    values (aluno_id, 'aluno', minha_turma, '2099-01-10', now(), 'qr', 'presente');
    r := r || E'  FALHA  registro duplicado no mesmo dia e recusado\n';
  exception when unique_violation then r := r || E'  OK     registro duplicado no mesmo dia e recusado\n';
  end;

  begin
    insert into public.attendance (person_id, person_role, class_id, date, method, status)
    values (aluno_id, 'aluno', minha_turma, '2099-01-10', 'manual', 'falta');
    r := r || E'  FALHA  presente E falta juntos e recusado\n';
  exception when unique_violation then r := r || E'  OK     presente E falta juntos e recusado\n';
  end;

  insert into public.attendance (person_id, person_role, class_id, date, method, status)
  values (aluno_id, 'aluno', minha_turma, '2099-01-10', 'manual', 'falta')
  on conflict (person_id, date, person_role) do nothing;
  select status::text into st from public.attendance
    where person_id=aluno_id and date='2099-01-10' and person_role='aluno';
  r := r || case when st='presente' then E'  OK     ' else E'  FALHA  ' end
         || E'fechar chamada nao transforma quem escaneou em falta\n';

  -- ═══════════════════════════ 3. Chat: isolamento por canal (0010 + 0021)
  r := r || E'\nCHAT (0010 e 0021)\n';
  insert into storage.objects (bucket_id, name, owner, metadata)
  values ('chat', prof_user::text || '/__verif__alheia.jpg', prof_user, '{"size":1}'::jsonb);
  insert into public.messages (channel_id, author_id, author_name, author_role, content, image_path)
  values (turma_alheia::text, prof_user, 'x', 'professor', '__verif__ segredo',
          prof_user::text || '/__verif__alheia.jpg');

  insert into storage.objects (bucket_id, name, owner, metadata)
  values ('chat', prof_user::text || '/__verif__minha.jpg', prof_user, '{"size":1}'::jsonb);
  insert into public.messages (channel_id, author_id, author_name, author_role, content, image_path)
  values (minha_turma::text, prof_user, 'x', 'professor', '__verif__ da turma',
          prof_user::text || '/__verif__minha.jpg');

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', aluno_user, 'role','authenticated')::text, true);

  r := r || case when private.can_read_channel('geral') then E'  OK     ' else E'  FALHA  ' end
         || E'aluno le o canal Geral\n';
  r := r || case when private.can_read_channel(minha_turma::text) then E'  OK     ' else E'  FALHA  ' end
         || E'aluno le a propria turma\n';
  r := r || case when not private.can_read_channel(turma_alheia::text) then E'  OK     ' else E'  FALHA  ' end
         || E'aluno NAO le turma alheia\n';
  r := r || case when private.can_read_channel('dm:' || aluno_id::text) then E'  OK     ' else E'  FALHA  ' end
         || E'aluno le o proprio DM\n';
  if outro_aluno is not null then
    r := r || case when not private.can_read_channel('dm:' || outro_aluno::text) then E'  OK     ' else E'  FALHA  ' end
           || E'aluno NAO le DM de outro aluno\n';
  end if;

  select count(*) into n from public.messages where content = '__verif__ segredo';
  r := r || case when n=0 then E'  OK     ' else E'  FALHA  ' end
         || E'aluno NAO enxerga a mensagem de turma alheia\n';
  r := r || case when not exists(select 1 from storage.objects where name like '%__verif__alheia%')
                 then E'  OK     ' else E'  FALHA  ' end
         || E'aluno NAO enxerga a IMAGEM de turma alheia\n';
  r := r || case when exists(select 1 from storage.objects where name like '%__verif__minha%')
                 then E'  OK     ' else E'  FALHA  ' end
         || E'aluno enxerga a imagem da propria turma\n';

  -- ═══════════════════════════ 4. Dinheiro: só o admin escreve
  r := r || E'\nFINANCEIRO (RLS)\n';
  update public.payments set status='pago' where kind='mensalidade' and status<>'pago';
  get diagnostics n = row_count;
  r := r || case when n=0 then E'  OK     ' else E'  FALHA  ' end
         || E'aluno NAO consegue quitar a propria mensalidade\n';
  select count(*) into n from public.invoices;
  r := r || case when n=0 then E'  OK     ' else E'  FALHA  ' end
         || E'aluno NAO enxerga nota fiscal\n';
  reset role;

  -- ═══════════════════════════ 5. Professor agenda a própria sala
  r := r || E'\nAGENDA DO PROFESSOR (RLS)\n';
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', prof_user, 'role','authenticated')::text, true);

  begin
    insert into public.room_bookings (room_id, teacher_id, title, type, status, date, start_time, end_time)
    values (sala, prof_id, '__verif__ prof', 'aluguel', 'confirmado', '2099-02-10', '09:00', '11:00');
    r := r || E'  OK     professor agenda sala em nome proprio\n';
  exception when others then r := r || E'  FALHA  professor agenda sala em nome proprio\n';
  end;

  begin
    insert into public.room_bookings (room_id, teacher_id, title, type, status, date, start_time, end_time)
    values (sala, outro_prof, '__verif__ x', 'aluguel', 'confirmado', '2099-02-11', '09:00', '11:00');
    r := r || E'  FALHA  professor NAO agenda em nome de outro\n';
  exception when others then r := r || E'  OK     professor NAO agenda em nome de outro\n';
  end;

  begin
    insert into public.room_bookings (room_id, title, type, status, date, start_time, end_time)
    values (sala, '__verif__ sem dono', 'aluguel', 'confirmado', '2099-02-12', '09:00', '11:00');
    r := r || E'  FALHA  professor NAO agenda sem se identificar\n';
  exception when others then r := r || E'  OK     professor NAO agenda sem se identificar\n';
  end;
  reset role;

  r := r || E'\n(nada foi gravado: esta transacao se desfaz sozinha)\n';
  raise exception E'%', r;
end $$;
