import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/data/database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Falha cedo e claro em dev se o .env não estiver configurado.
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env',
  )
}

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
