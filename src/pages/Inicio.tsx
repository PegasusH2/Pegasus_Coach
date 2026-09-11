import { useMemo, useState } from 'react'
import {
  Activity,
  Bell,
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  ClipboardCheck,
  Download,
  Flame,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { useActiveMacroPlan, useResumenEntrenador, useWeightEntries } from '@/hooks/useData'
import { calcularMacroPlan, cambioEnPeriodo } from '@/lib/calculos'
import { useDiaTipo } from '@/lib/DiaTipoContext'
import { useSession } from '@/lib/SessionContext'
import { exportarDatosJson } from '@/lib/exportData'
import { Card, CardLabel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DiaToggle } from '@/components/ui/DiaToggle'
import { Avatar } from '@/components/ui/Avatar'
import { WeightChart } from '@/components/WeightChart'
import { PanelAccionesRapidas } from '@/components/PanelAccionesRapidas'
import { formatFechaRelativa, formatKcal, formatNumero } from '@/lib/format'
import type { Route } from '@/lib/nav'
import type { ClienteResumen, ResumenEntrenador } from '@/lib/supabase/dashboardRepo'
import type { Review } from '@/types'

export function Inicio({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { profile } = useSession()
  if (profile?.role === 'entrenador') return <DashboardEntrenador onNavigate={onNavigate} />
  return <InicioPersonal onNavigate={onNavigate} />
}

function InicioPersonal({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { profile, clienteActivo } = useSession()
  const { data: plan } = useActiveMacroPlan()
  const { data: weightEntries } = useWeightEntries()
  const { diaTipo, setDiaTipo } = useDiaTipo()
  const nombreMostrado = clienteActivo?.nombre || profile?.nombre

  const calculado = plan ? calcularMacroPlan(plan) : null
  const pesos = weightEntries ?? []
  const pesoActual = pesos.length > 0 ? [...pesos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].pesoKg : null
  const cambioSemanal = cambioEnPeriodo(pesos, 7)

  const kcal = calculado ? (diaTipo === 'ON' ? calculado.calTotalOn : calculado.calTotalOff) : null
  const proteina = calculado ? (diaTipo === 'ON' ? calculado.proteinaOn : calculado.proteinaOff) : null
  const hidratos = calculado ? (diaTipo === 'ON' ? calculado.hidratosOn : calculado.hidratosOff) : null
  const grasas = calculado ? (diaTipo === 'ON' ? calculado.grasasOn : calculado.grasasOff) : null

  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {nombreMostrado || 'atleta'}</h1>
          <p className="mt-1 text-sm capitalize text-text-secondary">{hoy}</p>
        </div>
        <DiaToggle value={diaTipo} onChange={setDiaTipo} />
      </div>

      <div key={diaTipo} className="tab-fade">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardLabel>Peso actual</CardLabel>
          <div className="text-3xl font-bold">
            {pesoActual !== null ? formatNumero(pesoActual, 1) : '—'} <span className="text-base text-text-secondary">kg</span>
          </div>
          {cambioSemanal !== null && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${cambioSemanal <= 0 ? 'text-emerald-400' : 'text-pegasus-red'}`}>
              {cambioSemanal <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {formatNumero(Math.abs(cambioSemanal), 1)} kg / 7 días
            </div>
          )}
        </Card>

        <Card>
          <CardLabel icon={<Flame size={13} />}>Calorías ({diaTipo})</CardLabel>
          <div className="text-3xl font-bold">
            {formatNumero(kcal, 0)} <span className="text-base text-text-secondary">kcal</span>
          </div>
        </Card>

        <Card>
          <CardLabel>Déficit / superávit</CardLabel>
          <div className={`text-3xl font-bold ${calculado && calculado.superavitDeficit > 0 ? 'text-pegasus-red' : 'text-emerald-400'}`}>
            {calculado ? formatKcal(calculado.superavitDeficit) : '—'} <span className="text-base text-text-secondary">kcal</span>
          </div>
          <div className="mt-1 text-xs text-text-muted">sobre normocalórico</div>
        </Card>

        <Card>
          <CardLabel icon={<Activity size={13} />}>NEAT objetivo</CardLabel>
          <div className="text-3xl font-bold">
            {formatNumero(plan?.neatObjetivoPasos ?? null, 0)} <span className="text-base text-text-secondary">pasos</span>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card>
          <CardLabel>Proteína</CardLabel>
          <div className="text-2xl font-bold text-macro-protein">{formatNumero(proteina, 0)} g</div>
        </Card>
        <Card>
          <CardLabel>Hidratos</CardLabel>
          <div className="text-2xl font-bold text-macro-carbs">{formatNumero(hidratos, 0)} g</div>
        </Card>
        <Card>
          <CardLabel>Grasas</CardLabel>
          <div className="text-2xl font-bold text-macro-fat">{formatNumero(grasas, 0)} g</div>
        </Card>
      </div>
      </div>

      <Card className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <CardLabel>Evolución de peso</CardLabel>
          <button
            onClick={() => onNavigate({ section: 'progreso', progresoTab: 'peso' })}
            className="text-xs font-medium text-pegasus-red hover:underline"
          >
            Ver todo
          </button>
        </div>
        <WeightChart entries={pesos.slice(-60)} height={200} />
      </Card>
    </div>
  )
}

type Filtro = 'todos' | 'activos' | 'proxima-revision' | 'pendiente-revision' | 'pago-pendiente'

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'activos', label: 'Activos' },
  { key: 'proxima-revision', label: 'Próxima revisión' },
  { key: 'pendiente-revision', label: 'Pendiente de revisión' },
  { key: 'pago-pendiente', label: 'Pago pendiente' },
]

function Sparkline({ pesos }: { pesos: ClienteResumen['pesos'] }) {
  const data = [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-10)
  if (data.length < 2) return <span className="text-xs text-text-muted">—</span>
  return (
    <ResponsiveContainer width={90} height={28}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="pesoKg" stroke="#e8383d" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Estado agregado de un cliente para el panel "Estado de clientes" — categorías
 * MUTUAMENTE EXCLUYENTES (cada cliente cuenta en una sola), en este orden de
 * prioridad, todo con datos ya existentes (nada inventado):
 *   1. Requiere revisión: tiene una revisión pendiente ya vencida.
 *   2. En atención: tiene un pago pendiente (señal real de "hay que hablar con él").
 *   3. Activo: registró actividad (nutrición o entreno) dentro de `inactivityDays`
 *      (trainer_settings, configurable en Ajustes → Parámetros del servicio).
 *   4. Sin actividad: entre `inactivityDays` y `prolongedInactivityDays`.
 *   5. Sin actividad prolongada: más allá de `prolongedInactivityDays`. */
type EstadoCliente = 'requiere-revision' | 'en-atencion' | 'activo' | 'sin-actividad' | 'sin-actividad-prolongada'

function estadoDeCliente(c: ClienteResumen, hoy: string, umbralActivo: string, umbralProlongado: string): EstadoCliente {
  if (c.proximaRevision && c.proximaRevision.fechaProgramada < hoy) return 'requiere-revision'
  if (c.pago?.status === 'pending') return 'en-atencion'
  if (c.ultimaActividad !== null && c.ultimaActividad >= umbralActivo) return 'activo'
  if (c.ultimaActividad !== null && c.ultimaActividad >= umbralProlongado) return 'sin-actividad'
  return 'sin-actividad-prolongada'
}

function DashboardEntrenador({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { session, profile, setClienteActivo, trainerSettings } = useSession()
  const { data: resumen } = useResumenEntrenador()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [pagina, setPagina] = useState(1)
  const porPagina = 5
  const inactivityDays = trainerSettings?.inactivityDays ?? 7
  const prolongedInactivityDays = trainerSettings?.prolongedInactivityDays ?? 30

  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const hoyIso = new Date().toISOString().slice(0, 10)
  const umbralActivo = new Date(Date.now() - inactivityDays * 86400000).toISOString().slice(0, 10)

  const clientes = resumen?.clientes ?? []

  function irAClientes(f: Filtro) {
    setFiltro(f)
    setPagina(1)
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return clientes.filter((c) => {
      if (q && !c.nombre.toLowerCase().includes(q) && !(c.email ?? '').toLowerCase().includes(q)) return false
      if (filtro === 'activos') return c.ultimaActividad !== null && c.ultimaActividad >= umbralActivo
      if (filtro === 'proxima-revision') return c.proximaRevision !== null && c.proximaRevision.fechaProgramada >= hoyIso
      if (filtro === 'pendiente-revision') return c.proximaRevision !== null && c.proximaRevision.fechaProgramada < hoyIso
      if (filtro === 'pago-pendiente') return c.pago?.status === 'pending'
      return true
    })
  }, [clientes, busqueda, filtro, hoyIso, umbralActivo])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const visibles = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina)

  function verCliente(c: ClienteResumen) {
    setClienteActivo({ id: c.clientId, nombre: c.nombre, linkId: c.linkId })
    onNavigate({ section: 'ficha', fichaTab: 'datos' })
  }

  // Recuentos reales para el panel de Atención — mismos campos que ya usa la tabla.
  const entrenadosEstaSemana = clientes.filter(
    (c) => c.ultimaActividadOrigen === 'tracker' && c.ultimaActividad !== null && c.ultimaActividad >= umbralActivo,
  ).length

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {profile?.nombre || 'Entrenador'}</h1>
          <p className="mt-1 text-sm capitalize text-text-secondary">{hoy}</p>
        </div>
        <Button variant="secondary" onClick={() => session && exportarDatosJson(session.user.id)}>
          <span className="flex items-center gap-1.5">
            <Download size={14} /> Exportar
          </span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px] xl:items-start">
        <div className="min-w-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardLabel icon={<Users size={13} />}>Clientes activos</CardLabel>
              <div className="text-3xl font-bold">{resumen?.clientesActivos ?? '—'}</div>
              <div className="mt-1 text-xs text-text-muted">Clientes con actividad esta semana</div>
              {resumen && resumen.clientesTotal > 0 && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-panel">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.round((resumen.clientesActivos / resumen.clientesTotal) * 100)}%` }}
                  />
                </div>
              )}
            </Card>

            <Card>
              <CardLabel icon={<CalendarClock size={13} />}>Próximas revisiones</CardLabel>
              <div className="text-3xl font-bold">{resumen?.proximasRevisiones.length ?? '—'}</div>
              <div className="mt-1 text-xs text-text-muted">Próximos 7 días</div>
              <div className="mt-3 flex flex-col gap-1.5">
                {(resumen?.proximasRevisiones ?? []).slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-text-secondary">{r.clienteNombre || 'Cliente'}</span>
                    <span className="shrink-0 text-text-muted">{formatFechaRelativa(r.fechaProgramada)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => onNavigate({ section: 'revisiones' })} className="mt-2 text-xs font-medium text-pegasus-red hover:underline">
                Ver todas
              </button>
            </Card>

            <Card>
              <CardLabel icon={<ClipboardCheck size={13} />}>Revisiones recibidas</CardLabel>
              <div className="text-3xl font-bold">{resumen?.revisionesRecibidasEsteMes.length ?? '—'}</div>
              <div className="mt-1 text-xs text-text-muted">Este mes</div>
              {resumen && resumen.revisionesRecibidasEsteMes.length > 1 && (
                <ResponsiveContainer width="100%" height={40} className="mt-2">
                  <LineChart data={resumen.revisionesRecibidasEsteMes.map((r, i) => ({ i, n: i + 1 }))}>
                    <Line type="monotone" dataKey="n" stroke="#7a5af5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <CardLabel icon={<Wallet size={13} />}>Clientes pendientes de pago</CardLabel>
              <div className="text-3xl font-bold">{resumen?.clientesPendientesPago.length ?? '—'}</div>
              {resumen && resumen.totalPendiente > 0 && (
                <div className="mt-1 text-xs text-pegasus-red">Total pendiente: {formatNumero(resumen.totalPendiente, 0)} €</div>
              )}
              <button onClick={() => irAClientes('pago-pendiente')} className="mt-2 text-xs font-medium text-pegasus-red hover:underline">
                Ver todos
              </button>
            </Card>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-control border border-bg-border bg-bg-panel px-3 py-2.5">
              <Search size={16} className="text-text-muted" />
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
                placeholder="Buscar cliente por nombre o email…"
                className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
            <select
              value={filtro}
              onChange={(e) => irAClientes(e.target.value as Filtro)}
              className="rounded-control border border-bg-border bg-bg-panel px-3 py-2.5 text-sm text-text-primary outline-none"
            >
              {FILTROS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <Card className="mt-4 overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border text-left text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Última actividad</th>
                  <th className="px-3 py-3 font-medium">Próx. revisión</th>
                  <th className="px-3 py-3 font-medium">Pago</th>
                  <th className="px-3 py-3 font-medium">Progreso</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr
                    key={c.clientId}
                    onClick={() => verCliente(c)}
                    className="cursor-pointer border-b border-bg-border last:border-0 hover:bg-bg-hover"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={c.nombre} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{c.nombre}</div>
                          {c.email && <div className="truncate text-xs text-text-muted">{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {c.ultimaActividad ? (
                        <span className="flex items-center gap-1.5">
                          {c.ultimaActividadOrigen === 'tracker' ? '🏋️' : '🍎'} {formatFechaRelativa(c.ultimaActividad)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {c.proximaRevision ? (
                        <span className="text-text-secondary">{formatFechaRelativa(c.proximaRevision.fechaProgramada)}</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {c.pago?.status === 'paid' && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-400">Al día</span>}
                      {c.pago?.status === 'pending' && (
                        <span className="flex flex-col gap-0.5">
                          <span className="w-fit rounded-full bg-pegasus-redSoft px-2 py-0.5 text-xs font-medium text-pegasus-red">Pendiente</span>
                          {c.pago.amount !== null && <span className="text-xs text-text-muted">{formatNumero(c.pago.amount, 0)} €</span>}
                        </span>
                      )}
                      {!c.pago && <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <Sparkline pesos={c.pesos} />
                    </td>
                    <td className="px-3 py-3 text-text-muted">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-text-muted">
                      {clientes.length === 0 ? 'Todavía no tienes clientes vinculados.' : 'Ningún cliente coincide con la búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {filtrados.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
              <span>
                Mostrando {(pagina - 1) * porPagina + 1} a {Math.min(pagina * porPagina, filtrados.length)} de {filtrados.length} clientes
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="rounded-control px-2 py-1 hover:bg-bg-hover disabled:opacity-30"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPagina(n)}
                    className={`rounded-control px-2.5 py-1 ${n === pagina ? 'bg-pegasus-red text-white' : 'hover:bg-bg-hover'}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-control px-2 py-1 hover:bg-bg-hover disabled:opacity-30"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <PanelAtencion
            revisionesVencidas={resumen?.revisionesVencidas.length ?? 0}
            revisionesProximas={resumen?.proximasRevisiones.length ?? 0}
            entrenadosEstaSemana={entrenadosEstaSemana}
            onFiltrar={irAClientes}
            onVerTodas={() => onNavigate({ section: 'revisiones' })}
          />
          <PanelProximamente revisiones={resumen?.proximasRevisiones ?? []} onVerAgenda={() => onNavigate({ section: 'calendario' })} onProgramar={() => onNavigate({ section: 'calendario' })} />
          <PanelEstadoClientes
            clientes={clientes}
            hoyIso={hoyIso}
            umbralActivo={umbralActivo}
            umbralProlongado={new Date(Date.now() - prolongedInactivityDays * 86400000).toISOString().slice(0, 10)}
            onFiltrar={irAClientes}
          />
          <PanelAccionesRapidas onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  )
}

function PanelAtencion({
  revisionesVencidas,
  revisionesProximas,
  entrenadosEstaSemana,
  onFiltrar,
  onVerTodas,
}: {
  revisionesVencidas: number
  revisionesProximas: number
  entrenadosEstaSemana: number
  onFiltrar: (f: Filtro) => void
  onVerTodas: () => void
}) {
  const totalAviso = revisionesVencidas + revisionesProximas
  const filas: { key: string; color: string; texto: string; onClick: () => void }[] = []
  if (revisionesVencidas > 0) {
    filas.push({
      key: 'vencidas',
      color: 'bg-pegasus-red',
      texto: `${revisionesVencidas} cliente${revisionesVencidas === 1 ? '' : 's'} requiere${revisionesVencidas === 1 ? '' : 'n'} revisión`,
      onClick: () => onFiltrar('pendiente-revision'),
    })
  }
  if (revisionesProximas > 0) {
    filas.push({
      key: 'proximas',
      color: 'bg-amber-400',
      texto: `${revisionesProximas} revisión${revisionesProximas === 1 ? '' : 'es'} próxima${revisionesProximas === 1 ? '' : 's'}`,
      onClick: () => onFiltrar('proxima-revision'),
    })
  }
  if (entrenadosEstaSemana > 0) {
    filas.push({
      key: 'entrenados',
      color: 'bg-emerald-400',
      texto: `${entrenadosEstaSemana} cliente${entrenadosEstaSemana === 1 ? '' : 's'} ha${entrenadosEstaSemana === 1 ? '' : 'n'} entrenado esta semana`,
      onClick: () => onFiltrar('activos'),
    })
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardLabel icon={<Bell size={13} />}>Atención</CardLabel>
        {totalAviso > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pegasus-red px-1.5 text-xs font-semibold text-white">
            {totalAviso}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {filas.map((f) => (
          <button key={f.key} onClick={f.onClick} className="flex w-full items-center gap-2 rounded-control py-1 text-left text-sm hover:bg-bg-hover">
            <span className={`h-2 w-2 shrink-0 rounded-full ${f.color}`} />
            <span className="flex-1 text-text-secondary">{f.texto}</span>
            <ChevronRight size={14} className="shrink-0 text-text-muted" />
          </button>
        ))}
        {filas.length === 0 && <p className="text-sm text-text-muted">Nada que requiera tu atención ahora mismo.</p>}
      </div>
      <button onClick={onVerTodas} className="mt-3 text-xs font-medium text-pegasus-red hover:underline">
        Ver todas las alertas →
      </button>
    </Card>
  )
}

function PanelProximamente({
  revisiones,
  onVerAgenda,
  onProgramar,
}: {
  revisiones: Review[]
  onVerAgenda: () => void
  onProgramar: () => void
}) {
  // Agrupadas por fecha (relativa: hoy/mañana/día de la semana) — ya ordenadas
  // ascendente desde dashboardRepo.ts (mismo orden que listPendingReviews).
  const grupos = useMemo(() => {
    const porFecha = new Map<string, Review[]>()
    for (const r of revisiones) {
      const lista = porFecha.get(r.fechaProgramada) ?? []
      lista.push(r)
      porFecha.set(r.fechaProgramada, lista)
    }
    return [...porFecha.entries()]
  }, [revisiones])

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardLabel icon={<CalendarClock size={13} />}>Próximamente</CardLabel>
        <button onClick={onVerAgenda} className="text-xs font-medium text-pegasus-red hover:underline">
          Ver agenda →
        </button>
      </div>
      {grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-text-muted">No tienes próximas revisiones programadas</p>
          <Button variant="secondary" onClick={onProgramar}>
            <span className="flex items-center gap-1.5">
              <CalendarPlus size={14} /> Programar revisión
            </span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map(([fecha, items]) => (
            <div key={fecha}>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">{formatFechaRelativa(fecha)}</div>
              <div className="flex flex-col gap-1.5">
                {items.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-control border border-bg-border bg-bg-panel/60 px-2.5 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-text-primary">{r.clienteNombre || 'Cliente'}</div>
                      {r.notas && <div className="truncate text-xs text-text-muted">{r.notas}</div>}
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-text-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

const ESTADO_LABELS: Record<EstadoCliente, { label: string; color: string; dot: string }> = {
  activo: { label: 'Activos', color: 'bg-emerald-400', dot: '🟢' },
  'en-atencion': { label: 'En atención', color: 'bg-amber-400', dot: '🟡' },
  'requiere-revision': { label: 'Requiere revisión', color: 'bg-pegasus-red', dot: '🔴' },
  'sin-actividad': { label: 'Sin actividad', color: 'bg-text-muted', dot: '⚪' },
  'sin-actividad-prolongada': { label: 'Sin actividad prolongada', color: 'bg-text-muted', dot: '⚫' },
}

function PanelEstadoClientes({
  clientes,
  hoyIso,
  umbralActivo,
  umbralProlongado,
  onFiltrar,
}: {
  clientes: ClienteResumen[]
  hoyIso: string
  umbralActivo: string
  umbralProlongado: string
  onFiltrar: (f: Filtro) => void
}) {
  const conteos: Record<EstadoCliente, number> = {
    activo: 0,
    'en-atencion': 0,
    'requiere-revision': 0,
    'sin-actividad': 0,
    'sin-actividad-prolongada': 0,
  }
  for (const c of clientes) conteos[estadoDeCliente(c, hoyIso, umbralActivo, umbralProlongado)]++
  const total = clientes.length

  const FILTRO_POR_ESTADO: Record<EstadoCliente, Filtro> = {
    activo: 'activos',
    'en-atencion': 'pago-pendiente',
    'requiere-revision': 'pendiente-revision',
    'sin-actividad': 'todos',
    'sin-actividad-prolongada': 'todos',
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardLabel icon={<Users size={13} />}>Estado de clientes</CardLabel>
        <button onClick={() => onFiltrar('todos')} className="text-xs font-medium text-pegasus-red hover:underline">
          Ver todos →
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {(Object.keys(ESTADO_LABELS) as EstadoCliente[]).map((estado) => {
          const info = ESTADO_LABELS[estado]
          const n = conteos[estado]
          const pct = total > 0 ? Math.round((n / total) * 100) : 0
          return (
            <button
              key={estado}
              onClick={() => onFiltrar(FILTRO_POR_ESTADO[estado])}
              disabled={n === 0}
              className="flex flex-col gap-1 text-left disabled:cursor-default disabled:opacity-40"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{info.label}</span>
                <span className="text-text-muted">{n} cliente{n === 1 ? '' : 's'}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-panel">
                <div className={`h-full rounded-full ${info.color}`} style={{ width: `${pct}%` }} />
              </div>
            </button>
          )
        })}
        {total === 0 && <p className="text-sm text-text-muted">Todavía no tienes clientes vinculados.</p>}
      </div>
    </Card>
  )
}

