import { QrScan } from '@/features/shared/qr-scan'
import { useAuth } from '@/features/auth/auth-store'

export function ProfessorScanPage() {
  const teacherId = useAuth((s) => s.user?.linkedId ?? '')
  return <QrScan personId={teacherId} role="professor" homePath="/professor" />
}
