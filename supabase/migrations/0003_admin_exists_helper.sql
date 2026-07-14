-- Permite à tela de login (anônimo) saber se já existe um admin,
-- para decidir entre "Configurar administrador" e "Entrar".
-- Retorna apenas um booleano (não expõe dados).
create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where role = 'admin');
$$;

grant execute on function public.admin_exists() to anon, authenticated;
