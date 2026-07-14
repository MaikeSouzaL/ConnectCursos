// Edge Function: admin-update-user
// Mantém o LOGIN em sincronia quando o admin corrige o e-mail/nome de um
// professor ou aluno. Sem isso, a pessoa continuaria entrando com o e-mail antigo.
// Valida via JWT que quem chama é admin (checado com service_role).
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Não autenticado' }, 401)

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const {
    data: { user },
    error: userErr,
  } = await caller.auth.getUser()
  if (userErr || !user) return json({ error: 'Sessão inválida' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return json({ error: 'Apenas o admin pode alterar usuários' }, 403)

  let body: { user_id?: string; email?: string; name?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }
  const userId = body.user_id
  const email = body.email?.trim().toLowerCase()
  const name = body.name?.trim()
  if (!userId) return json({ error: 'Informe o user_id' }, 400)
  if (!email && !name) return json({ error: 'Nada a atualizar' }, 400)

  // Atualiza o usuário do Auth (e-mail já confirmado, sem exigir verificação).
  const attrs: Record<string, unknown> = {}
  if (email) {
    attrs.email = email
    attrs.email_confirm = true
  }
  if (name) attrs.user_metadata = { name }
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, attrs)
  if (updErr) return json({ error: updErr.message }, 400)

  // Espelha no perfil.
  const profilePatch: Record<string, string> = {}
  if (email) profilePatch.email = email
  if (name) profilePatch.name = name
  await admin.from('profiles').update(profilePatch).eq('id', userId)

  return json({ ok: true })
})
