import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL, formatCompact } from '@/lib/format'
import type { CashFlowPoint } from '@/data/types'

export interface DonutSlice {
  name: string
  value: number
  color: string
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: DonutSlice }>
}) {
  if (!active || !payload?.length) return null
  const slice = payload[0]
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.payload.color }} />
        <span className="text-muted-foreground">{slice.name}</span>
        <span className="ml-auto font-medium tabular">{formatBRL(slice.value)}</span>
      </div>
    </div>
  )
}

const axisProps = {
  stroke: 'var(--muted-foreground)',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="capitalize text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-medium tabular">{formatBRL(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Fluxo de caixa: barras de entradas/saídas + linha de saldo acumulado. */
export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v: number) => formatCompact(v)} width={48} />
        <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
        <Bar dataKey="entradas" name="Entradas" fill="var(--chart-4)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="saidas" name="Saídas" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Line
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ r: 2.5, fill: 'var(--chart-1)' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/** Donut de composição (ex.: receita por origem). */
export function CompositionDonut({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const visible = data.filter((d) => d.value > 0)

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              strokeWidth={0}
            >
              {visible.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="font-display text-lg font-semibold tabular">{formatBRL(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="min-w-0 truncate text-muted-foreground">{d.name}</span>
            <span className="ml-auto shrink-0 font-medium tabular">{formatBRL(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
