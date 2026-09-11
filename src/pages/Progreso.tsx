import { useState } from 'react'
import { useAsyncData, useMeasurements, useMeasurementTypesCliente } from '@/hooks/useData'
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
import { Pencil, Plus, Ruler, Trash2 } from 'lucide-react'
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

export function Progreso({ tab, onNavigate }: { tab: ProgresoTab; onNavigate: (r: Route) => void }) {
  const { targetUserId, profile } = useSession()
  const esEntrenador = profile?.role === 'entrenador'
  const { data: measurements, refetch: refetchMeasurements } = useMeasurements()
  const [editando, setEditando] = useState<Measurement | null>(null)

  async function borrarMedicion(id: string) {
    await deleteMeasurement(id)
    if (editando?.id === id) setEditando(null)
    await refetchMeasurements()
  }

  const mediciones = measurements ?? []

  return (
    <div>
      {/* Sin cliente/entrenador esto siempre se ve dentro de la Ficha de cliente
          (Progreso), que ya trae su propio encabezado y pestañas — el título
          "Progreso" solo se muestra en la pantalla suelta del cliente. */}
      {!esEntrenador && <PageHeader title="Progreso" subtitle="Peso, medidas, pliegues y evolución general" />}

      <div className="mb-2 flex gap-1 rounded-control bg-bg-panel p-1 w-fit">
        {(
          [
            { key: 'peso', label: 'Peso' },
            { key: 'medidas', label: 'Medidas' },
            { key: 'pliegues', label: 'Pliegues' },
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
            {targetUserId && editando && (
              <Card>
                <CardLabel>Editar medición</CardLabel>
                <MeasurementForm
                  key={editando.id}
                  userId={targetUserId}
                  campos={MEDIDAS}
                  editing={editando}
                  onCancel={() => setEditando(null)}
                  onSaved={() => {
                    setEditando(null)
                    refetchMeasurements()
                  }}
                />
              </Card>
            )}
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(560px,max-content)_minmax(430px,1fr)] lg:items-start">
              {targetUserId && (
                <Card className="min-w-0">
                  <MedidasTrackerSection />
                </Card>
              )}
              <div className="min-w-0">
                <MedicionesTabla mediciones={mediciones} campos={MEDIDAS} onEditar={setEditando} onBorrar={borrarMedicion} destacarValores />
              </div>
            </div>
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
  const [pendientes, setPendientes] = useState<Record<string, string>>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [guardandoTodo, setGuardandoTodo] = useState(false)

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

  const hayPendientes = Object.values(pendientes).some((v) => v.trim() !== '')

  async function registrarTodo() {
    const entradas = Object.entries(pendientes).filter(([, v]) => v.trim() !== '' && Number.isFinite(Number(v)))
    if (entradas.length === 0) return
    setGuardandoTodo(true)
    try {
      await Promise.all(
        entradas.map(([typeId, v]) => trackerMeasurementRepo.addMeasurementValue({ typeId, fecha: hoyIso(), value: Number(v), notas: '' })),
      )
      setPendientes({})
      setRefreshKey((k) => k + 1)
    } finally {
      setGuardandoTodo(false)
    }
  }

  return (
    <>
      <CardLabel>Medidas</CardLabel>
      {(tipos ?? []).length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-[calc(100%-30px)] text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="whitespace-nowrap py-1 pr-5 font-medium">Medida</th>
                <th className="whitespace-nowrap py-1 pr-5 font-medium">Último valor</th>
                <th className="whitespace-nowrap py-1 pr-5 font-medium">Nuevo valor</th>
                <th className="whitespace-nowrap py-1 pr-1" />
              </tr>
            </thead>
            <tbody>
              {(tipos ?? []).map((t) => (
                <FilaMedidaTracker
                  key={`${t.id}-${refreshKey}`}
                  tipo={t}
                  onChange={refetch}
                  valor={pendientes[t.id] ?? ''}
                  onChangeValor={(v) => setPendientes((p) => ({ ...p, [t.id]: v }))}
                />
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex justify-end">
            <Button onClick={registrarTodo} disabled={!hayPendientes || guardandoTodo}>
              Registrar todo
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">Este cliente todavía no tiene ningún tipo de medida en Tracker.</p>
      )}

      <div className="mt-2 flex items-end gap-2 border-t border-bg-border pt-2">
        <Field label="Nueva medida" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej. Cintura" className="!w-56" />
        <Field label="Unidad" value={nuevaUnidad} onChange={(e) => setNuevaUnidad(e.target.value)} placeholder="cm" className="!w-24" />
        <Button onClick={crearTipo} disabled={guardando || !nuevoNombre.trim()}>
          <span className="flex items-center gap-1.5">
            <Plus size={14} /> Añadir tipo
          </span>
        </Button>
      </div>
    </>
  )
}

/** Antes una tarjeta de progreso por tipo de medida (una por columna en un grid) —
 * ahora una fila de tabla, igual que Histórico: cabe muchas más medidas sin scroll.
 * La variación se calcula igual que cambioPeso() en calculos.ts (última medición
 * frente a la primera) — mismo criterio ya usado en la app, no una lógica nueva. */
function FilaMedidaTracker({
  tipo,
  onChange,
  valor,
  onChangeValor,
}: {
  tipo: TrackerMeasurementType
  onChange: () => void
  valor: string
  onChangeValor: (v: string) => void
}) {
  const { data: valores, refetch } = useAsyncData(() => trackerMeasurementRepo.listMeasurementValues(tipo.id), [tipo.id])
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  async function anadir() {
    const num = Number(valor)
    if (!Number.isFinite(num)) return
    await trackerMeasurementRepo.addMeasurementValue({ typeId: tipo.id, fecha: hoyIso(), value: num, notas: '' })
    onChangeValor('')
    await refetch()
  }

  async function borrarTipo() {
    await trackerMeasurementRepo.deleteMeasurementType(tipo.id)
    onChange()
  }

  const conValor = (valores ?? []).filter((v): v is typeof v & { value: number } => v.value != null)
  const ultimo = conValor[conValor.length - 1] ?? null

  return (
    <tr className="border-t border-bg-border">
      <td className="whitespace-nowrap py-1.5 pr-5">
        <span className="flex items-center gap-1.5 font-medium text-text-primary">
          <Ruler size={12} className="text-text-muted" /> {tipo.name}
        </span>
      </td>
      <td className="whitespace-nowrap py-1.5 pr-5 text-text-secondary">
        {ultimo ? `${formatNumero(ultimo.value, 1)} ${tipo.unit}` : <span className="text-text-muted">Sin mediciones</span>}
      </td>
      <td className="whitespace-nowrap py-1.5 pr-5">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={valor}
            onChange={(e) => onChangeValor(e.target.value)}
            placeholder={tipo.unit}
            className="w-32 rounded-control border border-bg-border bg-bg-panel px-2 py-1 text-sm text-text-primary outline-none focus:border-pegasus-red"
          />
          <button
            onClick={anadir}
            disabled={!valor}
            className="text-xs font-semibold text-pegasus-red hover:text-pegasus-redDark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Registrar
          </button>
        </div>
      </td>
      <td className="whitespace-nowrap py-1.5 pr-1 text-right">
        {confirmandoBorrado ? (
          <span className="flex items-center justify-end gap-1 text-[11px]">
            <button onClick={borrarTipo} className="font-semibold text-pegasus-red hover:text-pegasus-redDark">
              Sí
            </button>
            <button onClick={() => setConfirmandoBorrado(false)} className="text-text-muted hover:text-text-secondary">
              No
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmandoBorrado(true)} className="text-text-muted hover:text-pegasus-red" title="Eliminar tipo de medida">
            <Trash2 size={13} />
          </button>
        )}
      </td>
    </tr>
  )
}
