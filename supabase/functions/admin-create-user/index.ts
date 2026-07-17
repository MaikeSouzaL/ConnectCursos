// Edge Function: admin-create-user
// Cria o usuário de login (Auth) de um professor ou aluno a partir do admin.
// - Valida via JWT que quem chama é admin (checado com service_role, à prova de fraude).
// - Gera uma senha temporária e cria o usuário já confirmado, com must_change_password.
// - Vincula a linha de teachers/students (user_id) ao novo usuário.
// Segredos usados (injetados automaticamente pelo Supabase): SUPABASE_URL,
// SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
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

/**
 * Senha temporária: legível para o admin ditar, mas não adivinhável.
 *
 * Era `Conect` + 4 dígitos — 9.000 possibilidades num formato público. Quem
 * soubesse o e-mail de alguém que ainda não fez o 1º acesso chegava na conta
 * varrendo Conect1000..Conect9999. E como o 1º acesso obriga a trocar a senha,
 * o invasor definiria a senha nova e trancaria o dono para fora. Numa conta de
 * professor isso cancela aula e dispara push para a turma inteira.
 *
 * Math.random() também não servia: não é criptográfico e não deve gerar
 * segredo.
 *
 * Alfabeto sem 0/O/1/I/l: a senha é ditada por telefone ou WhatsApp, e essas
 * letras geram dúvida. Sobram 31 símbolos em 8 posições (~8,5 x 10^11).
 */
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

  // Cliente com o JWT do chamador — para descobrir quem é.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userErr,
  } = await caller.auth.getUser()
  if (userErr || !user) return json({ error: 'Sessão inválida' }, 401)

  // Cliente admin (service_role) — ignora RLS. Confirma que o chamador é admin.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return json({ error: 'Apenas o admin pode criar usuários' }, 403)

  // Payload
  let body: { email?: string; name?: string; role?: string; linked_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }
  const email = body.email?.trim().toLowerCase()
  const name = body.name?.trim()
  const role = body.role
  const linkedId = body.linked_id

  if (!email || !name || (role !== 'professor' && role !== 'aluno')) {
    return json({ error: 'Dados incompletos (email, name, role professor|aluno)' }, 400)
  }

  const tempPassword = genTempPassword()

  // Cria o usuário do Auth já confirmado. O gatilho handle_new_user cria o profile.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { role, name, linked_id: linkedId ?? null, must_change_password: true },
  })
  if (createErr || !created.user) {
    return json({ error: createErr?.message ?? 'Falha ao criar usuário' }, 400)
  }

  // Vincula a linha de domínio (teachers/students) ao novo usuário.
  if (linkedId) {
    const table = role === 'professor' ? 'teachers' : 'students'
    await admin.from(table).update({ user_id: created.user.id }).eq('id', linkedId)
  }

  // Guarda a temporária para o admin poder revê-la até o 1º acesso (migration
  // 0022). O gatilho a apaga quando a pessoa define a própria senha.
  await admin.from('temp_credentials').insert({ user_id: created.user.id, password: tempPassword })

  return json({ userId: created.user.id, tempPassword })
})
