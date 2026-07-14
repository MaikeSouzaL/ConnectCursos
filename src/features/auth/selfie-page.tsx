import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CameraIcon, CheckIcon, RotateCcwIcon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { homeFor } from '@/app/routes-config'
import { avatarService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'

/**
 * Selfie obrigatória no 1º acesso de professores e alunos: é a foto que
 * identifica a pessoa no balcão e nas listas de presença.
 * Tem fallback de upload de arquivo para quem negar a câmera.
 */
export function SelfiePage() {
  const { user, setAvatar } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCameraError('Não conseguimos acessar a câmera. Permita o acesso ou envie uma foto do aparelho.')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />

  /** Captura o quadro atual do vídeo num quadrado centralizado. */
  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const size = Math.min(video.videoWidth, video.videoHeight)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Espelha para o resultado bater com o que a pessoa vê na tela.
    ctx.translate(size, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      size,
      size,
    )
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        stopCamera()
        setShot({ blob, url: URL.createObjectURL(blob) })
      },
      'image/jpeg',
      0.9,
    )
  }

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem')
      return
    }
    stopCamera()
    setShot({ blob: file, url: URL.createObjectURL(file) })
  }

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url)
    setShot(null)
    startCamera()
  }

  const confirm = async () => {
    if (!shot || !user) return
    setSaving(true)
    try {
      const url = await avatarService.uploadSelfie(user.id, shot.blob, user.role, user.linkedId)
      setAvatar(url)
      toast.success('Foto salva!', { description: 'É por ela que vamos te reconhecer.' })
      navigate(homeFor(user.role), { replace: true })
    } catch (err) {
      toast.error('Não foi possível salvar a foto', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const firstName = user.name.split(' ')[0]

  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-black bg-brand-glow p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo showTagline />
        </div>
        <Card>
          <CardContent className="space-y-5 py-2">
            <div className="space-y-1 text-center">
              <h1 className="font-display text-xl font-bold">Olá, {firstName}! 📸</h1>
              <p className="text-sm text-muted-foreground">
                Tire uma selfie para o seu perfil. É com ela que a recepção vai te reconhecer.
              </p>
            </div>

            {/* Câmera / prévia */}
            <div className="relative mx-auto aspect-square w-52 overflow-hidden rounded-full bg-secondary ring-2 ring-border">
              {shot ? (
                <img src={shot.url} alt="Prévia da sua selfie" className="size-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="size-full -scale-x-100 object-cover"
                />
              )}
            </div>

            {cameraError && !shot && (
              <p className="text-center text-xs text-muted-foreground">{cameraError}</p>
            )}

            <div className="space-y-2">
              {shot ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={retake} disabled={saving}>
                    <RotateCcwIcon className="size-4" />
                    Tirar outra
                  </Button>
                  <Button className="flex-1" onClick={confirm} disabled={saving}>
                    <CheckIcon className="size-4" />
                    {saving ? 'Salvando…' : 'Usar esta foto'}
                  </Button>
                </div>
              ) : (
                <Button className="w-full" size="lg" onClick={capture} disabled={Boolean(cameraError)}>
                  <CameraIcon className="size-4" />
                  Tirar foto
                </Button>
              )}

              <Button variant="ghost" className="w-full" onClick={() => fileRef.current?.click()}>
                <UploadIcon className="size-4" />
                Enviar foto do aparelho
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={pickFile}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
