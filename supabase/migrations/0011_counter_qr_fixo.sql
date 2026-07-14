-- QR do balcão: gerado uma única vez, para ser impresso e ficar na mesa.
--
-- Antes o terminal sorteava um token novo a cada 30s, mas ninguém o conferia:
-- o scanner descartava o conteúdo do QR e registrava presença com qualquer
-- código. O token agora é fixo (dá para imprimir) e passa a ser validado.
create table public.counter_qr (
  id         boolean primary key default true check (id),
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Linha única, criada junto com o schema: o token nasce aqui e não muda mais.
insert into public.counter_qr (id) values (true) on conflict do nothing;

alter table public.counter_qr enable row level security;

-- Só o admin lê o token — é ele que imprime a folha do balcão. O aluno nunca
-- vê o valor, então não consegue forjar o QR sem ter o impresso na frente.
create policy "counter_qr: admin lê" on public.counter_qr for select
  using (private.is_admin());

-- Sem policy de insert/update/delete: o QR é gerado uma única vez e ponto.

-- O aluno só pode perguntar "este código que eu li é o do balcão?".
create or replace function public.counter_token_valido(t uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (select 1 from public.counter_qr where token = t);
$$;

revoke all on function public.counter_token_valido(uuid) from public, anon;
grant execute on function public.counter_token_valido(uuid) to authenticated;
