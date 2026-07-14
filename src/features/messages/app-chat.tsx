import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  BuildingIcon,
  ChevronRightIcon,
  HashIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  SendIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/use-async'
import { messagesService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { formatTime, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Chat mobile (lista de canais ↔ conversa) usado nos apps do aluno e do professor. */
export function AppChat() {
  const user = useAuth((s) => s.user)
  const [selected, setSelected] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: channels, loading } = useAsync(
    () => (user ? messagesService.channelsFor(user.role, user.linkedId) : Promise.resolve([])),
    [user?.id, reload],
  )
  const { data: messages } = useAsync(
    () => (selected ? messagesService.list(selected) : Promise.resolve([])),
    [selected, reload],
  )

  const current = useMemo(() => channels?.find((c) => c.id === selected), [channels, selected])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  // Tempo real: novas mensagens no canal aberto recarregam a conversa.
  useEffect(() => {
    if (!selected) return
    return messagesService.subscribe(selected, () => setReload((r) => r + 1))
  }, [selected])

  const send = async () => {
    const content = text.trim()
    if (!content || !user || !selected) return
    await messagesService.send(selected, { id: user.id, name: user.name, role: user.role }, content)
    setText('')
    setReload((r) => r + 1)
  }

  // ——— Lista de canais ———
  if (!selected) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Mensagens</h1>
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : channels && channels.length > 0 ? (
          <div className="space-y-2">
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30"
              >
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                    c.kind === 'geral'
                      ? 'bg-primary/10 text-primary'
                      : c.kind === 'direto'
                        ? 'bg-info/10 text-info'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {c.kind === 'geral' ? (
                    <MegaphoneIcon className="size-5" />
                  ) : c.kind === 'direto' ? (
                    <BuildingIcon className="size-5" />
                  ) : (
                    <HashIcon className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.kind === 'geral'
                      ? 'Avisos gerais'
                      : c.kind === 'direto'
                        ? 'Fale direto com a secretaria'
                        : `${c.courseName} · ${c.memberCount} membros`}
                  </p>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon={MessagesSquareIcon} title="Sem canais" description="Você ainda não está em nenhum canal." />
        )}
      </div>
    )
  }

  // ——— Conversa ———
  return (
    <div className="flex h-[calc(100dvh-12rem)] flex-col">
      <header className="flex items-center gap-2 pb-3">
        <Button variant="ghost" size="icon-sm" onClick={() => setSelected(null)} aria-label="Voltar aos canais">
          <ArrowLeftIcon className="size-5" />
        </Button>
        {current?.kind === 'geral' ? (
          <MegaphoneIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : current?.kind === 'direto' ? (
          <BuildingIcon className="size-4 shrink-0 text-info" />
        ) : (
          <HashIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{current?.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {current?.kind === 'direto' ? 'Conversa direta' : `${current?.memberCount} membros`}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-3">
        {messages && messages.length > 0 ? (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const mine = m.authorId === user?.id
            const grouped =
              prev && prev.authorId === m.authorId && new Date(m.at).getTime() - new Date(prev.at).getTime() < 5 * 60_000
            return (
              <div key={m.id} className={cn('flex gap-2.5', grouped && '-mt-3')}>
                <div className="w-8 shrink-0">
                  {!grouped && (
                    <Avatar className="size-8">
                      <AvatarFallback className={cn('text-[10px]', mine ? 'bg-primary/15 text-primary' : '')}>
                        {initials(m.authorName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{mine ? 'Você' : m.authorName}</span>
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
            <MessagesSquareIcon className="size-9 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem…"
          className="bg-secondary"
        />
        <Button type="submit" size="icon" disabled={!text.trim()} aria-label="Enviar">
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  )
}
