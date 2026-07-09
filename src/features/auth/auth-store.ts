import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '@/data/db'
import { authService } from '@/data/services'
import type { Role, User } from '@/data/types'

interface AuthState {
  user: User | null
  /** Login demo por papel (sem senha): assume o usuário-semente do papel. */
  loginAs: (role: Role) => void
  /**
   * Login por e-mail + senha. Valida a credencial e retorna se a senha ainda
   * é temporária (troca obrigatória no 1º acesso).
   */
  loginWithPassword: (email: string, password: string) => { ok: boolean; mustChange: boolean }
  /** Define uma nova senha para o usuário logado e libera o acesso. */
  changePassword: (newPassword: string) => void
  logout: () => void
}

function findUserByEmail(email: string): User | null {
  const q = email.trim().toLowerCase()
  if (!q) return null
  const explicit = db.users.find((u) => u.email.toLowerCase() === q)
  if (explicit) return explicit
  const teacher = db.teachers.find((t) => t.email.toLowerCase() === q)
  if (teacher) {
    return { id: `usr_${teacher.id}`, name: teacher.name, email: teacher.email, role: 'professor', linkedId: teacher.id }
  }
  const student = db.students.find((s) => s.email.toLowerCase() === q)
  if (student) {
    return { id: `usr_${student.id}`, name: student.name, email: student.email, role: 'aluno', linkedId: student.id }
  }
  return null
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loginAs: (role) => {
        const user = db.users.find((u) => u.role === role) ?? null
        set({ user: user ? { ...user, mustChangePassword: false } : null })
      },
      loginWithPassword: (email, password) => {
        const result = authService.validate(email, password)
        if (!result) return { ok: false, mustChange: false }
        const user = findUserByEmail(email)
        if (!user) return { ok: false, mustChange: false }
        set({ user: { ...user, mustChangePassword: result.mustChange } })
        return { ok: true, mustChange: result.mustChange }
      },
      changePassword: (newPassword) => {
        const u = get().user
        if (!u) return
        authService.changePassword(u.email, newPassword)
        set({ user: { ...u, mustChangePassword: false } })
      },
      logout: () => set({ user: null }),
    }),
    { name: 'conect-auth' },
  ),
)

/** Rótulo amigável do papel. */
export const roleLabel: Record<Role, string> = {
  admin: 'Administração',
  professor: 'Professor',
  aluno: 'Aluno',
}
