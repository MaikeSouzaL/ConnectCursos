-- Bucket de avatares (selfie do 1º acesso). O caminho é {user_id}/selfie.jpg —
-- o uuid não é enumerável e a URL só chega a quem pode ler o perfil (RLS).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Escrita: cada usuário só grava na própria pasta.
create policy "avatars: dono insere"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: dono atualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: dono remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura pública (bucket público; a URL é o segredo).
create policy "avatars: leitura"
  on storage.objects for select
  using (bucket_id = 'avatars');
