import { useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMacroPlans, useMeasurements, useWeightEntries } from '@/hooks/useData'
import { calcularMacroPlan } from '@/lib/calculos'
import { Card, CardLabel } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { WeightChart } from '@/components/WeightChart'
import { MeasurementForm, type CampoMedicion } from '@/components/ui/MeasurementForm'
import { formatFechaCorta, formatNumero } from '@/lib/format'
import type { ProgresoTab, Route } from '@/lib/nav'
import type { Measurement } from '@shared/types'

const PLIEGUES: CampoMedicion[] = [
  { key: 'pectoral', label: 'Pectoral', suffix: 'mm' },
  { key: 'axila', label: 'Axila', suffix: 'mm' },
  { key: 'triceps', label: 'Tríceps', suffix: 'mm' },
  { key: 'subescapular', label: 'Subescapular', suffix: 'mm' },
  { key: 'abdomen', label: 'Abdomen', suffix: 'mm' },
  { key: 'suprailiaco', label: 'Suprailíaco', suffix: 'mm' },
  { key: 'cuadriceps', label: 'Cuádriceps', suffix: 'mm' },
  { key: 'porcentajeGraso', label: '% Graso', suffix: '%' },
]

const MEDIDAS: CampoMedicion[] = [
  { key: 'brazo', label: 'Brazo', suffix: 'cm' },
  { key: 'cintura', label: 'Cintura', suffix: 'cm' },
  { key: 'cadera', label: 'Cadera', suffix: 'cm' },
  { key: 'muslo', label: 'Muslo', suffix: 'cm' },
  { key: 'pecho', label: 'Pecho', suffix: 'cm' },
  { key: 'cuello', label: 'Cuello', suffix: 'cm' },
]

const METRICAS = [
  { key: 'peso', label: 'Peso' },
  { key: 'calorias', label: 'Calorías (promedio)' },
  { key: 'deficit', label: 'Déficit / superávit' },
  { key: 'proteina', label: 'Proteína ON' },
  { key: 'grasoPct', label: '% Graso' },
] as const

function SimpleLine({
  data,
  dataKey,
  unidad,
}: {
  data: { fecha: string; valor: number }[]
  dataKey: string
  unidad: string
}) {
  if (data.length === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-text-muted">Sin datos todavía</div>
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="fecha"
          tickFormatter={(v) => formatFechaCorta(v).replace(/ de \d+/, '')}
          tick={{ fill: '#6b6b6b', fontSize: 11 }}
          axisLine={{ stroke: '#262626' }}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b6b6b', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 10, fontSize: 12 }}
          labelFormatter={(v) => formatFechaCorta(String(v))}
          formatter={(value: number) => [`${formatNumero(value, 1)} ${unidad}`, '']}
        />
        <Line type="monotone" dataKey="valor" name={dataKey} stroke="#e8383d" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function Progreso({ tab, onNavigate }: { tab: ProgresoTab; onNavigate: (r: Route) => void }) {
  const { data: weightEntries } = useWeightEntries()
  const { data: macroPlans } = useMacroPlans()
  const { data: measurements, refetch: refetchMeasurements } = useMeasurements()
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]['key']>('peso')

  const pesos = weightEntries ?? []
  const planes = (macroPlans ?? []).map(calcularMacroPlan)
  const mediciones = measurements ?? []

  const serieEvolucion = useMemo(() => {
    switch (metrica) {
      case 'peso':
        return pesos.map((p) => ({ fecha: p.fecha, valor: p.pesoKg }))
      case 'calorias':
        return planes.map((p) => ({ fecha: p.fecha, valor: p.promedioCalorias }))
      case 'deficit':
        return planes.map((p) => ({ fecha: p.fecha, valor: p.superavitDeficit }))
      case 'proteina':
        return planes.filter((p) => p.proteinaOn !== null).map((p) => ({ fecha: p.fecha, valor: p.proteinaOn as number }))
      case 'grasoPct':
        return mediciones.filter((m) => m.porcentajeGraso !== null).map((m) => ({ fecha: m.fecha, valor: m.porcentajeGraso as number }))
    }
  }, [metrica, pesos, planes, mediciones])

  return (
    <div className="max-w-4xl">
      <PageHeader title="Progreso" subtitle="Peso, medidas, pliegues y evolución general" />

      <div className="mb-5 flex gap-1 rounded-control bg-bg-panel p-1 w-fit">
        {(
          [
            { key: 'peso', label: 'Peso' },
            { key: 'medidas', label: 'Medidas' },
            { key: 'pliegues', label: 'Pliegues' },
            { key: 'evolucion', label: 'Evolución' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => onNavigate({ section: 'progreso', progresoTab: t.key })}
            className={`rounded-[8px] px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'peso' && (
        <Card>
          <CardLabel>Evolución de peso</CardLabel>
          <WeightChart entries={pesos} height={300} />
        </Card>
      )}

      {tab === 'medidas' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardLabel>Registrar perímetros corporales</CardLabel>
            <MeasurementForm campos={MEDIDAS} onSaved={refetchMeasurements} />
          </Card>
          <MedicionesTabla mediciones={mediciones} campos={MEDIDAS} />
        </div>
      )}

      {tab === 'pliegues' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardLabel>Registrar pliegues cutáneos (7 sitios) y % graso</CardLabel>
            <MeasurementForm campos={PLIEGUES} onSaved={refetchMeasurements} />
          </Card>
          <MedicionesTabla mediciones={mediciones} campos={PLIEGUES} />
        </div>
      )}

      {tab === 'evolucion' && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardLabel>Evolución</CardLabel>
            <select
              value={metrica}
              onChange={(e) => setMetrica(e.target.value as (typeof METRICAS)[number]['key'])}
              className="rounded-control border border-bg-border bg-bg-panel px-3 py-1.5 text-sm text-text-primary outline-none"
            >
              {METRICAS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <SimpleLine data={serieEvolucion ?? []} dataKey={metrica} unidad="" />
        </Card>
      )}
    </div>
  )
}

function MedicionesTabla({ mediciones, campos }: { mediciones: Measurement[]; campos: CampoMedicion[] }) {
  const filas = [...(mediciones ?? [])].reverse()
  return (
    <Card>
      <CardLabel>Histórico</CardLabel>
      <div className="max-h-72 overflow-x-auto overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-secondary">
              <th className="py-1 pr-3">Fecha</th>
              {campos.map((c) => (
                <th key={c.key as string} className="py-1 pr-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((m) => (
              <tr key={m.id} className="border-t border-bg-border">
                <td className="py-2 pr-3 text-text-secondary">{formatFechaCorta(m.fecha)}</td>
                {campos.map((c) => (
                  <td key={c.key as string} className="py-2 pr-3">
                    {formatNumero((m as unknown as Record<string, number | null>)[c.key as string], 1)}
                  </td>
                ))}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={campos.length + 1} className="py-6 text-center text-text-muted">
                  Todavía no hay mediciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
