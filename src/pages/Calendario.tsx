// Calendario — agenda de revisiones y entrenos presenciales del entrenador.
// Reutiliza por completo el modelo Review/nutrition_review ya existente (ver
// supabase/migrations/0013_calendario_tipo_revision.sql): esta pantalla solo
// pinta esos mismos eventos en una vista de mes en vez de una tabla plana, y
// permite crear uno nuevo para cualquier cliente vinculado.
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardCheck, Dumbbell } from 'lucide-react'
import { useAsyncData } from '@/hooks/useData'
import { useSession } from '@/lib/SessionContext'
import { createReview, listReviewsByTrainer, updateReviewEstado } from '@/lib/supabase/reviewRepo'
import { listAsTrainer } from '@/lib/supabase/trainerRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { hoyIso } from '@/lib/format'
import type { EstadoRevision, Review, TipoRevision } from '@/types'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** Celdas del mes (año/mes en base 0) — null para el relleno antes del día 1,
 * ISO 'YYYY-MM-DD' para cada día real. Semana de lunes a domingo. */
function celdasDelMes(year: number, month: number): (string | null)[] {
  const primerDia = new Date(year, month, 1)
  const ultimoDia = new Date(year, month + 1, 0).getDate()
  const offset = (primerDia.getDay() + 6) % 7 // getDay(): 0=domingo -> queremos 0=lunes
  const celdas: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= ultimoDia; d++) {
    celdas.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return celdas
}

