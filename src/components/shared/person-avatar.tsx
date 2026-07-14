import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

/**
 * Foto da pessoa (a selfie do 1º acesso). Cai nas iniciais do nome enquanto
 * não houver foto — ou se a imagem falhar ao carregar.
 */
export function PersonAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: {
  name: string
  src?: string
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name} className="object-cover" />}
      <AvatarFallback className={fallbackClassName}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
