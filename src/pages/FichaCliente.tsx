import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import {
  useActiveMacroPlan,
  useLinkCliente,
  useMeasurements,
  usePaymentsCliente,
  useReviewsCliente,
  useTargetProfile,
  useWeightEntries,
} from '@/hooks/useData'
import { useSession } from '@/lib/SessionContext'
import { createReview, updateReviewEstado } from '@/lib/supabase/reviewRepo'
import { createPayment } from '@/lib/supabase/paymentRepo'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardLabel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TipoNutricionCard } from '@/components/ui/TipoNutricionCard'
import { Macros } from './Macros'
import { Peso } from './Peso'
import { Progreso } from './Progreso'
import { EntrenamientoCliente } from './EntrenamientoCliente'
import { WeightChart } from '@/components/WeightChart'
import { formatFechaCorta, formatFechaRelativa, formatNumero, hoyIso } from '@/lib/format'
import { calcularEdad, calcularMacroPlan } from '@/lib/calculos'
import { rolLabel, sexoLabel } from '@/lib/supabase/profileRepo'
import type { FichaTab, ProgresoTab, Route } from '@/lib/nav'
import type { EstadoRevision } from '@/types'

const TABS: { key: FichaTab; label: string }[] = [
  { key: 'datos', label: 'Datos' },
  { key: 'macros', label: 'Nutrición' },
  { key: 'peso', label: 'Peso' },
  { key: 'progreso', label: 'Progreso' },
  { key: 'entrenamiento', label: 'Entrenamiento' },
  { key: 'revisiones', label: 'Revisiones' },
  { key: 'pagos', label: 'Pagos' },
]

