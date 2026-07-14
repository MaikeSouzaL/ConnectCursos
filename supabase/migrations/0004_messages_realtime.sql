-- Habilita o Realtime (broadcast de mudanças) na tabela de mensagens do chat.
alter publication supabase_realtime add table public.messages;
