-- Dados da instituição (linha única, garantida pelo check em id).
create table public.institution (
  id         boolean primary key default true check (id),
  name       text not null default 'Conect Cursos',
  cnpj       text not null default '',
  phone      text not null default '',
  email      text not null default '',
  address    text not null default '',
  logo_url   text,
  updated_at timestamptz not null default now()
);
insert into public.institution (id) values (true) on conflict do nothing;

alter table public.institution enable row level security;
create policy "institution: autenticado lê" on public.institution for select
  using (auth.uid() is not null);
create policy "institution: admin escreve" on public.institution for all
  using (private.is_admin()) with check (private.is_admin());

-- Preferências de notificação por usuário.
alter table public.profiles add column notification_prefs jsonb not null default '{}'::jsonb;
