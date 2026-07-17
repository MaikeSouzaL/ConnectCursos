-- Senha temporária revisável pelo admin (pedido do cliente).
--
-- Contexto: ao cadastrar aluno/professor, o sistema gera uma senha temporária e
-- a mostra UMA vez. O admin pediu para poder revê-la enquanto a pessoa ainda não
-- fez o 1º acesso, e gerar uma nova quando precisar.
--
-- Ver a senha "de novo" só é possível guardando-a — a senha do Auth é um hash
-- irreversível, ninguém a lê de volta. Então guardamos a temporária aqui, com
-- três travas para o risco de texto puro ser aceitável:
--   1. só o ADMIN lê (RLS abaixo). Aluno e professor NUNCA leem esta tabela.
--   2. some sozinha no instante em que a pessoa define a própria senha
--      (o gatilho, quando must_change_password vai de true para false).
--   3. é senha de uso único, descartável e de troca forçada — valor baixo.
--
-- Escrita é só pelas edge functions (service_role, que ignora RLS): não há
-- policy de insert/update de propósito.
create table public.temp_credentials (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  password   text not null,
  created_at timestamptz not null default now()
);
alter table public.temp_credentials enable row level security;

create policy "temp_cred: admin lê" on public.temp_credentials for select
  using (private.is_admin());
create policy "temp_cred: admin remove" on public.temp_credentials for delete
  using (private.is_admin());

-- A pessoa definiu a própria senha (must_change_password: true -> false):
-- a temporária deixa de existir. É o "após o aluno cadastrar a nova senha, a
-- temporária é deletada" que o cliente descreveu.
create or replace function private.limpar_senha_temporaria()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.must_change_password and not new.must_change_password then
    delete from public.temp_credentials where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_limpa_senha_temporaria
  after update of must_change_password on public.profiles
  for each row execute function private.limpar_senha_temporaria();
