import type { Role } from '@/data/types'

/** Rota inicial de cada papel. */
export function homeFor(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'professor':
      return '/professor'
    case 'aluno':
      return '/aluno'
  }
}
