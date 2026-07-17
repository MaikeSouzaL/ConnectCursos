// Edge Function: admin-reset-password
// Gera uma NOVA senha temporária para um professor ou aluno, a pedido do admin.
// - Valida via JWT que quem chama é admin (checado com service_role, à prova de fraude).
// - Troca a senha no Auth, marca must_change_password, guarda a temporária em
//   temp_credentials (para o admin rever) e derruba as sessões da pessoa, para
//   que ela precise entrar de novo com a nova senha.
// Segredos (injetados): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
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

// Mesmo gerador da admin-create-user: legível para ditar, sem 0/O/1/I/l, e
// crypto (não Math.random). Mantido em sincronia com aquela função.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function genTempPassword(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const s = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('')
  return `Conect-${s.slice(0, 4)}-${s.slice(4)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Não autenticado' }, 401)

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: userErr } = await caller.auth.getUser()
  if (userErr || !user) return json({ error: 'Sessão inválida' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return json({ error: 'Apenas o admin pode gerar senhas' }, 403)

  let body: { user_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }
  const targetId = body.user_id
  if (!targetId) return json({ error: 'Informe user_id' }, 400)

  // Só reseta professor/aluno — nunca a senha de outro admin por esta via.
  const { data: alvo } = await admin.from('profiles').select('role').eq('id', targetId).single()
  if (!alvo) return json({ error: 'Usuário não encontrado' }, 404)
  if (alvo.role === 'admin') return json({ error: 'Não é possível resetar a senha de um admin por aqui' }, 403)

  const tempPassword = genTempPassword()

  const { error: updErr } = await admin.auth.admin.updateUserById(targetId, { password: tempPassword })
  if (updErr) return json({ error: updErr.message }, 400)

  // Volta a exigir troca no próximo acesso. O gatilho NÃO apaga a temporária
  // aqui (só dispara em true->false); o upsert abaixo grava a nova.
  await admin.from('profiles').update({ must_change_password: true }).eq('id', targetId)

  const { error: credErr } = await admin
    .from('temp_credentials')
    .upsert({ user_id: targetId, password: tempPassword, created_at: new Date().toISOString() })
  if (credErr) return json({ error: credErr.message }, 400)

  // Derruba as sessões abertas: a pessoa cai no login e precisa entrar com a
  // nova temporária. Best-effort — se falhar, o must_change_password ainda força
  // a troca no próximo acesso.
  try {
    await fetch(`${url}/auth/v1/admin/users/${targetId}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    })
  } catch {
    // ignora: a troca forçada cobre o caso
  }

  return json({ tempPassword })
})
