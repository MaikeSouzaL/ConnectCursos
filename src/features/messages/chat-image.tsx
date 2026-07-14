import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Loader2Icon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { messagesService } from '@/data/services'
import type { Message } from '@/data/types'

/**
 * Resolve as URLs das imagens das mensagens.
 *
 * O bucket do chat é privado: a mensagem guarda o caminho e a URL é assinada
 * na hora. Assina em lote e só quando a lista de caminhos muda, senão cada
 * render refaria a chamada.
 */
export function useChatImages(messages: Message[] | undefined) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const paths = (messages ?? []).map((m) => m.imagePath).filter((p): p is string => !!p)
  const chave = paths.join('|')

  useEffect(() => {
    if (!paths.length) {
      setUrls(new Map())
      return
    }
    let vivo = true
    void messagesService.imageUrls(paths).then((m) => {
      if (vivo) setUrls(m)
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return urls
}

/** Imagem dentro da bolha da mensagem. Abre em tamanho cheio ao clicar. */
export function ChatImage({ path, urls }: { path: string; urls: Map<string, string> }) {
  const url = urls.get(path)
  const [aberta, setAberta] = useState(false)

  if (!url) {
    return <div className="mt-1.5 h-40 w-full max-w-[260px] animate-pulse rounded-xl bg-secondary" />
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="mt-1.5 block overflow-hidden rounded-xl border border-border transition-opacity hover:opacity-90"
      >
        <img
          src={url}
          alt="Imagem enviada na conversa"
          loading="lazy"
          className="max-h-[260px] w-auto max-w-full object-cover"
        />
      </button>

      {aberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAberta(false)}
          role="dialog"
          aria-modal="true"
        >
          <img src={url} alt="Imagem enviada na conversa" className="max-h-full max-w-full object-contain" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/10"
            aria-label="Fechar imagem"
          >
            <XIcon className="size-5" />
          </Button>
        </div>
      )}
    </>
  )
}

/** Estado do anexo do compositor: escolher, pré-visualizar e limpar. */
export function useAnexo() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url) // senão o blob vaza a cada troca
  }, [file])

  const limpar = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return { inputRef, file, preview, setFile, limpar }
}

/** Botão de anexar + input escondido. */
export function BotaoAnexo({
  inputRef,
  onPick,
  disabled,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  onPick: (f: File) => void
  disabled?: boolean
}) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label="Anexar imagem"
      >
        <ImageIcon className="size-4" />
      </Button>
    </>
  )
}

/** Tira de pré-visualização acima do campo de texto. */
export function PreviaAnexo({
  preview,
  enviando,
  onRemove,
}: {
  preview: string
  enviando: boolean
  onRemove: () => void
}) {
  return (
    <div className="relative mb-2 inline-block">
      <img src={preview} alt="Prévia do anexo" className="h-20 w-auto rounded-lg border border-border object-cover" />
      {enviando ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
          <Loader2Icon className="size-5 animate-spin text-white" />
        </div>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover anexo"
          className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-secondary text-foreground ring-1 ring-border"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  )
}
