// Edge Function: admin-delete-user
// Exclui de vez um professor ou aluno, a pedido do admin — remove a linha de
// domínio (students/teachers), o login (auth) e, por cascata, matrículas,
// profile e senha temporária.
//
// TRAVA: se a pessoa já tiver pagamento OU presença lançados, RECUSA (devolve
// { ok:false, motivo:'historico' }). Apagar aluno com histórico transformaria a
// contabilidade dele em registro fantasma — nesse caso o admin deve inativar.
//
// Valida via JWT que quem chama é admin (checado com service_role).
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
  if (profile?.role !== 'admin') return json({ error: 'Apenas o admin pode excluir' }, 403)

  let body: { linked_id?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }
  const linkedId = body.linked_id
  const role = body.role
  if (!linkedId || (role !== 'professor' && role !== 'aluno')) {
    return json({ error: 'Informe linked_id e role (professor|aluno)' }, 400)
  }
  const table = role === 'professor' ? 'teachers' : 'students'

  // Existe mesmo? E qual o login vinculado?
  const { data: alvo } = await admin.from(table).select('id, user_id').eq('id', linkedId).single()
  if (!alvo) return json({ error: 'Cadastro não encontrado' }, 404)

  // TRAVA: histórico financeiro ou de presença bloqueia a exclusão.
  const [{ count: pagamentos }, { count: presencas }] = await Promise.all([
    admin.from('payments').select('id', { count: 'exact', head: true }).eq('person_id', linkedId),
    admin.from('attendance').select('id', { count: 'exact', head: true }).eq('person_id', linkedId),
  ])
  if ((pagamentos ?? 0) > 0 || (presencas ?? 0) > 0) {
    return json({ ok: false, motivo: 'historico', pagamentos: pagamentos ?? 0, presencas: presencas ?? 0 })
  }

  // Sem histórico: apaga. A linha de domínio cascateia class_students; o login
  // cascateia profile e temp_credentials.
  const { error: delErr } = await admin.from(table).delete().eq('id', linkedId)
  if (delErr) return json({ error: delErr.message }, 400)

  if (alvo.user_id) {
    const { error: authErr } = await admin.auth.admin.deleteUser(alvo.user_id)
    // Se a linha sumiu mas o login não, não é fatal: o cadastro já foi removido.
    if (authErr) return json({ ok: true, aviso: 'cadastro removido, mas o login persistiu: ' + authErr.message })
  }

  return json({ ok: true })
})
