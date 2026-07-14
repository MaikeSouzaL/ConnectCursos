import { Navigate, useLocation } from 'react-router-dom'
import { homeFor } from './routes-config'
import { useAuth } from '@/features/auth/auth-store'
import type { Role } from '@/data/types'

/** Protege rotas por papel. Redireciona para login, troca de senha ou home do papel. */
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const user = useAuth((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  // Primeiro acesso: precisa definir a senha antes de usar o app.
  if (user.mustChangePassword) {
    return <Navigate to="/trocar-senha" replace />
  }
  // Professores e alunos precisam da selfie — é como são reconhecidos no balcão.
  if (user.role !== 'admin' && !user.avatarUrl) {
    return <Navigate to="/selfie" replace />
  }
  if (user.role !== role) {
    return <Navigate to={homeFor(user.role)} replace />
  }
  return <>{children}</>
}

/** Exige apenas um usuário autenticado (usado na tela de troca de senha). */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
