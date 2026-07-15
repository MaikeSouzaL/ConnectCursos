-- Imagem do chat: quem pode ler o canal vê a imagem. Mais ninguém.
--
-- A policy de leitura era `bucket_id = 'chat'` e nada mais — qualquer usuário
-- logado lia QUALQUER arquivo do bucket, e podia listar o bucket inteiro para
-- descobrir os caminhos.
--
-- Provado no dev: um aluno enumera os arquivos e chega na foto postada no canal
-- de uma turma que ele não cursa. Isso anulava o isolamento por canal das
-- mensagens (0010) — a mensagem ficava escondida, a imagem dela não. É o mesmo
-- furo dos avatares (0014), noutro bucket.
--
-- O canal não está no caminho do arquivo (`<user_id>/<uuid>.<ext>`), então a
-- regra é buscada onde ela existe: a mensagem que aponta para a imagem. É
-- exatamente o que o app já fazia por conta própria — imageUrls só assina
-- caminhos que vieram de mensagens visíveis. A policy passa a exigir isso, em
-- vez de torcer para o cliente se comportar.
--
-- Só a leitura muda. Enviar e apagar seguem restritos à pasta do dono.
drop policy "chat: autenticado lê" on storage.objects;

create policy "chat: quem lê o canal vê a imagem" on storage.objects for select
  using (
    bucket_id = 'chat'
    and exists (
      select 1 from public.messages m
      where m.image_path = storage.objects.name
        and private.can_read_channel(m.channel_id)
    )
  );

-- Sem este índice, cada imagem exibida varre a tabela de mensagens inteira.
create index messages_image_path_idx on public.messages (image_path)
  where image_path is not null;
