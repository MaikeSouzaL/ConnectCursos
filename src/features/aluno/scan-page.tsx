import { QrScan } from '@/features/shared/qr-scan'
import { useAuth } from '@/features/auth/auth-store'

export function AlunoScanPage() {
  const studentId = useAuth((s) => s.user?.linkedId ?? '')
  return <QrScan personId={studentId} role="aluno" homePath="/aluno" />
}
