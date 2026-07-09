import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {
  AlertTriangleIcon,
  BellIcon,
  CheckCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { dashboardService } from '@/data/services'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Alert } from '@/data/types'

const severityIcon: Record<Alert['severity'], typeof InfoIcon> = {
  danger: TriangleAlertIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
}
const severityColor: Record<Alert['severity'], string> = {
  danger: 'text-destructive bg-destructive/10',
  warning: 'text-warning bg-warning/10',
  info: 'text-info bg-info/10',
}
const routeFor: Record<Alert['kind'], string> = {
  inadimplencia: '/admin/financeiro',
  falta: '/admin/chamadas',
  aluguel: '/admin/professores',
  sala: '/admin/salas',
  sistema: '/admin',
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const { data: alerts } = useAsync(() => dashboardService.alerts(), [])
  const navigate = useNavigate()
  const count = alerts?.length ?? 0

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Notificações${count ? `, ${count} novas` : ''}`} className="relative">
          <BellIcon className="size-[18px]" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-background">
              {count}
            </span>
          )}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[22rem] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-display text-sm font-semibold">Notificações</p>
            {count > 0 && (
              <span className="rounded-full bg-brand-red/15 px-2 py-0.5 text-xs font-medium text-brand-red">
                {count} nova{count > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {alerts && alerts.length > 0 ? (
              alerts.map((a) => {
                const Icon = severityIcon[a.severity]
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setOpen(false)
                      navigate(routeFor[a.kind])
                    }}
                    className="flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent"
                  >
                    <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', severityColor[a.severity])}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">{formatRelative(a.at)}</p>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCheckIcon className="size-8 text-success" />
                <p className="text-sm font-medium">Tudo em dia</p>
                <p className="text-xs text-muted-foreground">Nenhuma notificação no momento.</p>
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
