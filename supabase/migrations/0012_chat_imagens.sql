-- Imagens no chat (alunos, professores e admin).
--
-- Guarda o CAMINHO no Storage, não a URL: o bucket é privado e a exibição usa
-- URL assinada. Diferente do bucket de avatares (público, onde a URL é o
-- segredo), aqui trafega foto em conversa direta — vale exigir sessão.
alter table public.messages add column image_path text;

-- content é not null; mensagem só com imagem manda ''. O check garante que a
-- mensagem tenha ao menos uma das duas coisas — nada de linha vazia.
alter table public.messages add constraint messages_tem_conteudo
  check (length(trim(content)) > 0 or image_path is not null);

insert into storage.buckets (id, name, public)
values ('chat', 'chat', false)
on conflict (id) do nothing;

-- Escrita: cada um grava só na própria pasta ({user_id}/{uuid}.ext).
create policy "chat: dono envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat: dono remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat' and (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura: exige sessão. O caminho só chega a quem consegue ler a mensagem
-- (RLS de messages, migration 0010), então na prática segue o acesso do canal.
create policy "chat: autenticado lê"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat');
