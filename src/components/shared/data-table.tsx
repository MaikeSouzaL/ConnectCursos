import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDir = 'asc' | 'desc'
export interface SortState {
  key: string
  dir: SortDir
}

/** Ordenação client-side genérica. Cicla: nenhuma → asc → desc → nenhuma. */
export function useSortable<T>(
  rows: T[],
  accessors: Record<string, (row: T) => string | number>,
  initial: SortState | null = null,
) {
  const [sort, setSort] = useState<SortState | null>(initial)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const acc = accessors[sort.key]
    if (!acc) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = acc(a)
      const bv = acc(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), 'pt-BR') * dir
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort])

  const toggle = (key: string) =>
    setSort((s) => {
      if (s?.key !== key) return { key, dir: 'asc' }
      if (s.dir === 'asc') return { key, dir: 'desc' }
      return null
    })

  return { sorted, sort, toggle }
}

/** Paginação client-side. */
export function usePagination<T>(rows: T[], initialSize = 10) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initialSize)
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / size))

  useEffect(() => {
    if (page > pageCount) setPage(1)
  }, [pageCount, page])

  const paged = useMemo(() => rows.slice((page - 1) * size, page * size), [rows, page, size])
  return { paged, page, setPage, size, setSize, pageCount, total }
}

/** Cabeçalho de coluna clicável com indicador de ordenação. */
export function SortableHead({
  label,
  sortKey,
  sort,
  onToggle,
  className,
}: {
  label: string
  sortKey: string
  sort: SortState | null
  onToggle: (key: string) => void
  className?: string
}) {
  const active = sort?.key === sortKey
  const Icon = !active ? ArrowUpDownIcon : sort.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon
  return (
    <TableHead className={className}>
      <button
        onClick={() => onToggle(sortKey)}
        className={cn(
          'group inline-flex items-center gap-1 transition-colors hover:text-foreground',
          active && 'text-foreground',
        )}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <Icon className={cn('size-3.5', active ? 'text-primary' : 'text-muted-foreground/50')} />
      </button>
    </TableHead>
  )
}

/** Barra de paginação: contagem, tamanho de página e navegação. */
export function TablePagination({
  page,
  setPage,
  size,
  setSize,
  pageCount,
  total,
  label = 'itens',
}: {
  page: number
  setPage: (p: number) => void
  size: number
  setSize: (s: number) => void
  pageCount: number
  total: number
  label?: string
}) {
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, total)
  return (
    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        <span className="tabular font-medium text-foreground">
          {from}–{to}
        </span>{' '}
        de {total} {label}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Por página</span>
          <Select
            value={String(size)}
            onValueChange={(v) => {
              setSize(Number(v))
              setPage(1)
            }}
          >
            <SelectTrigger size="sm" className="w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-[4rem] text-center text-sm tabular text-muted-foreground">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage(Math.min(pageCount, page + 1))}
            disabled={page >= pageCount}
            aria-label="Próxima página"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
