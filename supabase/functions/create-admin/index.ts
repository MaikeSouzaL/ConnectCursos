// Edge Function: create-admin
// Cria o PRIMEIRO administrador da instituição (bootstrap), já confirmado —
// sem depender de confirmação por e-mail. Auto-protegida: recusa se já existir
// um admin. Chamável sem login (é o passo inicial de configuração).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Proteção: só permite criar o admin se ainda não houver nenhum.
  const { count, error: countErr } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
  if (countErr) return json({ error: countErr.message }, 500)
  if ((count ?? 0) > 0) return json({ error: 'A instituição já tem um administrador' }, 403)

  let body: { name?: string; email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }
  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!name || !email || !password || password.length < 6) {
    return json({ error: 'Informe nome, e-mail e senha (mín. 6 caracteres)' }, 400)
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin', name, must_change_password: false },
  })
  if (error || !data.user) return json({ error: error?.message ?? 'Falha ao criar admin' }, 400)

  return json({ userId: data.user.id })
})
