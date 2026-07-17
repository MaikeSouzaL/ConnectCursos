import { useMemo, useState } from 'react'
import {
  BookOpenIcon,
  ClockIcon,
  FolderKanbanIcon,
  GraduationCapIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { ExcluirCadastro } from '@/components/shared/excluir-cadastro'
import { ReativarBotao } from '@/components/shared/reativar-botao'
import { NewCourseDialog } from '@/features/courses/new-course-dialog'
import { useAsync } from '@/hooks/use-async'
import { coursesService } from '@/data/services'
import { formatBRL, formatNumber } from '@/lib/format'
import type { CourseWithStats } from '@/data/services'

const ALL_CATEGORIES = 'todas'

function CourseCard({ course, onSaved }: { course: CourseWithStats; onSaved: () => void }) {
  return (
    <Card className="group gap-4 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2 px-5">
        <div
          className="flex size-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in oklab, ${course.color} 18%, transparent)`,
            color: course.color,
          }}
        >
          <BookOpenIcon className="size-5" />
        </div>
        <div className="flex items-start gap-1.5">
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge kind="course" value={course.status} />
            <Badge variant="secondary">{course.category}</Badge>
          </div>
          {course.status === 'inativo' && (
            <ReativarBotao
              tipo="curso"
              iconOnly
              onReativar={async () => {
                await coursesService.update(course.id, { status: 'ativo' })
              }}
              onConcluido={onSaved}
            />
          )}
          <NewCourseDialog
            course={course}
            onSaved={onSaved}
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Editar ${course.name}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <PencilIcon className="size-4" />
              </Button>
            }
          />
          <ExcluirCadastro
            tipo="curso"
            nome={course.name}
            onExcluir={() => coursesService.remove(course.id)}
            onInativar={async () => {
              await coursesService.update(course.id, { status: 'inativo' })
            }}
            onConcluido={onSaved}
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Excluir ${course.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
              </Button>
            }
          />
        </div>
      </div>

      <div className="space-y-1 px-5">
        <h3 className="font-display text-lg font-semibold leading-snug">{course.name}</h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <GraduationCapIcon className="size-3.5 shrink-0" />
          <span className="truncate">{course.teacherName}</span>
        </p>
      </div>

      <p className="line-clamp-2 px-5 text-sm text-muted-foreground">{course.description}</p>

      <Separator />

      <div className="space-y-3 px-5">
        <p className="tabular">
          <span className="font-display text-2xl font-semibold tracking-tight">
            {formatBRL(course.priceMonthly)}
          </span>
          <span className="ml-1 text-sm text-muted-foreground">/mês</span>
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ClockIcon className="size-3.5 shrink-0" />
            {course.durationMonths} {course.durationMonths === 1 ? 'mês' : 'meses'}
          </span>
          <span className="flex items-center gap-1.5">
            <LayersIcon className="size-3.5 shrink-0" />
            {course.workloadHours}h
          </span>
          <span className="flex items-center gap-1.5">
            <FolderKanbanIcon className="size-3.5 shrink-0" />
            {course.classesCount} {course.classesCount === 1 ? 'turma' : 'turmas'}
          </span>
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-3.5 shrink-0" />
            {course.studentsCount} {course.studentsCount === 1 ? 'aluno' : 'alunos'}
          </span>
        </div>
      </div>
    </Card>
  )
}

export function CoursesPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(ALL_CATEGORIES)
  const [reload, setReload] = useState(0)

  const { data: allCourses, loading: statsLoading } = useAsync(
    () => coursesService.list(''),
    [reload],
  )
  const { data: courses, loading } = useAsync(
    () => coursesService.list(search),
    [search, reload],
  )

  const categories = useMemo(
    () => Array.from(new Set((allCourses ?? []).map((c) => c.category))).sort(),
    [allCourses],
  )

  const filtered = useMemo(
    () => (category === ALL_CATEGORIES ? courses : courses?.filter((c) => c.category === category)),
    [courses, category],
  )

  const totalCourses = allCourses?.length ?? 0
  const activeCourses = allCourses?.filter((c) => c.status === 'ativo').length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        description="Catálogo de cursos, turmas e mensalidades da instituição."
        actions={
          <NewCourseDialog
            onSaved={() => setReload((r) => r + 1)}
            trigger={
              <Button size="sm">
                <PlusIcon className="size-4" />
                Novo curso
              </Button>
            }
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {statsLoading || !allCourses ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Total de cursos"
              value={formatNumber(totalCourses)}
              icon={BookOpenIcon}
              accent="gold"
            />
            <StatCard
              label="Cursos ativos"
              value={formatNumber(activeCourses)}
              icon={GraduationCapIcon}
              accent="success"
            />
            <StatCard
              label="Categorias"
              value={formatNumber(categories.length)}
              icon={FolderKanbanIcon}
              accent="info"
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou categoria…"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[318px] rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} onSaved={() => setReload((r) => r + 1)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpenIcon}
          title="Nenhum curso encontrado"
          description="Ajuste os filtros ou cadastre um novo curso."
        />
      )}

      {filtered && filtered.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'curso' : 'cursos'}
        </p>
      )}
    </div>
  )
}
