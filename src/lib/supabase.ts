import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/data/database.types'

// A publishable key é pública por design (vai no bundle do cliente; o acesso é
// protegido por RLS). Os valores abaixo servem de fallback para a produção;
// podem ser sobrescritos por VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://uimuifgbeubrvvpbzvrl.supabase.co'
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_ke5vEZ00cqDbXKakmlDqHw_knG_BRp_'

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
