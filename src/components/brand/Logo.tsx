import { cn } from '@/lib/utils'
import logoLockup from '@/assets/brand/logo-lockup.png'
import logoLockupClaro from '@/assets/brand/logo-lockup-claro.png'
import logomark from '@/assets/brand/logomark.png'

/**
 * Emblema da Conect Cursos — órbitas entrelaçadas (ouro + vermelho).
 * Extraído da arte original (ver scripts/build-logo.mjs); fundo transparente,
 * então assenta em qualquer superfície e nos dois temas.
 */
export function Logomark({ className }: { className?: string }) {
  return (
    <img
      src={logomark}
      alt=""
      aria-hidden
      className={cn('h-8 w-8 shrink-0 object-contain', className)}
    />
  )
}

type LogoProps = {
  className?: string
  /** Mostra a tagline "Conectada ao seu futuro". */
  showTagline?: boolean
  /** Só o emblema, sem o texto. */
  markOnly?: boolean
}

/**
 * Lockup: emblema real + wordmark em texto.
 *
 * O wordmark é texto (e não a arte original) porque precisa acompanhar o tema:
 * na arte ele é branco fixo e sumiria no tema claro. Onde o fundo é escuro por
 * definição, use <LogoLockup>, que traz a arte original inteira.
 */
export function Logo({ className, showTagline = false, markOnly = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logomark className="h-9 w-9" />
      {!markOnly && (
        <div className="flex flex-col leading-none">
          <div className="font-display text-lg font-bold tracking-tight">
            <span className="text-foreground">CONECT</span>{' '}
            <span className="text-brand-gold">CURSOS</span>
          </div>
          {showTagline && (
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Conectada ao seu futuro
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Arte original completa — emblema + wordmark + tagline.
 *
 * `tom`: 'escuro' (padrão) traz o wordmark branco, para fundo escuro;
 * 'claro' traz o wordmark preto, para papel e fundos claros.
 */
export function LogoLockup({
  className,
  tom = 'escuro',
}: {
  className?: string
  tom?: 'escuro' | 'claro'
}) {
  return (
    <img
      src={tom === 'claro' ? logoLockupClaro : logoLockup}
      alt="Conect Cursos — Conectada ao seu futuro"
      className={cn('h-auto w-full max-w-[280px] object-contain', className)}
    />
  )
}
