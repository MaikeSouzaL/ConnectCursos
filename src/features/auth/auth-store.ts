import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Role, User } from '@/data/types'

interface LoginResult {
  ok: boolean
  mustChange: boolean
  error?: string
}

interface AuthState {
  user: User | null
  /** true enquanto a sessão inicial ainda não foi resolvida (evita redirecionar cedo). */
  initializing: boolean
  /** Inicializa a auth: restaura a sessão e escuta mudanças. Chamar uma vez no boot. */
  init: () => void
  /** Login por e-mail + senha (Supabase Auth). */
  loginWithPassword: (email: string, password: string) => Promise<LoginResult>
  /** Define nova senha do usuário logado e limpa a obrigatoriedade de troca. */
  changePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>
  /** Cria o 1º administrador (bootstrap) e já autentica. */
  createAdmin: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  /** Existe algum admin cadastrado? (decide entre configurar e entrar). */
  adminExists: () => Promise<boolean>
  logout: () => Promise<void>
}

/** Converte a linha de profiles no User da UI. */
async function loadUser(userId: string): Promise<User | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    avatarUrl: data.avatar_url ?? undefined,
    linkedId: data.linked_id ?? undefined,
    mustChangePassword: data.must_change_password,
  }
}

/** Extrai a mensagem de erro do corpo de uma resposta de Edge Function. */
async function fnErrorMessage(error: unknown, fallback: string): Promise<string> {
  try {
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json()
      if (body?.error) return String(body.error)
    }
  } catch {
    /* ignora */
  }
  return (error as Error)?.message ?? fallback
}

let initialized = false

export const useAuth = create<AuthState>()((set, get) => ({
  user: null,
  initializing: true,

  init: () => {
    if (initialized) return
    initialized = true

    // Resolve a sessão atual (persistida pelo supabase-js).
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = await loadUser(session.user.id)
        set({ user: u, initializing: false })
      } else {
        set({ user: null, initializing: false })
      }
    })

    // Reage a login/logout (inclusive em outra aba).
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!session?.user) {
        set({ user: null })
        return
      }
      // Adia a consulta ao profile para não travar dentro do callback.
      setTimeout(async () => {
        const u = await loadUser(session.user.id)
        set({ user: u })
      }, 0)
    })
  },

  loginWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error || !data.user) {
      return { ok: false, mustChange: false, error: error?.message }
    }
    const u = await loadUser(data.user.id)
    if (!u) return { ok: false, mustChange: false, error: 'Perfil não encontrado' }
    set({ user: u })
    return { ok: true, mustChange: Boolean(u.mustChangePassword) }
  },

  changePassword: async (newPassword) => {
    const { data: sess } = await supabase.auth.getUser()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: error.message }
    if (sess.user) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', sess.user.id)
    }
    const u = get().user
    if (u) set({ user: { ...u, mustChangePassword: false } })
    return { ok: true }
  },

  createAdmin: async (name, email, password) => {
    const { error } = await supabase.functions.invoke('create-admin', {
      body: { name, email: email.trim().toLowerCase(), password },
    })
    if (error) {
      return { ok: false, error: await fnErrorMessage(error, 'Falha ao configurar o administrador') }
    }
    const res = await get().loginWithPassword(email, password)
    return { ok: res.ok, error: res.error }
  },

  adminExists: async () => {
    const { data, error } = await supabase.rpc('admin_exists')
    if (error) return true // fail-safe: assume que existe → mostra login
    return Boolean(data)
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))

/** Rótulo amigável do papel. */
export const roleLabel: Record<Role, string> = {
  admin: 'Administração',
  professor: 'Professor',
  aluno: 'Aluno',
}
