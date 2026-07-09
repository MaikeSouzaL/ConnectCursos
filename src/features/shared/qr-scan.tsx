import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import {
  CheckCircle2Icon,
  LogInIcon,
  LogOutIcon,
  ScanLineIcon,
  WifiOffIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { attendanceService, type ScanResult } from '@/data/services'
import { enqueueScan } from '@/features/aluno/checkin-queue'
import { useOnline } from '@/features/aluno/use-online'
import { formatTime } from '@/lib/format'

type Outcome = { kind: 'online'; result: ScanResult } | { kind: 'offline'; at: string }

const actionText: Record<ScanResult['action'], { title: string; icon: typeof LogInIcon; color: string }> = {
  entrada: { title: 'Entrada registrada', icon: LogInIcon, color: 'text-success' },
  saida: { title: 'Saída registrada', icon: LogOutIcon, color: 'text-info' },
  completo: { title: 'Presença já concluída hoje', icon: CheckCircle2Icon, color: 'text-muted-foreground' },
}

/** Scanner de QR de presença reutilizável (aluno/professor). */
export function QrScan({
  personId,
  role,
  homePath,
}: {
  personId: string
  role: 'aluno' | 'professor'
  homePath: string
}) {
  const online = useOnline()
  const navigate = useNavigate()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [cameraError, setCameraError] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const handledRef = useRef(false)

  const stopScanner = async () => {
    const s = scannerRef.current
    if (s) {
      try {
        if (s.isScanning) await s.stop()
        await s.clear()
      } catch {
        /* ignore */
      }
      scannerRef.current = null
    }
  }

  const handleScan = async () => {
    if (handledRef.current) return
    handledRef.current = true
    await stopScanner()
    const at = new Date().toISOString()
    if (online) {
      const result = await attendanceService.registerScan(personId, at, role)
      setOutcome({ kind: 'online', result })
    } else {
      enqueueScan(personId, at, role)
      setOutcome({ kind: 'offline', at })
    }
  }

  useEffect(() => {
    if (outcome) return
    const scanner = new Html5Qrcode('qr-reader', { verbose: false })
    scannerRef.current = scanner
    scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, () => handleScan(), undefined)
      .catch(() => setCameraError(true))
    return () => {
      void stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome])

  if (outcome) {
    const isOffline = outcome.kind === 'offline'
    const meta = isOffline ? null : actionText[outcome.result.action]
    const time = isOffline ? outcome.at : outcome.result.at
    const Icon = meta?.icon ?? WifiOffIcon
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div
          className={`flex size-20 items-center justify-center rounded-full ${isOffline ? 'bg-warning/15 text-warning' : 'bg-success/15 ' + (meta?.color ?? '')}`}
        >
          <Icon className="size-10" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">
          {isOffline ? 'Registrado offline' : meta?.title}
        </h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {isOffline
            ? 'Você está sem conexão. A leitura foi salva e será sincronizada ao reconectar.'
            : outcome.result.action === 'completo'
              ? 'Você já registrou entrada e saída hoje.'
              : `Horário: ${formatTime(time)}`}
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
          <Button size="lg" onClick={() => navigate(homePath)}>
            Concluir
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Escanear QR</h1>
        <Button variant="ghost" size="icon-sm" asChild aria-label="Fechar">
          <Link to={homePath}>
            <XIcon className="size-5" />
          </Link>
        </Button>
      </div>

      {!online && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
          <WifiOffIcon className="size-4" /> Sem conexão — a leitura será sincronizada depois.
        </div>
      )}

      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-black ring-1 ring-border">
        <div id="qr-reader" className="size-full [&_video]:size-full [&_video]:object-cover" />
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <ScanLineIcon className="size-8 text-white/50" />
            <p className="text-sm text-white/70">Câmera indisponível neste dispositivo.</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Aponte a câmera para o QR Code exibido no balcão da Conect Cursos.
      </p>

      <Button variant="outline" size="lg" className="w-full" onClick={handleScan}>
        <ScanLineIcon className="size-5" />
        Simular leitura do QR (demo)
      </Button>
    </div>
  )
}
