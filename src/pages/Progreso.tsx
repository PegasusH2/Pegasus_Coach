import { useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAsyncData, useMacroPlans, useMeasurements, useMeasurementTypesCliente, useWeightEntries } from '@/hooks/useData'
import { calcularMacroPlan } from '@/lib/calculos'
import { useSession } from '@/lib/SessionContext'
import { deleteMeasurement } from '@/lib/supabase/measurementRepo'
import * as trackerMeasurementRepo from '@/lib/supabase/trackerMeasurementRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { PesoContenido } from './Peso'
import { MeasurementForm, type CampoMedicion } from '@/components/ui/MeasurementForm'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { formatFechaCorta, formatNumero, hoyIso } from '@/lib/format'
import { ArrowDown, ArrowUp, Minus, Pencil, Plus, Ruler, Trash2 } from 'lucide-react'
import type { ProgresoTab, Route } from '@/lib/nav'
import type { Measurement, TrackerMeasurementType } from '@/types'

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
  const { targetUserId } = useSession()
  const { data: weightEntries } = useWeightEntries()
  const { data: macroPlans } = useMacroPlans()
  const { data: measurements, refetch: refetchMeasurements } = useMeasurements()
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]['key']>('peso')
  const [editando, setEditando] = useState<Measurement | null>(null)

  async function borrarMedicion(id: string) {
    await deleteMeasurement(id)
    if (editando?.id === id) setEditando(null)
    await refetchMeasurements()
  }

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

      <div className="mb-3 flex gap-1 rounded-control bg-bg-panel p-1 w-fit">
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

      <div key={tab} className="tab-fade">
        {tab === 'peso' && <PesoContenido />}

        {tab === 'medidas' && (
          <div className="flex flex-col gap-2">
            {targetUserId && (
              <Card>
                <CardLabel>{editando ? 'Editar medición' : 'Registrar perímetros corporales'}</CardLabel>
                <MeasurementForm
                  key={editando?.id ?? 'nuevo'}
                  userId={targetUserId}
                  campos={MEDIDAS}
                  editing={editando ?? undefined}
                  onCancel={() => setEditando(null)}
                  onSaved={() => {
                    setEditando(null)
                    refetchMeasurements()
                  }}
                />
              </Card>
            )}
            <MedicionesTabla mediciones={mediciones} campos={MEDIDAS} onEditar={setEditando} onBorrar={borrarMedicion} destacarValores />
            <MedidasTrackerSection />
          </div>
        )}

        {tab === 'pliegues' && (
          <div className="flex flex-col gap-2">
            {targetUserId && (
              <Card>
                <CardLabel>{editando ? 'Editar medición' : 'Registrar pliegues cutáneos (7 sitios) y % graso'}</CardLabel>
                <MeasurementForm
                  key={editando?.id ?? 'nuevo'}
                  userId={targetUserId}
                  campos={PLIEGUES}
                  editing={editando ?? undefined}
                  onCancel={() => setEditando(null)}
                  onSaved={() => {
                    setEditando(null)
                    refetchMeasurements()
                  }}
                />
              </Card>
            )}
            <MedicionesTabla mediciones={mediciones} campos={PLIEGUES} onEditar={setEditando} onBorrar={borrarMedicion} />
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
    </div>
  )
}

