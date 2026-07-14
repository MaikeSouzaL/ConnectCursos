import { Suspense, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarCheckIcon,
  HomeIcon,
  MessagesSquareIcon,
  QrCodeIcon,
  UserIcon,
  WalletIcon,
  WifiOffIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { EnvBadge } from '@/components/shared/env-badge'
import { Logomark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/shared/page-loading'
import { flushQueue, usePendingScans } from '@/features/aluno/checkin-queue'
import { useOnline } from '@/features/aluno/use-online'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/aluno', label: 'Início', icon: HomeIcon, end: true },
  { to: '/aluno/presenca', label: 'Presença', icon: CalendarCheckIcon, end: false },
  { to: '/aluno/financeiro', label: 'Financeiro', icon: WalletIcon, end: false },
  { to: '/aluno/perfil', label: 'Perfil', icon: UserIcon, end: false },
]

export function AlunoLayout() {
  const online = useOnline()
  const pending = usePendingScans()
  const location = useLocation()

  // Sincroniza a fila offline ao reconectar (ou ao abrir já online).
  useEffect(() => {
    if (online && pending > 0) {
      flushQueue()
        .then((results) => {
          if (results.length) toast.success(`${results.length} presença(s) sincronizada(s)`)
        })
        // Sem o catch, a falha virava unhandled rejection e o aluno seguia sem
        // saber que a presença dele não subiu. A leitura continua na fila.
        .catch(() => {
          toast.error('Não deu para sincronizar sua presença', {
            description: 'A leitura está guardada e vai subir sozinha na próxima conexão.',
          })
        })
    }
  }, [online, pending])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background shadow-2xl sm:border-x sm:border-border">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Logomark className="size-8" />
          <EnvBadge />
        </div>
        <div className="flex items-center gap-2">
          {!online ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
              <WifiOffIcon className="size-3.5" /> Offline
            </span>
          ) : pending > 0 ? (
            <span className="rounded-full bg-info/15 px-2.5 py-1 text-xs font-medium text-info">
              Sincronizando…
            </span>
          ) : null}
          <Button variant="ghost" size="icon-sm" asChild aria-label="Mensagens">
            <NavLink to="/aluno/mensagens">
              <MessagesSquareIcon className="size-5" />
            </NavLink>
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-28">
        <Suspense fallback={<PageLoading />}>
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </Suspense>
      </main>

      {/* Bottom nav com botão central de escanear */}
      <nav className="sticky bottom-0 z-20 grid grid-cols-5 items-center border-t border-border bg-background/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md">
        {tabs.slice(0, 2).map((t) => (
          <TabLink key={t.to} {...t} />
        ))}
        <div className="flex justify-center">
          <NavLink
            to="/aluno/scan"
            aria-label="Escanear QR Code"
            className="-mt-8 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-brand-gold/30 ring-4 ring-background transition-transform active:scale-95"
          >
            <QrCodeIcon className="size-7" />
          </NavLink>
        </div>
        {tabs.slice(2).map((t) => (
          <TabLink key={t.to} {...t} />
        ))}
      </nav>
    </div>
  )
}

function TabLink({ to, label, icon: Icon, end }: (typeof tabs)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  )
}
