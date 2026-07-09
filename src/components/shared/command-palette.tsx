import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  BanknoteIcon,
  BookOpenIcon,
  CornerDownLeftIcon,
  DoorOpenIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  QrCodeIcon,
  SearchIcon,
  SettingsIcon,
  UserSquareIcon,
  UsersIcon,
} from 'lucide-react'
import {
  classesService,
  coursesService,
  roomsService,
  studentsService,
  teachersService,
} from '@/data/services'
import { cn } from '@/lib/utils'

interface CmdItem {
  id: string
  label: string
  sub?: string
  group: string
  to: string
  icon: LucideIcon
}

const pages: CmdItem[] = [
  { id: 'p-dash', label: 'Dashboard', group: 'Ir para', to: '/admin', icon: LayoutDashboardIcon },
  { id: 'p-alunos', label: 'Alunos', group: 'Ir para', to: '/admin/alunos', icon: UsersIcon },
  { id: 'p-turmas', label: 'Turmas', group: 'Ir para', to: '/admin/turmas', icon: GraduationCapIcon },
  { id: 'p-cursos', label: 'Cursos', group: 'Ir para', to: '/admin/cursos', icon: BookOpenIcon },
  { id: 'p-prof', label: 'Professores', group: 'Ir para', to: '/admin/professores', icon: UserSquareIcon },
  { id: 'p-cham', label: 'Chamadas & QR', group: 'Ir para', to: '/admin/chamadas', icon: QrCodeIcon },
  { id: 'p-salas', label: 'Salas & Agenda', group: 'Ir para', to: '/admin/salas', icon: DoorOpenIcon },
  { id: 'p-fin', label: 'Financeiro', group: 'Ir para', to: '/admin/financeiro', icon: BanknoteIcon },
  { id: 'p-cfg', label: 'Configurações', group: 'Ir para', to: '/admin/configuracoes', icon: SettingsIcon },
]

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [items, setItems] = useState<CmdItem[]>(pages)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Atalho global Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Carrega os dados pesquisáveis ao abrir
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    let alive = true
    Promise.all([
      studentsService.list(),
      teachersService.list(),
      coursesService.list(),
      classesService.list(),
      roomsService.list(),
    ]).then(([students, teachers, courses, classes, rooms]) => {
      if (!alive) return
      const data: CmdItem[] = [
        ...pages,
        ...students.map((s) => ({ id: s.id, label: s.name, sub: s.email, group: 'Alunos', to: `/admin/alunos/${s.id}`, icon: UsersIcon })),
        ...teachers.map((t) => ({ id: t.id, label: t.name, sub: t.specialty, group: 'Professores', to: `/admin/professores/${t.id}`, icon: UserSquareIcon })),
        ...courses.map((c) => ({ id: c.id, label: c.name, sub: c.category, group: 'Cursos', to: '/admin/cursos', icon: BookOpenIcon })),
        ...classes.map((c) => ({ id: c.id, label: c.name, sub: c.courseName, group: 'Turmas', to: `/admin/turmas/${c.id}`, icon: GraduationCapIcon })),
        ...rooms.map((r) => ({ id: r.id, label: r.name, sub: `${r.capacity} lugares`, group: 'Salas', to: '/admin/salas', icon: DoorOpenIcon })),
      ]
      setItems(data)
    })
    return () => {
      alive = false
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = norm(query.trim())
    if (!q) return pages
    return items.filter((it) => norm(it.label).includes(q) || (it.sub && norm(it.sub).includes(q))).slice(0, 24)
  }, [query, items])

  // Agrupa preservando ordem
  const groups = useMemo(() => {
    const map = new Map<string, CmdItem[]>()
    filtered.forEach((it) => {
      const arr = map.get(it.group) ?? []
      arr.push(it)
      map.set(it.group, arr)
    })
    return [...map.entries()]
  }, [filtered])

  const go = (item: CmdItem) => {
    setOpen(false)
    navigate(item.to)
  }

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[active]
      if (item) go(item)
    }
  }

  return (
    <>
      {/* Gatilho no lugar da busca do topo */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-transparent bg-secondary px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
        aria-label="Buscar (Ctrl+K)"
      >
        <SearchIcon className="size-4" />
        <span>Buscar alunos, turmas, cursos…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-flex">
          Ctrl K
        </kbd>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed left-1/2 top-[12vh] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            onOpenAutoFocus={(e) => {
              e.preventDefault()
              inputRef.current?.focus()
            }}
          >
            <DialogPrimitive.Title className="sr-only">Busca global</DialogPrimitive.Title>
            <div className="flex items-center gap-2 border-b border-border px-4">
              <SearchIcon className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onInputKey}
                placeholder="Buscar alunos, turmas, cursos, professores, salas…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Nenhum resultado para “{query}”.
                </p>
              ) : (
                groups.map(([group, list]) => (
                  <div key={group} className="mb-1">
                    <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      {group}
                    </p>
                    {list.map((item) => {
                      const idx = filtered.indexOf(item)
                      const isActive = idx === active
                      return (
                        <button
                          key={item.id}
                          onClick={() => go(item)}
                          onMouseMove={() => setActive(idx)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors',
                            isActive ? 'bg-accent text-accent-foreground' : 'text-foreground',
                          )}
                        >
                          <item.icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {item.sub && (
                            <span className="hidden truncate text-xs text-muted-foreground sm:block">{item.sub}</span>
                          )}
                          {isActive && <CornerDownLeftIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