export function Calendario() {
  const { session } = useSession()
  const trainerId = session?.user.id ?? ''
  const hoy = new Date()
  const [year, setYear] = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth())
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)

  const { data: revisiones, refetch } = useAsyncData(() => listReviewsByTrainer(trainerId), [trainerId])
  const { data: links } = useAsyncData(() => listAsTrainer(trainerId), [trainerId])
  const clientes = (links ?? []).filter((l) => l.status === 'accepted')

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, Review[]>()
    for (const r of revisiones ?? []) {
      const lista = mapa.get(r.fechaProgramada) ?? []
      lista.push(r)
      mapa.set(r.fechaProgramada, lista)
    }
    return mapa
  }, [revisiones])

  const celdas = celdasDelMes(year, month)
  const hoyIsoStr = hoyIso()

  function cambiarMes(delta: number) {
    const nuevo = new Date(year, month + delta, 1)
    setYear(nuevo.getFullYear())
    setMonth(nuevo.getMonth())
    setDiaSeleccionado(null)
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Calendario" subtitle="Agenda de revisiones y entrenos presenciales" />

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardLabel>{`${MESES[month]} ${year}`}</CardLabel>
          <div className="flex items-center gap-1">
            <button onClick={() => cambiarMes(-1)} className="rounded-control p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary">
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                setYear(hoy.getFullYear())
                setMonth(hoy.getMonth())
              }}
              className="rounded-control px-2 py-1 text-xs font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              Hoy
            </button>
            <button onClick={() => cambiarMes(1)} className="rounded-control p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-muted">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celdas.map((fecha, i) => {
            if (!fecha) return <div key={`vacio-${i}`} />
            const eventos = eventosPorDia.get(fecha) ?? []
            const esHoy = fecha === hoyIsoStr
            const seleccionado = fecha === diaSeleccionado
            return (
              <button
                key={fecha}
                onClick={() => setDiaSeleccionado(fecha)}
                className={`flex min-h-20 flex-col items-start gap-1 rounded-control border p-1.5 text-left transition-colors ${
                  seleccionado ? 'border-pegasus-red bg-pegasus-redSoft' : 'border-bg-border hover:bg-bg-hover'
                }`}
              >
                <span className={`text-xs ${esHoy ? 'font-bold text-pegasus-red' : 'text-text-secondary'}`}>{Number(fecha.slice(-2))}</span>
                <div className="flex w-full flex-col gap-0.5">
                  {eventos.slice(0, 2).map((r) => (
                    <span
                      key={r.id}
                      className={`flex items-center gap-1 truncate rounded-[4px] px-1 py-0.5 text-[10px] ${
                        r.estado === 'pendiente'
                          ? 'bg-pegasus-redSoft text-pegasus-red'
                          : r.estado === 'recibida'
                            ? 'bg-amber-400/15 text-amber-400'
                            : 'bg-emerald-400/15 text-emerald-400'
                      }`}
                    >
                      {r.tipo === 'entreno' ? <Dumbbell size={9} className="shrink-0" /> : <ClipboardCheck size={9} className="shrink-0" />}
                      <span className="truncate">{r.clienteNombre || 'Cliente'}</span>
                    </span>
                  ))}
                  {eventos.length > 2 && <span className="text-[10px] text-text-muted">+{eventos.length - 2} más</span>}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {diaSeleccionado && (
        <PanelDia
          fecha={diaSeleccionado}
          eventos={eventosPorDia.get(diaSeleccionado) ?? []}
          clientes={clientes}
          trainerId={trainerId}
          onChange={refetch}
        />
      )}
    </div>
  )
}

function PanelDia({
  fecha,
  eventos,
  clientes,
  trainerId,
  onChange,
}: {
  fecha: string
  eventos: Review[]
  clientes: { clientId: string; otroNombre?: string | null; otroEmail?: string | null }[]
  trainerId: string
  onChange: () => void
}) {
  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState<TipoRevision>('revision')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [year, month, day] = fecha.split('-').map(Number)
  const fechaLabel = new Date(year, month - 1, day).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  async function crear() {
    if (!clienteId) return
    setGuardando(true)
    try {
      await createReview({ trainerId, clientId: clienteId, tipo, fechaProgramada: fecha, estado: 'pendiente', fechaRecepcion: null, notas: notas || null })
      setClienteId('')
      setNotas('')
      await onChange()
    } finally {
      setGuardando(false)
    }
  }

  async function avanzarEstado(r: Review) {
    const siguiente: EstadoRevision = r.estado === 'pendiente' ? 'recibida' : 'revisada'
    await updateReviewEstado(r.id, siguiente, hoyIso())
    await onChange()
  }

  return (
    <Card className="mt-4">
      <CardLabel>{fechaLabel}</CardLabel>

      <div className="flex flex-col gap-2">
        {eventos.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-control border border-bg-border p-3 text-sm">
            <div className="flex items-center gap-2">
              {r.tipo === 'entreno' ? <Dumbbell size={14} className="text-text-muted" /> : <ClipboardCheck size={14} className="text-text-muted" />}
              <div>
                <div className="font-medium">{r.clienteNombre || 'Cliente'}</div>
                <div className="text-xs text-text-muted">{r.tipo === 'entreno' ? 'Entreno presencial' : 'Revisión'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.estado === 'pendiente'
                    ? 'bg-pegasus-redSoft text-pegasus-red'
                    : r.estado === 'recibida'
                      ? 'bg-amber-400/15 text-amber-400'
                      : 'bg-emerald-400/15 text-emerald-400'
                }`}
              >
                {r.estado === 'pendiente' ? 'Pendiente' : r.estado === 'recibida' ? 'Recibida' : 'Revisada'}
              </span>
              {r.estado !== 'revisada' && (
                <Button variant="ghost" onClick={() => avanzarEstado(r)}>
                  {r.estado === 'pendiente' ? 'Marcar recibida' : 'Marcar revisada'}
                </Button>
              )}
            </div>
          </div>
        ))}
        {eventos.length === 0 && <p className="text-sm text-text-muted">Sin eventos programados este día.</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-bg-border pt-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Cliente</span>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
          >
            <option value="">— elegir cliente —</option>
            {clientes.map((c) => (
              <option key={c.clientId} value={c.clientId}>
                {c.otroNombre || c.otroEmail || 'Cliente'}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Tipo</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRevision)}
            className="rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
          >
            <option value="revision">Revisión</option>
            <option value="entreno">Entreno presencial</option>
          </select>
        </label>
        <Field label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. Peso + medidas" />
        <Button onClick={crear} disabled={guardando || !clienteId}>
          Programar
        </Button>
      </div>
    </Card>
  )
}