export function FichaCliente({ tab, onNavigate }: { tab: FichaTab; onNavigate: (r: Route) => void }) {
  const { clienteActivo, setClienteActivo } = useSession()
  const { data: perfilCliente, refetch: refetchPerfilCliente } = useTargetProfile()
  const [progresoTab, setProgresoTab] = useState<ProgresoTab>('evolucion')

  function volver() {
    setClienteActivo(null)
    onNavigate({ section: 'inicio' })
  }

  if (!clienteActivo) {
    volver()
    return null
  }

  return (
    <div className="max-w-5xl">
      <button onClick={volver} className="mb-4 flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={15} /> Volver a mis clientes
      </button>

      <div className="mb-6 flex items-center gap-3">
        <Avatar nombre={clienteActivo.nombre} size={48} />
        <div>
          <h1 className="text-xl font-bold">{clienteActivo.nombre}</h1>
          {perfilCliente?.email && <p className="text-sm text-text-secondary">{perfilCliente.email}</p>}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1 rounded-control bg-bg-panel p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onNavigate({ section: 'ficha', fichaTab: t.key })}
            className={`rounded-[8px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="tab-fade">
        {tab === 'datos' && <DatosTab />}
        {tab === 'macros' && perfilCliente && (
          <div className="flex flex-col gap-4">
            <TipoNutricionCard
              userId={clienteActivo.id}
              tipoActual={perfilCliente.tipoDieta}
              distingueDiasActual={perfilCliente.dietaCerradaDistingueDias}
              bloqueado={false}
              nombreCliente={clienteActivo.nombre}
              onGuardado={refetchPerfilCliente}
            />
            <Macros key={perfilCliente.tipoDieta} />
          </div>
        )}
        {tab === 'peso' && <Peso />}
        {tab === 'progreso' && <Progreso tab={progresoTab} onNavigate={(r) => setProgresoTab(r.progresoTab ?? 'evolucion')} />}
        {tab === 'entrenamiento' && <EntrenamientoCliente />}
        {tab === 'revisiones' && <RevisionesTab />}
        {tab === 'pagos' && <PagosTab />}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function DatosTab() {
  const { data: perfil } = useTargetProfile()
  const { data: pesos } = useWeightEntries()
  const { data: mediciones } = useMeasurements()
  const { data: planActivo } = useActiveMacroPlan()
  const { data: link } = useLinkCliente()
  if (!perfil) return <Card>Cargando…</Card>

  // perfil.pesoInicial/fechaInicio son un valor declarado a mano (Ajustes >
  // Perfil) que casi nunca rellena un cliente que solo usa Tracker — si no
  // están, se usa el primer registro real de peso (mismo dato que ya
  // muestra la pestaña Peso como "Inicial") en vez de dejarlo en blanco.
  const ordenPesos = pesos && pesos.length > 0 ? [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)) : []
  const primerPeso = ordenPesos[0] ?? null
  const ultimoPeso = ordenPesos[ordenPesos.length - 1] ?? null
  const pesoInicial = perfil.pesoInicial ?? primerPeso?.pesoKg ?? null
  const fechaInicio = perfil.fechaInicio ?? primerPeso?.fecha ?? null
  const pesoActual = ultimoPeso?.pesoKg ?? pesoInicial

  const ultimaMedicion =
    mediciones && mediciones.length > 0 ? [...mediciones].sort((a, b) => b.fecha.localeCompare(a.fecha))[0] : null

  const edad = calcularEdad(perfil.fechaNacimiento)

  // Objetivos calóricos: se reutiliza tal cual el plan de macros activo (si el
  // cliente usa Macros flexibles) — no es un sistema nuevo, solo un resumen.
  const macroCalculado = planActivo && perfil.tipoDieta === 'macros' ? calcularMacroPlan(planActivo) : null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Stat label="Peso actual" value={pesoActual != null ? `${formatNumero(pesoActual, 1)} kg` : '—'} />
          <Stat label="Altura" value={perfil.altura != null ? `${formatNumero(perfil.altura, 0)} cm` : '—'} />
          <Stat
            label="% graso"
            value={ultimaMedicion?.porcentajeGraso != null ? `${formatNumero(ultimaMedicion.porcentajeGraso, 1)} %` : '—'}
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardLabel>Información personal</CardLabel>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Nombre" value={perfil.nombre} />
            <Stat label="Tipo de cuenta" value={rolLabel(perfil.role)} />
            <Stat label="Edad" value={edad != null ? `${edad} años` : '—'} />
            <Stat label="Sexo" value={sexoLabel(perfil.sexo) ?? '—'} />
            <Stat label="Email" value={perfil.email ?? '—'} />
            <Stat label="Cliente desde" value={fechaInicio ? formatFechaCorta(fechaInicio) : '—'} />
          </div>
        </Card>

        <Card>
          <CardLabel>Datos físicos</CardLabel>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Peso inicial" value={pesoInicial != null ? `${formatNumero(pesoInicial, 1)} kg` : '—'} />
            <Stat label="Peso actual" value={pesoActual != null ? `${formatNumero(pesoActual, 1)} kg` : '—'} />
            <Stat label="Última medición" value={ultimaMedicion ? formatFechaCorta(ultimaMedicion.fecha) : '—'} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {macroCalculado && (
          <Card>
            <CardLabel>Objetivos calóricos</CardLabel>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Stat label="Normocalórico" value={`${formatNumero(planActivo!.normocalorico, 0)} kcal`} />
              <Stat label="Promedio actual" value={`${formatNumero(macroCalculado.promedioCalorias, 0)} kcal`} />
              <Stat
                label="Superávit/Déficit"
                value={`${macroCalculado.superavitDeficit >= 0 ? '+' : ''}${formatNumero(macroCalculado.superavitDeficit, 0)} kcal`}
              />
            </div>
          </Card>
        )}

        {link && (
          <Card>
            <CardLabel>Entrenador</CardLabel>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Stat label="Vinculado desde" value={formatFechaCorta(link.createdAt.slice(0, 10))} />
              <Stat label="Estado" value={link.status === 'accepted' ? 'Activo' : link.status === 'pending' ? 'Pendiente' : 'Revocado'} />
            </div>
          </Card>
        )}
      </div>

      <Card>
        <CardLabel>Evolución del peso</CardLabel>
        <WeightChart entries={pesos ?? []} height={200} />
      </Card>
    </div>
  )
}

function RevisionesTab() {
  const { session, clienteActivo } = useSession()
  const { data: revisiones, refetch } = useReviewsCliente()
  const [fecha, setFecha] = useState(hoyIso())
  const [guardando, setGuardando] = useState(false)

  async function programar() {
    if (!session || !clienteActivo) return
    setGuardando(true)
    try {
      await createReview({ trainerId: session.user.id, clientId: clienteActivo.id, fechaProgramada: fecha, estado: 'pendiente', fechaRecepcion: null, notas: null })
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstado(id: string, estado: EstadoRevision) {
    await updateReviewEstado(id, estado, estado === 'pendiente' ? null : hoyIso())
    await refetch()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardLabel>Programar revisión</CardLabel>
        <div className="flex items-end gap-3">
          <Field label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Button onClick={programar} disabled={guardando}>
            Programar
          </Button>
        </div>
      </Card>

      <Card>
        <CardLabel>Historial</CardLabel>
        <div className="flex flex-col gap-2">
          {(revisiones ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-control border border-bg-border p-3 text-sm">
              <div>
                <div className="font-medium">{formatFechaCorta(r.fechaProgramada)}</div>
                <div className="text-xs text-text-muted">{formatFechaRelativa(r.fechaProgramada)}</div>
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
                {r.estado === 'pendiente' && (
                  <Button variant="ghost" onClick={() => cambiarEstado(r.id, 'recibida')}>
                    <span className="flex items-center gap-1">
                      <Check size={13} /> Recibida
                    </span>
                  </Button>
                )}
                {r.estado === 'recibida' && (
                  <Button variant="ghost" onClick={() => cambiarEstado(r.id, 'revisada')}>
                    <span className="flex items-center gap-1">
                      <Check size={13} /> Revisada
                    </span>
                  </Button>
                )}
              </div>
            </div>
          ))}
          {(revisiones ?? []).length === 0 && <p className="text-sm text-text-muted">Todavía no hay revisiones programadas.</p>}
        </div>
      </Card>
    </div>
  )
}

function PagosTab() {
  const { session, clienteActivo } = useSession()
  const linkId = clienteActivo?.linkId ?? null
  const { data: pagos, refetch } = usePaymentsCliente(linkId)
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(hoyIso())
  const [nextPaymentDate, setNextPaymentDate] = useState('')
  const [status, setStatus] = useState<'paid' | 'pending'>('paid')
  const [notes, setNotes] = useState('')
  const [guardando, setGuardando] = useState(false)

  const actual = pagos?.[0] ?? null

  async function registrar() {
    if (!session || !clienteActivo || !linkId) return
    setGuardando(true)
    try {
      await createPayment({
        linkId,
        trainerId: session.user.id,
        clientId: clienteActivo.id,
        status,
        source: 'manual',
        amount: amount ? Number(amount) : null,
        paymentDate: paymentDate || null,
        nextPaymentDate: nextPaymentDate || null,
        externalProvider: null,
        externalPaymentId: null,
        notes: notes || null,
      })
      setAmount('')
      setNotes('')
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardLabel>Estado actual</CardLabel>
        {actual ? (
          <div className="flex items-center gap-4 text-sm">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                actual.status === 'paid' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-pegasus-redSoft text-pegasus-red'
              }`}
            >
              {actual.status === 'paid' ? 'Al día' : 'Pendiente'}
            </span>
            {actual.amount !== null && <span>{formatNumero(actual.amount, 0)} €</span>}
            {actual.paymentDate && <span className="text-text-muted">Último pago: {formatFechaCorta(actual.paymentDate)}</span>}
            {actual.nextPaymentDate && <span className="text-text-muted">Próximo: {formatFechaCorta(actual.nextPaymentDate)}</span>}
            <span className="text-text-muted">· {actual.source === 'manual' ? 'Manual' : 'Integración externa'}</span>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Todavía no hay ningún pago registrado.</p>
        )}
      </Card>

      <Card>
        <CardLabel>Registrar pago</CardLabel>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex gap-1 rounded-control bg-bg-panel p-1 w-fit">
            <button
              onClick={() => setStatus('paid')}
              className={`rounded-[8px] px-3 py-1.5 text-sm font-semibold ${status === 'paid' ? 'bg-pegasus-red text-white' : 'text-text-secondary'}`}
            >
              Pagado
            </button>
            <button
              onClick={() => setStatus('pending')}
              className={`rounded-[8px] px-3 py-1.5 text-sm font-semibold ${status === 'pending' ? 'bg-pegasus-red text-white' : 'text-text-secondary'}`}
            >
              Pendiente
            </button>
          </div>
          <div />
          <Field label="Importe" type="number" suffix="€" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Field label="Fecha de pago" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          <Field label="Próximo pago" type="date" value={nextPaymentDate} onChange={(e) => setNextPaymentDate(e.target.value)} />
          <Field label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={registrar} disabled={guardando}>
            Guardar
          </Button>
        </div>
      </Card>

      <Card>
        <CardLabel>Historial</CardLabel>
        <div className="flex flex-col gap-2">
          {(pagos ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-control border border-bg-border p-3 text-sm">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  p.status === 'paid' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-pegasus-redSoft text-pegasus-red'
                }`}
              >
                {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
              </span>
              <span>{p.amount !== null ? `${formatNumero(p.amount, 0)} €` : '—'}</span>
              <span className="text-text-muted">{p.paymentDate ? formatFechaCorta(p.paymentDate) : '—'}</span>
              {p.notes && <span className="truncate text-text-muted">{p.notes}</span>}
            </div>
          ))}
          {(pagos ?? []).length === 0 && <p className="text-sm text-text-muted">Sin pagos todavía.</p>}
        </div>
      </Card>
    </div>
  )
}
