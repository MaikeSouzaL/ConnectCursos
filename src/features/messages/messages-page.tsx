import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  HashIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  SearchIcon,
  SendIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAsync } from '@/hooks/use-async'
import { dmChannelId, messagesService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { BotaoAnexo, ChatImage, PreviaAnexo, useAnexo, useChatImages } from '@/features/messages/chat-image'
import { formatTime, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function MessagesPage() {
  const user = useAuth((s) => s.user)
  const [selected, setSelected] = useState('geral')
  const [reload, setReload] = useState(0)
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const anexo = useAnexo()
  const scrollRef = useRef<HTMLDivElement>(null)

  const isDm = selected.startsWith('dm:')

  const { data: channels } = useAsync(() => messagesService.channels(), [reload])
  const { data: messages } = useAsync(() => messagesService.list(selected), [selected, reload])
  const { data: members } = useAsync(() => messagesService.members(selected), [selected, reload])
  // Conversa direta recém-aberta ainda não aparece na lista de canais (sem mensagens).
  const { data: dmInfo } = useAsync(
    () => (isDm ? messagesService.directChannel(selected.slice(3)) : Promise.resolve(undefined)),
    [selected],
  )

  const current = channels?.find((c) => c.id === selected) ?? dmInfo ?? undefined
  const imageUrls = useChatImages(messages)
  const geral = channels?.find((c) => c.id === 'geral')
  const filterBySearch = (name: string) =>
    !search || name.toLowerCase().includes(search.toLowerCase())
  const turmas = useMemo(
    () => (channels ?? []).filter((c) => c.kind === 'turma' && filterBySearch(c.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, search],
  )
  const diretas = useMemo(
    () => (channels ?? []).filter((c) => c.kind === 'direto' && filterBySearch(c.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, search],
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  // Tempo real: novas mensagens no canal aberto recarregam a conversa.
  useEffect(() => {
    return messagesService.subscribe(selected, () => setReload((r) => r + 1))
  }, [selected])

  // Ao trocar de canal, fecha o painel de membros (no mobile ele cobre a conversa).
  useEffect(() => {
    setShowMembers(false)
  }, [selected])

  const send = async () => {
    const content = text.trim()
    if ((!content && !anexo.file) || !user || enviando) return
    setEnviando(true)
    try {
      const imagePath = anexo.file ? await messagesService.uploadImage(user.id, anexo.file) : undefined
      await messagesService.send(selected, { id: user.id, name: user.name, role: user.role }, content, imagePath)
      setText('')
      anexo.limpar()
      setReload((r) => r + 1)
    } catch (e) {
      toast.error('Não foi possível enviar', { description: (e as Error).message })
    } finally {
      setEnviando(false)
    }
  }

  /** Abre a conversa direta com um aluno da turma. */
  const openDm = (studentId: string) => {
    setSelected(dmChannelId(studentId))
    setShowMembers(false)
  }

  const destino =
    current?.kind === 'geral' ? 'todos os alunos' : current?.kind === 'direto' ? current.name : 'esta turma'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Avisos gerais, conversa por turma ou direto com um aluno.
        </p>
      </div>

      <div className="flex h-[calc(100dvh-13rem)] min-h-[420px] overflow-hidden rounded-xl border border-border bg-card">
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
                placeholder="Buscar turma ou aluno…"
                className="h-9 border-transparent bg-secondary pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-2">
            {geral && (
              <ChannelButton
                active={selected === 'geral'}
                icon={MegaphoneIcon}
                name={geral.name}
                count={geral.memberCount}
                onClick={() => setSelected('geral')}
              />
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
            {diretas.length > 0 && (
              <div>
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Conversas diretas
                </p>
                <div className="space-y-0.5">
                  {diretas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                        selected === c.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <Avatar className="size-6 shrink-0">
                        {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt="" />}
                        <AvatarFallback className="text-[9px]">{initials(c.name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Conversa */}
        <section className={cn('min-w-0 flex-1 flex-col', selected ? 'flex' : 'hidden sm:flex')}>
          <header className="flex items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
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
              <MegaphoneIcon className="size-4 shrink-0 text-muted-foreground" />
            ) : current?.kind === 'direto' ? (
              <Avatar className="size-7 shrink-0">
                {current.avatarUrl && <AvatarImage src={current.avatarUrl} alt="" />}
                <AvatarFallback className="text-[10px]">{initials(current.name)}</AvatarFallback>
              </Avatar>
            ) : (
              <HashIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{current?.name ?? '—'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {current?.kind === 'direto' ? 'Conversa direta' : (current?.courseName ?? '')}
              </p>
            </div>
            {current?.kind !== 'direto' && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 text-muted-foreground"
                onClick={() => setShowMembers((v) => !v)}
                aria-label={showMembers ? 'Fechar lista de alunos' : 'Ver alunos da turma'}
                aria-expanded={showMembers}
              >
                <UsersIcon className="size-4" />
                {current?.memberCount ?? 0}
              </Button>
            )}
          </header>

          <div className="relative flex min-h-0 flex-1">
            {/* Mensagens */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
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
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm font-medium">{m.authorName}</span>
                              <span className="text-[11px] text-muted-foreground">{formatTime(m.at)}</span>
                            </div>
                          )}
                          {m.content && (
                            <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{m.content}</p>
                          )}
                          {m.imagePath && <ChatImage path={m.imagePath} urls={imageUrls} />}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                    <MessagesSquareIcon className="size-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Comece a conversa</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Envie a primeira mensagem para {destino}.
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t border-border p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void send()
                  }}
                >
                  {anexo.preview && (
                    <PreviaAnexo preview={anexo.preview} enviando={enviando} onRemove={anexo.limpar} />
                  )}
                  <div className="flex items-center gap-2">
                    <BotaoAnexo inputRef={anexo.inputRef} onPick={anexo.setFile} disabled={enviando} />
                    <Input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={`Mensagem para ${current?.name ?? ''}…`}
                      className="bg-secondary"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="shrink-0"
                      disabled={(!text.trim() && !anexo.file) || enviando}
                      aria-label="Enviar"
                    >
                      <SendIcon className="size-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Membros — no mobile cobre a conversa; a partir de lg vira painel lateral. */}
            {showMembers && (
              <aside className="absolute inset-0 z-10 flex flex-col border-l border-border bg-card lg:static lg:w-56 lg:shrink-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Alunos — {members?.length ?? 0}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="lg:hidden"
                    onClick={() => setShowMembers(false)}
                    aria-label="Fechar lista de alunos"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
                <p className="px-4 pt-2 text-xs text-muted-foreground">Toque em um aluno para falar direto.</p>
                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                  {members?.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openDm(s.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
                    >
                      <Avatar className="size-7 shrink-0">
                        {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt="" />}
                        <AvatarFallback className="text-[10px]">{initials(s.name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                      <MessagesSquareIcon className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                  {(members?.length ?? 0) === 0 && (
                    <p className="px-2 py-2 text-xs text-muted-foreground">Sem alunos nesta turma.</p>
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
