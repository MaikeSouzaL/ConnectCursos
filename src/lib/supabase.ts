import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/data/database.types'

/**
 * De onde o app fala com o Supabase.
 *
 * Nada de fallback: se faltar variável, o app para aqui e diz o que fazer.
 * Havia um padrão apontando para a produção, o que significava que um .env
 * ausente ou com typo mandava o ambiente local escrever no banco real —
 * exatamente o acidente que a separação dev/produção existe para evitar.
 *
 * - Local: .env (aponte para o projeto de DEV)
 * - Vercel: variáveis do projeto (apontam para a PRODUÇÃO)
 *
 * A publishable key é pública por design: vai no bundle do cliente e o acesso
 * é protegido por RLS. A service_role NUNCA entra aqui.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  const faltando = [!url && 'VITE_SUPABASE_URL', !anonKey && 'VITE_SUPABASE_ANON_KEY']
    .filter(Boolean)
    .join(' e ')
  throw new Error(
    `Supabase não configurado: falta ${faltando}. ` +
      'Local: copie .env.example para .env com os dados do projeto de DEV. ' +
      'Vercel: defina as variáveis do projeto (Settings → Environment Variables).',
  )
}

/** Em qual banco estamos — o cabeçalho do app mostra isso fora da produção. */
export const supabaseRef = new URL(url).hostname.split('.')[0]

/**
 * Cliente único do Supabase para todo o app (auth + banco + realtime).
 * A sessão é persistida no localStorage e renovada automaticamente.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
