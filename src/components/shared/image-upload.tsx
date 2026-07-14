import { useRef, useState } from 'react'
import { Loader2Icon, UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Botão de "trocar imagem" — escolhe o arquivo e delega o envio.
 * Usado na foto do admin e na logo da instituição.
 */
export function ImageUploadButton({
  label = 'Enviar imagem',
  onPick,
  disabled,
  variant = 'outline',
}: {
  label?: string
  onPick: (file: File) => Promise<void>
  disabled?: boolean
  variant?: 'outline' | 'ghost'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)

  const escolher = async (file: File) => {
    setEnviando(true)
    try {
      await onPick(file)
    } finally {
      setEnviando(false)
      // Zera para permitir reenviar o MESMO arquivo depois de um erro.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void escolher(f)
        }}
      />
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={disabled || enviando}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
        {label}
      </Button>
    </>
  )
}
