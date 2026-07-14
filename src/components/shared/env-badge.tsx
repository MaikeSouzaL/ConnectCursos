import { DatabaseIcon } from 'lucide-react'
import { supabaseRef } from '@/lib/supabase'

/** Ref do projeto Supabase de produção. Qualquer outro é ambiente de teste. */
const PROD_REF = 'uimuifgbeubrvvpbzvrl'

/**
 * Avisa em qual banco o app está falando quando NÃO é a produção.
 *
 * Sem isso, dev e produção são idênticos na tela e a separação depende de
 * lembrar qual .env está carregado — é assim que se apaga dado real achando
 * que é teste. Na produção não renderiza nada.
 */
export function EnvBadge() {
  if (supabaseRef === PROD_REF) return null

  return (
    <span
      title={`Banco: ${supabaseRef}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-warning ring-1 ring-warning/30"
    >
      <DatabaseIcon className="size-3" />
      Dev
    </span>
  )
}
