import { Link } from 'react-router-dom'
import { ChevronRightIcon, ClockIcon, DoorOpenIcon, UsersIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAsync } from '@/hooks/use-async'
import { courseName, roomName, teachersService } from '@/data/services'
import { useAuth } from '@/features/auth/auth-store'
import { formatSchedule } from '@/lib/schedule'
import { GraduationCapIcon } from 'lucide-react'

export function ProfessorTurmasPage() {
  const teacherId = useAuth((s) => s.user?.linkedId ?? '')
  const { data, loading } = useAsync(() => teachersService.details(teacherId), [teacherId])

  if (loading || !data) {
    return <Skeleton className="h-64 w-full rounded-2xl" />
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Minhas turmas</h1>

      {data.classes.length > 0 ? (
        <div className="space-y-3">
          {data.classes.map((c) => (
            <Link key={c.id} to={`/professor/turmas/${c.id}`}>
              <Card className="transition-colors hover:border-primary/30">
                <CardContent className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{courseName(c.courseId)}</p>
                      <StatusBadge kind="class" value={c.status} />
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ClockIcon className="size-3" /> {formatSchedule(c.schedule)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DoorOpenIcon className="size-3" /> {roomName(c.roomId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="size-3" /> {c.studentIds.length} alunos
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={GraduationCapIcon} title="Sem turmas" description="Você ainda não tem turmas atribuídas." />
      )}
    </div>
  )
}