function MedicionesTabla({
  mediciones,
  campos,
  onEditar,
  onBorrar,
  destacarValores = false,
}: {
  mediciones: Measurement[]
  campos: CampoMedicion[]
  onEditar: (m: Measurement) => void
  onBorrar: (id: string) => void
  /** Da más peso visual a los valores frente a las cabeceras — solo se activa desde la
   * pestaña Medidas (item 1 del rediseño); Pliegues sigue exactamente igual que antes. */
  destacarValores?: boolean
}) {
  const filas = [...(mediciones ?? [])].reverse()
  return (
    <Card>
      <CardLabel>Histórico</CardLabel>
      <div className="max-h-72 overflow-x-auto overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-left text-xs ${destacarValores ? 'text-text-muted' : 'text-text-secondary'}`}>
              <th className="py-1 pr-3">Fecha</th>
              {campos.map((c) => (
                <th key={c.key as string} className="py-1 pr-3">
                  {c.label}
                </th>
              ))}
              <th className="py-1 pr-3" />
            </tr>
          </thead>
          <tbody>
            {filas.map((m) => (
              <tr key={m.id} className="border-t border-bg-border">
                <td className="py-2 pr-3 text-text-secondary">{formatFechaCorta(m.fecha)}</td>
                {campos.map((c) => (
                  <td key={c.key as string} className={`py-2 pr-3 ${destacarValores ? 'font-semibold text-text-primary' : ''}`}>
                    {formatNumero((m as unknown as Record<string, number | null>)[c.key as string], 1)}
                  </td>
                ))}
                <td className="py-2 pr-1 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => onEditar(m)} className="text-text-muted hover:text-pegasus-red">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onBorrar(m.id)} className="text-text-muted hover:text-pegasus-red">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={campos.length + 2} className="py-6 text-center text-text-muted">
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

/** Sistema de medidas GENÉRICO del cliente en Pegasus Tracker (measurement_types/
 * measurements) — aparte del de arriba, propio de Nutrición (nutrition_measurement).
 * No se unifican (ver 03_SUPABASE_CONTEXT.md §6); se muestran ambos con etiquetas
 * claras. Nuevo con el control total del entrenador — antes sin código en Coach. */
function MedidasTrackerSection() {
  const { targetUserId } = useSession()
  const { data: tipos, refetch } = useMeasurementTypesCliente()
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaUnidad, setNuevaUnidad] = useState('cm')
  const [guardando, setGuardando] = useState(false)

  async function crearTipo() {
    if (!targetUserId || !nuevoNombre.trim()) return
    setGuardando(true)
    try {
      await trackerMeasurementRepo.createMeasurementType(targetUserId, { userId: targetUserId, name: nuevoNombre, unit: nuevaUnidad, enabled: true })
      setNuevoNombre('')
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card>
      <CardLabel>Medidas de Tracker (tipos propios del cliente)</CardLabel>
      <p className="mb-3 text-xs text-text-muted">
        Sistema aparte de las medidas de Nutrición de arriba — son los tipos de medida que el propio cliente define en Pegasus Tracker.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(tipos ?? []).map((t) => (
          <TipoMedidaTrackerCard key={t.id} tipo={t} onChange={refetch} />
        ))}
      </div>
      {(tipos ?? []).length === 0 && <p className="text-sm text-text-muted">Este cliente todavía no tiene ningún tipo de medida en Tracker.</p>}

      <div className="mt-2 flex items-end gap-2 border-t border-bg-border pt-2">
        <Field label="Nueva medida" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej. Cintura" />
        <Field label="Unidad" value={nuevaUnidad} onChange={(e) => setNuevaUnidad(e.target.value)} placeholder="cm" className="w-20" />
        <Button onClick={crearTipo} disabled={guardando || !nuevoNombre.trim()}>
          <span className="flex items-center gap-1.5">
            <Plus size={14} /> Añadir tipo
          </span>
        </Button>
      </div>
    </Card>
  )
}

/** Mini gráfica de tendencia, discreta — solo aparece con 2+ valores (con 0 o 1 no hay
 * tendencia que mostrar). Mismo color/estilo de línea que WeightChart/SimpleLine, sin
 * ejes ni tooltip: su único trabajo es responder "¿sube o baja?" de un vistazo. */
function MiniTendencia({ valores }: { valores: { fecha: string; value: number }[] }) {
  if (valores.length < 2) return null
  return (
    <div style={{ height: 28 }} className="mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={valores} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="value" stroke="#e8383d" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Antes una fila tipo "opción de configuración" (Cuello (cm)  Último: 34 cm · fecha) —
 * ahora una tarjeta de progreso: el valor es lo primero que se lee, no la fecha ni el
 * nombre. La variación se calcula igual que cambioPeso() en calculos.ts (última medición
 * frente a la primera) — mismo criterio ya usado en la app, no una lógica nueva. */
function TipoMedidaTrackerCard({ tipo, onChange }: { tipo: TrackerMeasurementType; onChange: () => void }) {
  const { data: valores, refetch } = useAsyncData(() => trackerMeasurementRepo.listMeasurementValues(tipo.id), [tipo.id])
  const [fecha, setFecha] = useState(hoyIso())
  const [valor, setValor] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  async function anadir() {
    const num = Number(valor)
    if (!Number.isFinite(num)) return
    await trackerMeasurementRepo.addMeasurementValue({ typeId: tipo.id, fecha, value: num, notas: '' })
    setValor('')
    await refetch()
  }

  async function borrarTipo() {
    await trackerMeasurementRepo.deleteMeasurementType(tipo.id)
    onChange()
  }

  const conValor = (valores ?? []).filter((v): v is typeof v & { value: number } => v.value != null)
  const primero = conValor[0] ?? null
  const ultimo = conValor[conValor.length - 1] ?? null
  const variacion = primero && ultimo && primero.id !== ultimo.id ? ultimo.value - primero.value : null

  return (
    <div className="rounded-control border border-bg-border bg-bg-panel/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          onClick={() => setAbierto((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary hover:text-pegasus-red"
        >
          <Ruler size={12} /> {tipo.name}
        </button>
        <div className="flex items-center gap-2">
          {ultimo && <span className="text-[11px] text-text-muted">{formatFechaCorta(ultimo.fecha)}</span>}
          {confirmandoBorrado ? (
            <span className="flex items-center gap-1 text-[11px]">
              <button onClick={borrarTipo} className="font-semibold text-pegasus-red hover:text-pegasus-redDark">
                Sí
              </button>
              <button onClick={() => setConfirmandoBorrado(false)} className="text-text-muted hover:text-text-secondary">
                No
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirmandoBorrado(true)} className="text-text-muted hover:text-pegasus-red" title="Eliminar tipo de medida">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {ultimo ? (
        <>
          <div className="text-2xl font-bold text-text-primary">
            {formatNumero(ultimo.value, 1)} <span className="text-sm font-medium text-text-muted">{tipo.unit}</span>
          </div>
          {variacion != null ? (
            <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
              {variacion > 0 ? <ArrowUp size={12} /> : variacion < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
              <span>{variacion === 0 ? 'Sin cambios' : `${variacion > 0 ? '+' : ''}${formatNumero(variacion, 1)} ${tipo.unit}`}</span>
              <span className="text-text-muted">respecto al inicio</span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-text-muted">Sin datos de comparación</div>
          )}
          <MiniTendencia valores={conValor} />
        </>
      ) : (
        <div className="py-2 text-sm text-text-muted">Sin mediciones</div>
      )}

      {abierto && (
        <div className="mt-3 flex items-end gap-2 border-t border-bg-border pt-3">
          <Field label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Field label={`Valor (${tipo.unit})`} type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
          <Button onClick={anadir} disabled={!valor}>
            Registrar
          </Button>
        </div>
      )}
    </div>
  )
}
