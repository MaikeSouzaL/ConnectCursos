-- Fecha a listagem do bucket público de avatares (advisor 0025).
--
-- A policy "avatars: leitura" liberava SELECT em storage.objects para o bucket
-- inteiro. Num bucket PÚBLICO isso não serve para exibir imagem — a URL
-- /object/public/... nem passa por RLS — mas deixava qualquer cliente LISTAR
-- os arquivos e, com isso, enumerar a selfie de todos os alunos.
--
-- Sem a policy: a imagem continua abrindo por URL (é o que o app faz, via
-- getPublicUrl) e o upload segue funcionando pelas policies de dono.
drop policy if exists "avatars: leitura" on storage.objects;
