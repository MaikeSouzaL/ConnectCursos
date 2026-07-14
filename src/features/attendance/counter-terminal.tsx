import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowRightLeftIcon, LogInIcon, LogOutIcon, RefreshCwIcon, XIcon } from 'lucide-react'
import { LogoLockup } from '@/components/brand/Logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { attendanceService, studentAvatar, studentName } from '@/data/services'
import { formatTime, initials } from '@/lib/format'

const TOKEN_TTL = 30 // segundos

function randomToken() {
  return Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-')
}
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CounterTerminal() {
  const [now, setNow] = useState(new Date())
  const [token, setToken] = useState(randomToken)
  const [secondsLeft, setSecondsLeft] = useState(TOKEN_TTL)
  const { data: records } = useAsync(() => attendanceService.byDate(todayISO()), [])

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Token rotativo com contagem regressiva
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setToken(randomToken())
          return TOKEN_TTL
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const payload = useMemo(
    () => `conect://checkin?loc=balcao-01&t=${token}&ts=${Math.floor(now.getTime() / 1000)}`,
    [token, now],
  )

  const clock = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateLabel = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  const recent = (records ?? []).filter((r) => r.checkInAt).slice(0, 5)

  return (
    <div className="flex min-h-dvh flex-col bg-brand-black bg-brand-glow text-white">
      <header className="flex items-center justify-between gap-4 p-6">
        <LogoLockup className="max-w-[200px]" />
        <Button variant="ghost" size="sm" asChild className="text-white/70 hover:bg-white/10 hover:text-white">
          <Link to="/admin/chamadas">
            <XIcon className="size-4" />
            Sair do terminal
          </Link>
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6 lg:flex-row lg:gap-16">
        {/* QR */}
        <div className="flex flex-col items-center">
          <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-white/20">
            <QRCodeSVG value={payload} size={248} level="M" marginSize={0} fgColor="#0A0A0B" bgColor="#FFFFFF" />
          </div>
          <div className="mt-4 flex w-[296px] flex-col items-center">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <RefreshCwIcon className="size-3.5" />
              Novo código em {secondsLeft}s
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand-gold transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / TOKEN_TTL) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Instruções + relógio */}
        <div className="max-w-sm space-y-6 text-center lg:text-left">
          <div>
            <p className="font-display text-6xl font-bold tabular tracking-tight">{clock}</p>
            <p className="mt-1 text-lg capitalize text-white/60">{dateLabel}</p>
          </div>
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-bold">Registre sua presença</h2>
            <p className="text-white/60">
              Abra o app da Conect Cursos e escaneie o QR Code ao <strong className="text-white">entrar</strong> e ao{' '}
              <strong className="text-white">sair</strong>.
            </p>
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success">
                <LogInIcon className="size-4" /> Entrada
              </span>
              <ArrowRightLeftIcon className="size-4 text-white/30" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info/15 px-3 py-1 text-sm font-medium text-info">
                <LogOutIcon className="size-4" /> Saída
              </span>
            </div>
          </div>

          {/* Últimas leituras */}
          {recent.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
                Últimas leituras
              </p>
              <ul className="space-y-2.5">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {studentAvatar(r.personId) && (
                        <AvatarImage src={studentAvatar(r.personId)} alt="" className="object-cover" />
                      )}
                      <AvatarFallback className="bg-white/10 text-xs text-white">
                        {initials(studentName(r.personId))}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">{studentName(r.personId)}</span>
                    <span className="text-xs text-white/50">
                      {r.checkOutAt ? `saiu ${formatTime(r.checkOutAt)}` : `entrou ${formatTime(r.checkInAt!)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <footer className="p-6 text-center text-xs text-white/30">
        Terminal do Balcão · Conect Cursos · Mantenha esta tela visível no balcão de entrada.
      </footer>
    </div>
  )
}
