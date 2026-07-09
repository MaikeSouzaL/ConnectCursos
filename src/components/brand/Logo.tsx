import { cn } from '@/lib/utils'

/**
 * Emblema da Conect Cursos — órbitas entrelaçadas (ouro + vermelho) com cometa.
 * Fundo transparente: assenta sobre qualquer superfície.
 */
export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="Conect Cursos"
      className={cn('h-8 w-8', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cc-gold" x1="90" y1="180" x2="430" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFDE59" />
          <stop offset="1" stopColor="#FFB300" />
        </linearGradient>
        <linearGradient id="cc-red" x1="150" y1="150" x2="380" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B3B" />
          <stop offset="1" stopColor="#C00510" />
        </linearGradient>
        <linearGradient id="cc-comet" x1="250" y1="235" x2="432" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <g transform="translate(256 262)">
        <ellipse rx="150" ry="66" transform="rotate(-24)" fill="none" stroke="url(#cc-gold)" strokeWidth="42" strokeLinecap="round" />
        <ellipse rx="150" ry="66" transform="rotate(42)" fill="none" stroke="url(#cc-red)" strokeWidth="42" strokeLinecap="round" />
      </g>
      <path d="M262 236 C 320 205, 372 182, 432 150 C 388 200, 340 232, 286 258 Z" fill="url(#cc-comet)" opacity="0.95" />
      <circle cx="432" cy="150" r="11" fill="#FFFFFF" />
    </svg>
  )
}

type LogoProps = {
  className?: string
  /** Mostra a tagline "Conectada ao seu futuro". */
  showTagline?: boolean
  /** Só o emblema, sem o texto. */
  markOnly?: boolean
}

/** Lockup completo: emblema + wordmark CONECT CURSOS. */
export function Logo({ className, showTagline = false, markOnly = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logomark className="h-9 w-9 shrink-0" />
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
