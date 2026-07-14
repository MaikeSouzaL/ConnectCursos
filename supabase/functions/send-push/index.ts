// Edge Function: send-push
// Dispara Web Push para os alunos de UMA turma — hoje, o aviso de que não
// haverá aula. Sem isso o aviso só alcançava quem estivesse com o app aberto,
// o que não evita a viagem perdida, que era o objetivo.
//
// Quem pode chamar: o admin ou o professor da turma (checado com service_role,
// à prova de fraude — um professor não avisa a turma de outro).
//
// Segredos: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// (injetados) + VAPID_PRIVATE_KEY e VAPID_SUBJECT (definidos por nós).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const VAPID_PUBLIC = 'BF5aom_YN1wftPXnhTF5DasX9QjmRZQMHEYJYW0eZd0547on9SpQDbdZ1loVN6bXLkNEIdjq0T6jKKOpCBr0V-g'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@conectcursos.com'
  if (!vapidPrivate) return json({ error: 'VAPID_PRIVATE_KEY não configurada' }, 500)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Não autenticado' }, 401)

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: userErr } = await caller.auth.getUser()
  if (userErr || !user) return json({ error: 'Sessão inválida' }, 401)

  let body: { class_id?: string; title?: string; message?: string; url?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }
  const classId = body.class_id
  const title = body.title?.trim()
  const message = body.message?.trim()
  if (!classId || !title || !message) {
    return json({ error: 'Informe class_id, title e message' }, 400)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Autorização: admin, ou o professor DAQUELA turma.
  const { data: profile } = await admin.from('profiles').select('role, linked_id').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    const { data: turma } = await admin.from('classes').select('teacher_id').eq('id', classId).single()
    if (!turma || profile?.role !== 'professor' || turma.teacher_id !== profile.linked_id) {
      return json({ error: 'Você não leciona esta turma' }, 403)
    }
  }

  // Alunos da turma → seus usuários → suas inscrições.
  const { data: matriculas } = await admin.from('class_students').select('student_id').eq('class_id', classId)
  const studentIds = (matriculas ?? []).map((m) => m.student_id)
  if (!studentIds.length) return json({ enviados: 0, motivo: 'turma sem alunos' })

  const { data: alunos } = await admin.from('students').select('user_id').in('id', studentIds)
  const userIds = (alunos ?? []).map((a) => a.user_id).filter((v): v is string => !!v)
  if (!userIds.length) return json({ enviados: 0, motivo: 'alunos sem login' })

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  if (!subs?.length) return json({ enviados: 0, motivo: 'ninguém ativou as notificações' })

  webpush.setVapidDetails(vapidSubject, VAPID_PUBLIC, vapidPrivate)
  const payload = JSON.stringify({
    title,
    body: message,
    url: body.url ?? '/aluno',
    tag: `aula-${classId}`, // aviso novo da mesma turma substitui o anterior
  })

  /**
   * Teto por envio: um serviço de push lento não deve segurar o aviso dos
   * outros alunos. Defesa preventiva — endpoint morto real responde 404 em ~2s.
   */
  const ENVIO_TIMEOUT_MS = 10_000
  const comTimeout = <T,>(p: Promise<T>): Promise<T> =>
    Promise.race([
      p,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ENVIO_TIMEOUT_MS)),
    ])

  let enviados = 0
  let falhas = 0
  const expiradas: string[] = []
  await Promise.all(
    subs.map(async (s) => {
      try {
        await comTimeout(
          webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          ),
        )
        enviados++
      } catch (e) {
        falhas++
        // 404/410 = aparelho desinscreveu ou o endpoint morreu: limpa, senão
        // a tabela vira cemitério e cada envio fica mais lento.
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) expiradas.push(s.id)
      }
    }),
  )

  if (expiradas.length) {
    await admin.from('push_subscriptions').delete().in('id', expiradas)
  }

  return json({ enviados, falhas, inscricoes: subs.length, expiradasRemovidas: expiradas.length })
})
