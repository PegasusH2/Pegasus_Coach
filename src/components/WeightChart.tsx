import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WeightEntry } from '@shared/types'
import { formatFechaCorta } from '@/lib/format'

export function WeightChart({ entries, height = 220 }: { entries: WeightEntry[]; height?: number }) {
  const data = [...entries]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((e) => ({ fecha: e.fecha, peso: e.pesoKg }))

  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-text-muted">
        Sin registros de peso todavía
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="fecha"
          tickFormatter={(v) => formatFechaCorta(v).replace(/ de \d+/, '')}
          tick={{ fill: '#6b6b6b', fontSize: 11 }}
          axisLine={{ stroke: '#262626' }}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#6b6b6b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 10, fontSize: 12 }}
          labelFormatter={(v) => formatFechaCorta(String(v))}
          formatter={(value: number) => [`${value} kg`, 'Peso']}
        />
        <Line type="monotone" dataKey="peso" stroke="#e8383d" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
