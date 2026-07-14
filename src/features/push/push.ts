import { supabase } from '@/lib/supabase'

/**
 * Web Push — o aviso chega com o app fechado.
 *
 * A chave pública VAPID é pública por definição: ela identifica quem envia e
 * vai no bundle. Quem assina o envio é a privada, que vive só como segredo da
 * edge function.
 */
const VAPID_PUBLICA = 'BF5aom_YN1wftPXnhTF5DasX9QjmRZQMHEYJYW0eZd0547on9SpQDbdZ1loVN6bXLkNEIdjq0T6jKKOpCBr0V-g'

/**
 * base64url → bytes, formato que o pushManager exige.
 * O ArrayBuffer é criado explicitamente porque o applicationServerKey não
 * aceita um Uint8Array que possa estar sobre SharedArrayBuffer.
 */
function paraBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const bin = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** O aparelho tem suporte? (iOS só a partir do 16.4, e com o PWA instalado.) */
export function pushSuportado(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export type PushEstado = 'indisponivel' | 'negado' | 'inscrito' | 'nao-inscrito'

export async function pushEstado(): Promise<PushEstado> {
  if (!pushSuportado()) return 'indisponivel'
  if (Notification.permission === 'denied') return 'negado'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'inscrito' : 'nao-inscrito'
}

/**
 * Pede permissão, inscreve o aparelho e guarda no banco.
 * Um usuário tem uma inscrição por aparelho; o endpoint é a chave.
 */
export async function ativarPush(userId: string): Promise<PushEstado> {
  if (!pushSuportado()) return 'indisponivel'

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return permissao === 'denied' ? 'negado' : 'nao-inscrito'

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true, // exigido pelos navegadores: todo push vira notificação visível
      applicationServerKey: paraBytes(VAPID_PUBLICA),
    }))

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'nao-inscrito'

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: 'endpoint' }, // reinscrever o mesmo aparelho é update
  )
  if (error) throw new Error(error.message)
  return 'inscrito'
}

/** Cancela a inscrição deste aparelho. */
export async function desativarPush(): Promise<PushEstado> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return 'nao-inscrito'
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return 'nao-inscrito'
}
