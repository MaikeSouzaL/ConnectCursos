import { type LucideIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from './card'

type StatCardProps = {
  label: string
  value: string
  icon?: LucideIcon
  /** Variação percentual (positivo = alta). */
  trend?: number
  /** Texto de apoio abaixo do valor. */
  hint?: string
  /** Boa direção da métrica: 'up' (padrão) ou 'down' (ex.: inadimplência). */
  goodDirection?: 'up' | 'down'
  accent?: 'gold' | 'red' | 'success' | 'info' | 'neutral'
  className?: string
}

const accentRing: Record<NonNullable<StatCardProps['accent']>, string> = {
  gold: 'text-brand-gold bg-brand-gold/10',
  red: 'text-brand-red bg-brand-red/10',
  success: 'text-success bg-success/10',
  info: 'text-info bg-info/10',
  neutral: 'text-muted-foreground bg-muted',
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  goodDirection = 'up',
  accent = 'gold',
  className,
}: StatCardProps) {
  const isGood =
    trend === undefined ? undefined : goodDirection === 'up' ? trend >= 0 : trend <= 0
  const TrendIcon = (trend ?? 0) >= 0 ? TrendingUpIcon : TrendingDownIcon

  return (
    <Card className={cn('gap-0 py-5', className)}>
      <div className="flex items-start justify-between px-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-semibold tracking-tight tabular">{value}</p>
        </div>
        {Icon && (
          <div className={cn('flex size-10 items-center justify-center rounded-xl', accentRing[accent])}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
      {(trend !== undefined || hint) && (
        <div className="mt-4 flex items-center gap-2 px-5 text-sm">
          {trend !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
                isGood ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
              )}
            >
              <TrendIcon className="size-3" />
              {Math.abs(trend).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  )
}
