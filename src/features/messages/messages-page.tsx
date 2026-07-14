import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  HashIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  SearchIcon,
  SendIcon,
  UsersIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAsync } from '@/hooks/use-async'
import { messagesService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { formatTime, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function MessagesPage() {
  const user = useAuth((s) => s.user)
  const [selected, setSelected] = useState('geral')
  const [reload, setReload] = useState(0)
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: channels } = useAsync(() => messagesService.channels(), [reload])
  const { data: messages } = useAsync(() => messagesService.list(selected), [selected, reload])
  const { data: members } = useAsync(() => messagesService.members(selected), [selected, reload])

  const current = channels?.find((c) => c.id === selected)
  const geral = channels?.find((c) => c.id === 'geral')
  const turmas = useMemo(() => {
    const list = channels?.filter((c) => c.kind === 'turma') ?? []
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter((c) => c.name.toLowerCase().includes(q))
  }, [channels, search])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  // Tempo real: novas mensagens no canal aberto recarregam a conversa.
  useEffect(() => {
    return messagesService.subscribe(selected, () => setReload((r) => r + 1))
  }, [selected])

  const send = async () => {
    const content = text.trim()
    if (!content || !user) return
    await messagesService.send(selected, { id: user.id, name: user.name, role: user.role }, content)
    setText('')
    setReload((r) => r + 1)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Converse com todos os alunos no canal Geral ou com cada turma separadamente.
        </p>
      </div>

      <div className="flex h-[calc(100dvh-13rem)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-card">
        {/* Canais */}
        <aside
          className={cn(
            'w-full shrink-0 flex-col border-r border-border sm:flex sm:w-64',
            selected ? 'hidden sm:flex' : 'flex',
          )}
        >
          <div className="border-b border-border p-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar turma…"
                className="h-9 border-transparent bg-secondary pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-2">
            {geral && (
              <div>
                <ChannelButton
                  active={selected === 'geral'}
                  icon={MegaphoneIcon}
                  name={geral.name}
                  count={geral.memberCount}
                  onClick={() => setSelected('geral')}
                />
              </div>
            )}
            <div>
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Turmas
              </p>
              <div className="space-y-0.5">
                {turmas.map((c) => (
                  <ChannelButton
                    key={c.id}
                    active={selected === c.id}
                    icon={HashIcon}
                    name={c.name}
                    count={c.memberCount}
                    onClick={() => setSelected(c.id)}
                  />
                ))}
                {turmas.length === 0 && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">Nenhuma turma.</p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Conversa */}
        <section className={cn('min-w-0 flex-1 flex-col', selected ? 'flex' : 'hidden sm:flex')}>
          {/* Header */}
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="sm:hidden"
              onClick={() => setSelected('')}
              aria-label="Voltar aos canais"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            {current?.kind === 'geral' ? (
              <MegaphoneIcon className="size-4 text-muted-foreground" />
            ) : (
              <HashIcon className="size-4 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{current?.name ?? '—'}</p>
              {current?.courseName && (
                <p className="truncate text-xs text-muted-foreground">{current.courseName}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={() => setShowMembers((v) => !v)}
            >
              <UsersIcon className="size-4" />
              {current?.memberCount ?? 0}
            </Button>
          </header>

          <div className="flex min-h-0 flex-1">
            {/* Mensagens */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages && messages.length > 0 ? (
                  messages.map((m, i) => {
                    const prev = messages[i - 1]
                    const grouped =
                      prev &&
                      prev.authorId === m.authorId &&
                      new Date(m.at).getTime() - new Date(prev.at).getTime() < 5 * 60_000
                    return (
                      <div key={m.id} className={cn('flex gap-3', grouped && '-mt-3')}>
                        <div className="w-9 shrink-0">
                          {!grouped && (
                            <Avatar className="size-9">
                              <AvatarFallback className="bg-primary/15 text-xs text-primary">
                                {initials(m.authorName)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {!grouped && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium">{m.authorName}</span>
                              <span className="text-[11px] text-muted-foreground">{formatTime(m.at)}</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{m.content}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <MessagesSquareIcon className="size-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Comece a conversa</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Envie a primeira mensagem para {current?.kind === 'geral' ? 'todos os alunos' : 'esta turma'}.
                    </p>
                  </div>
                )}
              </div>
              {/* Input */}
              <div className="border-t border-border p-3">
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    send()
                  }}
                >
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Mensagem para ${current?.name ?? ''}…`}
                    className="bg-secondary"
                  />
                  <Button type="submit" size="icon" disabled={!text.trim()} aria-label="Enviar">
                    <SendIcon className="size-4" />
                  </Button>
                </form>
              </div>
            </div>

            {/* Membros */}
            {showMembers && (
              <aside className="hidden w-56 shrink-0 flex-col border-l border-border lg:flex">
                <p className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Membros — {members?.length ?? 0}
                </p>
                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                  {members?.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px]">{initials(s.name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                    </div>
                  ))}
                  {(members?.length ?? 0) === 0 && (
                    <p className="px-2 py-2 text-xs text-muted-foreground">Sem membros nesta turma.</p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ChannelButton({
  active,
  icon: Icon,
  name,
  count,
  onClick,
}: {
  active: boolean
  icon: typeof HashIcon
  name: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="text-xs text-muted-foreground/70">{count}</span>
    </button>
  )
}
