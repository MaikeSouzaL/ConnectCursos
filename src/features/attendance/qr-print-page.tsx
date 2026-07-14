import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeftIcon, Loader2Icon, PrinterIcon } from 'lucide-react'
import { LogoLockup } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { counterQrPayload, counterQrService, institutionService } from '@/data/services'

/**
 * Folha do QR do balcão, pronta para imprimir e deixar na mesa.
 *
 * Impressa em preto sobre branco (tinta e leitura), independente do tema da
 * tela — daí as cores fixas em vez dos tokens.
 */
export function QrPrintPage() {
  const { data: token, loading } = useAsync(() => counterQrService.token(), [])
  const { data: institution } = useAsync(() => institutionService.get(), [])

  return (
    <div className="space-y-6">
      {/* Controles — somem na impressão */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/admin/chamadas">
            <ArrowLeftIcon className="size-4" />
            Chamadas & QR
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()} disabled={!token}>
          <PrinterIcon className="size-4" />
          Imprimir
        </Button>
      </div>

      <p className="text-sm text-muted-foreground print:hidden">
        Este QR Code é fixo: imprima uma vez e deixe no balcão. Os alunos escaneiam ao entrar e ao sair.
      </p>

      {/* A folha */}
      <div
        data-print-area
        className="mx-auto w-full max-w-[520px] rounded-2xl border border-border bg-white p-8 text-center print:max-w-none print:rounded-none print:border-0 print:p-0"
      >
        {loading || !token ? (
          <div className="flex h-[420px] items-center justify-center">
            <Loader2Icon className="size-8 animate-spin text-neutral-300" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div>
              <p className="font-display text-2xl font-bold tracking-tight text-neutral-900">
                Registre sua presença
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Abra o app da {institution?.name || 'Conect Cursos'} e escaneie ao entrar e ao sair.
              </p>
            </div>

            <QRCodeSVG
              value={counterQrPayload(token)}
              size={300}
              level="Q"
              marginSize={0}
              fgColor="#0A0A0B"
              bgColor="#FFFFFF"
              className="h-auto w-full max-w-[300px]"
            />

            {/* A logo da empresa, embaixo do QR */}
            {institution?.logoUrl ? (
              <img
                src={institution.logoUrl}
                alt={institution.name || 'Conect Cursos'}
                className="h-16 w-auto max-w-[240px] object-contain"
              />
            ) : (
              <LogoLockup tom="claro" className="h-16 w-auto max-w-[240px]" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
