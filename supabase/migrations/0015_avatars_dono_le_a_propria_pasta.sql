-- Conserta o efeito colateral da 0014.
--
-- A 0014 derrubou "avatars: leitura" (select no bucket inteiro) para fechar a
-- enumeração das selfies. Só que a API de Storage precisa ENXERGAR o objeto
-- para regravá-lo ou apagá-lo: sem nenhuma policy de select, o upsert passou a
-- devolver "new row violates row-level security policy" e o delete a não achar
-- nada. Na prática, quem já tinha selfie não conseguia mais trocar — e o mesmo
-- valia para a logo da instituição.
--
-- A leitura volta, mas restrita à PRÓPRIA pasta: o dono gerencia os seus
-- arquivos e ninguém lista os dos outros, que era o ponto da 0014.
-- Exibir imagem não depende disto: o bucket é público e a URL
-- /object/public/... não passa por RLS.
create policy "avatars: dono lê a própria pasta"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
