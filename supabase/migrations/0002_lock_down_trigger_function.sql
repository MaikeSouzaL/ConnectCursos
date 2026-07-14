-- handle_new_user é função de gatilho; não deve ser chamável via PostgREST RPC.
-- O gatilho continua disparando normalmente (independe de EXECUTE).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
