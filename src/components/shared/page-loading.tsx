import { Logomark } from '@/components/brand/Logo'

/** Fallback de carregamento para rotas lazy. */
export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <Logomark className="size-10 animate-pulse" />
    </div>
  )
}
