import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowRightLeftIcon, Loader2Icon, LogInIcon, LogOutIcon, PrinterIcon, XIcon } from 'lucide-react'
import { LogoLockup } from '@/components/brand/Logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { attendanceService, counterQrPayload, counterQrService, studentAvatar, studentName } from '@/data/services'
import { formatTime, initials } from '@/lib/format'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CounterTerminal() {
  const [now, setNow] = useState(new Date())
  const { data: records } = useAsync(() => attendanceService.byDate(todayISO()), [])
  const { data: token } = useAsync(() => counterQrService.token(), [])

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const payload = token ? counterQrPayload(token) : null

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
        {/* QR fixo — o mesmo da folha impressa no balcão */}
        <div className="flex flex-col items-center">
          <div className="flex size-[296px] items-center justify-center rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-white/20">
            {payload ? (
              <QRCodeSVG value={payload} size={248} level="M" marginSize={0} fgColor="#0A0A0B" bgColor="#FFFFFF" />
            ) : (
              <Loader2Icon className="size-8 animate-spin text-brand-black/30" />
            )}
          </div>
          <Button variant="ghost" size="sm" asChild className="mt-4 text-white/70 hover:bg-white/10 hover:text-white">
            <Link to="/admin/chamadas/qr-impressao">
              <PrinterIcon className="size-4" />
              Imprimir para o balcão
            </Link>
          </Button>
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
