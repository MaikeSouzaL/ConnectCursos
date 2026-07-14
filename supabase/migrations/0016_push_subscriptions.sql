-- Inscrições de Web Push.
--
-- O aviso de aula cancelada só alcançava quem estivesse com o app aberto na
-- home — e o objetivo era justamente o aluno NÃO ir até a escola à toa. Sem
-- push, quem está no ônibus com o celular no bolso vai do mesmo jeito.
--
-- Cada aparelho gera um endpoint próprio, então um usuário tem N inscrições
-- (celular, notebook…). O endpoint é único: reinscrever o mesmo aparelho é
-- update, não duplicata.
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Cada um cuida das próprias inscrições. Quem dispara o push é a edge function
-- com service_role, que ignora RLS — ninguém precisa ler a inscrição alheia.
create policy "push: dono lê" on public.push_subscriptions for select
  using (user_id = auth.uid());
create policy "push: dono inscreve" on public.push_subscriptions for insert
  with check (user_id = auth.uid());
create policy "push: dono atualiza" on public.push_subscriptions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push: dono remove" on public.push_subscriptions for delete
  using (user_id = auth.uid());
