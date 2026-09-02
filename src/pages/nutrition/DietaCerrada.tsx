// Dieta cerrada — sistema de gestión y versionado para el entrenador (ver plan en
// PEGASUSONE_DOCS y la migración 0008_dieta_cerrada_gestor_versionado.sql). Sin
// cálculo de macros/calorías: alimento + cantidad + unidad, a mano. Cada "Guardar
// cambios" crea SIEMPRE una nueva versión (nueva fila de plan) — nunca sobrescribe la
// anterior, que queda intacta en el historial.
import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Calendar,
  ChevronDown,
  Copy,
  FolderOpen,
  History,
  MoreVertical,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useActiveClosedDietPlan, useClosedDietItems, useClosedDietPlans, useDietTemplates, useScheduledClosedDietPlans } from '@/hooks/useData'
import { useDiaTipo } from '@/lib/DiaTipoContext'
import { useSession } from '@/lib/SessionContext'
import {
  archiveClosedDietPlan,
  createClosedDietPlanFromItems,
  deleteClosedDietPlan,
  listClosedDietItems,
  numeroVersion,
} from '@/lib/supabase/closedDietRepo'
import { listDietTemplateItems, saveClosedDietAsTemplate } from '@/lib/supabase/dietTemplateRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { DiaToggle } from '@/components/ui/DiaToggle'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { ClosedDietTimeline } from '@/components/nutrition/ClosedDietTimeline'
import { CoachNoteCard } from '@/components/nutrition/CoachNoteCard'
import { groupClosedDietItemsByMomento } from '@/lib/closedDietTimeline'
import { formatFechaCorta, hoyIso } from '@/lib/format'
import type { ClosedDietItem, ClosedDietItemInput, ClosedDietPlan, DiaTipoItem } from '@/types'

interface FilaAlimento {
  key: string
  momento: string
  alimento: string
  cantidad: string
  unidad: string
}

let contador = 0
function nuevaClave() {
  contador += 1
  return `f${Date.now()}-${contador}`
}

function filaVacia(momento: string): FilaAlimento {
  return { key: nuevaClave(), momento, alimento: '', cantidad: '', unidad: 'g' }
}

function filaDesdeItem(item: ClosedDietItem): FilaAlimento {
  return { key: item.id, momento: item.momento ?? '', alimento: item.alimento, cantidad: item.gramos.toString(), unidad: item.unidad }
}

function filasAItems(filas: FilaAlimento[], diaTipo: DiaTipoItem): Omit<ClosedDietItemInput, 'planId'>[] {
  return filas
    .filter((f) => f.alimento.trim() !== '')
    .map((f, i) => ({
      diaTipo,
      momento: f.momento.trim() || null,
      alimento: f.alimento.trim(),
      gramos: Number(f.cantidad) || 0,
      unidad: f.unidad.trim() || 'g',
      orden: i,
    }))
}

export function DietaCerrada({ distingueDias }: { distingueDias: boolean }) {
  const { soloLecturaNutricion: readOnly } = useSession()
  const { diaTipo, setDiaTipo } = useDiaTipo()
  const { data: plan } = useActiveClosedDietPlan()
  const { data: items } = useClosedDietItems(plan?.id ?? null)
  const [notas, setNotas] = useState('')

  useEffect(() => {
    setNotas(plan?.notas ?? '')
  }, [plan])

  if (!readOnly) return <DietaCerradaEntrenador distingueDias={distingueDias} />

  if (!plan) {
    return (
      <div className="max-w-5xl">
        <PageHeader title="Dieta cerrada" subtitle="Todavía no tienes un plan de nutrición asignado" />
        <p className="text-sm text-text-muted">En cuanto tu entrenador registre tu dieta, la verás aquí.</p>
      </div>
    )
  }

  const itemsDelDiaActivo = distingueDias ? (items ?? []).filter((i) => i.diaTipo === diaTipo.toLowerCase()) : (items ?? [])

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Dieta cerrada"
        subtitle={`Dieta activa desde ${formatFechaCorta(plan.fecha)}`}
        actions={distingueDias ? <DiaToggle value={diaTipo} onChange={setDiaTipo} /> : undefined}
      />
      <div key={diaTipo} className="tab-fade flex flex-col gap-4">
        <ClosedDietTimeline items={itemsDelDiaActivo} />
        <CoachNoteCard notas={notas} readOnly />
      </div>
    </div>
  )
}

// =======================================================================
// Vista del entrenador — control total
// =======================================================================

const ICONOS_MOMENTO = [Sun, UtensilsCrossed, UtensilsCrossed, UtensilsCrossed, Sparkles]

function iconoParaMomento(index: number) {
  return ICONOS_MOMENTO[index % ICONOS_MOMENTO.length]
}

function DietaCerradaEntrenador({ distingueDias }: { distingueDias: boolean }) {
  const { session, targetUserId } = useSession()
  const { diaTipo, setDiaTipo } = useDiaTipo()
  const { data: plan, refetch: refetchPlan } = useActiveClosedDietPlan()
  const { data: itemsPlan, refetch: refetchItems } = useClosedDietItems(plan?.id ?? null)
  const { data: historial, refetch: refetchHistorial } = useClosedDietPlans()
  const { data: programadas, refetch: refetchProgramadas } = useScheduledClosedDietPlans()
  const { data: plantillas, refetch: refetchPlantillas } = useDietTemplates()

  const [borrador, setBorrador] = useState<FilaAlimento[] | null>(null)
  const [comidaEnEdicion, setComidaEnEdicion] = useState<string | null>(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [nuevaDietaAbierta, setNuevaDietaAbierta] = useState(false)
  const [gestorAbierto, setGestorAbierto] = useState(false)
  const [programarAbierto, setProgramarAbierto] = useState(false)
  const [historialCompleto, setHistorialCompleto] = useState(false);
  const [versionEnRevision, setVersionEnRevision] = useState<ClosedDietPlan | null>(null)
  const [itemsVersionEnRevision, setItemsVersionEnRevision] = useState<ClosedDietItem[] | null>(null)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setNotas(plan?.notas ?? '')
  }, [plan])

  const editando = borrador !== null

  const itemsDelDiaActivo = useMemo(() => {
    const base = itemsPlan ?? []
    return distingueDias ? base.filter((i) => i.diaTipo === diaTipo.toLowerCase()) : base
  }, [itemsPlan, distingueDias, diaTipo])

  const grupos: { momento: string | null; filas: FilaAlimento[] }[] = useMemo(() => {
    if (!editando) {
      return groupClosedDietItemsByMomento(itemsDelDiaActivo).map((g) => ({ momento: g.momento, filas: g.items.map(filaDesdeItem) }))
    }
    // En edición se agrupa el borrador igual que los items reales, reutilizando la
    // misma función (adaptando la forma mínima que necesita).
    const porMomento = new Map<string, FilaAlimento[]>()
    const orden: string[] = []
    for (const f of borrador ?? []) {
      const clave = f.momento || '__sin_horario__'
      if (!porMomento.has(clave)) {
        porMomento.set(clave, [])
        orden.push(clave)
      }
      porMomento.get(clave)!.push(f)
    }
    return orden.map((clave) => ({ momento: clave === '__sin_horario__' ? null : clave, filas: porMomento.get(clave)! }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, itemsDelDiaActivo, borrador, distingueDias, diaTipo])

  function iniciarEdicion() {
    setBorrador(itemsDelDiaActivo.map(filaDesdeItem))
    setMotivoCambio('')
  }

  function cancelarEdicion() {
    setBorrador(null)
    setComidaEnEdicion(null)
  }

  async function guardarComoNuevaVersion() {
    if (!targetUserId || !borrador) return
    setGuardando(true)
    try {
      const otroLado = distingueDias ? (itemsPlan ?? []).filter((i) => i.diaTipo !== diaTipo.toLowerCase()).map(filaDesdeItem) : []
      const diaTipoActual: DiaTipoItem = distingueDias ? (diaTipo.toLowerCase() as DiaTipoItem) : 'unico'
      const itemsFinales = [
        ...filasAItems(borrador, diaTipoActual),
        ...filasAItems(otroLado, diaTipoActual === 'on' ? 'off' : 'on'),
      ]
      await createClosedDietPlanFromItems(targetUserId, itemsFinales, {
        notas: notas.trim() || null,
        motivoCambio: motivoCambio.trim() || null,
      })
      setBorrador(null)
      setComidaEnEdicion(null)
      setMotivoCambio('')
      await Promise.all([refetchPlan(), refetchItems(), refetchHistorial()])
    } finally {
      setGuardando(false)
    }
  }

  function actualizarFila(key: string, patch: Partial<FilaAlimento>) {
    setBorrador((b) => (b ? b.map((f) => (f.key === key ? { ...f, ...patch } : f)) : b))
  }
  function borrarFila(key: string) {
    setBorrador((b) => (b ? b.filter((f) => f.key !== key) : b))
  }
  function anadirFilaAMomento(momento: string) {
    setBorrador((b) => (b ? [...b, filaVacia(momento)] : b))
  }
  function anadirComida() {
    const nombre = `Comida ${grupos.length + 1}`
    setBorrador((b) => (b ? [...b, filaVacia(nombre)] : [filaVacia(nombre)]))
    setComidaEnEdicion(nombre)
  }
  function eliminarComida(momento: string | null) {
    setBorrador((b) => (b ? b.filter((f) => (f.momento || null) !== momento) : b))
  }
  function renombrarComida(momentoAnterior: string | null, momentoNuevo: string) {
    setBorrador((b) => (b ? b.map((f) => ((f.momento || null) === momentoAnterior ? { ...f, momento: momentoNuevo } : f)) : b))
  }

  async function archivar() {
    if (!plan) return
    await archiveClosedDietPlan(plan.id)
    await Promise.all([refetchPlan(), refetchHistorial()])
    setMenuAbierto(false)
  }
  async function eliminar() {
    if (!plan) return
    await deleteClosedDietPlan(plan.id)
    await Promise.all([refetchPlan(), refetchHistorial()])
    setMenuAbierto(false)
  }

  async function verVersion(v: ClosedDietPlan) {
    setVersionEnRevision(v)
    setItemsVersionEnRevision(null)
    const its = await listClosedDietItems(v.id)
    setItemsVersionEnRevision(its)
  }

  async function crearDesdeVersion(v: ClosedDietPlan, fecha?: string) {
    if (!targetUserId) return
    const its = itemsVersionEnRevision && versionEnRevision?.id === v.id ? itemsVersionEnRevision : await listClosedDietItems(v.id)
    setGuardando(true)
    try {
      await createClosedDietPlanFromItems(
        targetUserId,
        its.map((i, idx) => ({ diaTipo: i.diaTipo, momento: i.momento, alimento: i.alimento, gramos: i.gramos, unidad: i.unidad, orden: idx })),
        { fecha: fecha ?? hoyIso(), motivoCambio: fecha ? 'Dieta programada' : `Duplicada de la versión anterior (${formatFechaCorta(v.fecha)})` },
      )
      setVersionEnRevision(null)
      await Promise.all([refetchPlan(), refetchItems(), refetchHistorial(), refetchProgramadas()])
    } finally {
      setGuardando(false)
    }
  }

  async function crearDesdeGestor(templateId: string) {
    if (!targetUserId) return
    setGuardando(true)
    try {
      const items = await listDietTemplateItems(templateId)
      await createClosedDietPlanFromItems(
        targetUserId,
        items.map((i, idx) => ({ diaTipo: i.diaTipo, momento: i.momento, alimento: i.alimento, gramos: i.cantidad, unidad: i.unidad, orden: idx })),
        { motivoCambio: 'Creada desde el Gestor de dietas' },
      )
      await Promise.all([refetchPlan(), refetchItems(), refetchHistorial()])
    } finally {
      setGuardando(false)
    }
  }

  const version = plan && historial ? numeroVersion(historial, plan.id) : null

  return (
    <div className="max-w-6xl">
      <PageHeader title="Dieta cerrada" subtitle="Plan de alimentación del cliente — control total del entrenador" />

      {/* Cabecera de la dieta */}
      <Card className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pegasus-red/25 bg-pegasus-redSoft text-pegasus-red">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-text-primary">{plan?.nombre || 'Dieta cerrada'}</span>
                {version !== null && <span className="rounded-full bg-bg-panel px-2 py-0.5 text-[11px] font-medium text-text-secondary">Versión {version}</span>}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                {plan ? (
                  <>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Activa
                    </span>
                    <span>· Activa desde {formatFechaCorta(plan.fecha)}</span>
                  </>
                ) : (
                  <span>Este cliente todavía no tiene ninguna dieta cerrada registrada.</span>
                )}
              </div>
            </div>
          </div>

          {distingueDias && <DiaToggle value={diaTipo} onChange={setDiaTipo} />}

          <div className="relative flex flex-wrap items-center gap-2">
            {!editando ? (
              <Button onClick={iniciarEdicion} disabled={!plan}>
                <span className="flex items-center gap-1.5">
                  <Pencil size={14} /> Editar dieta
                </span>
              </Button>
            ) : (
              <span className="text-xs font-medium text-pegasus-red">Editando {plan?.nombre || 'dieta cerrada'} {version !== null ? `v${version}` : ''}</span>
            )}
            <Button variant="secondary" onClick={() => setNuevaDietaAbierta((v) => !v)}>
              <span className="flex items-center gap-1.5">
                <Plus size={14} /> Nueva dieta
              </span>
            </Button>
            <Button variant="secondary" onClick={() => setGestorAbierto((v) => !v)} disabled={!plan}>
              <span className="flex items-center gap-1.5">
                <FolderOpen size={14} /> Guardar en gestor
              </span>
            </Button>
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-control border border-bg-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              aria-label="Más opciones"
            >
              <MoreVertical size={16} />
            </button>
            {menuAbierto && (
              <div className="absolute right-0 top-11 z-20 w-52 rounded-control border border-bg-border bg-bg-card py-1 shadow-xl">
                <MenuItem icon={History} label="Ver historial" onClick={() => { setHistorialCompleto(true); setMenuAbierto(false) }} />
                <MenuItem icon={Copy} label="Duplicar dieta" onClick={() => plan && crearDesdeVersion(plan)} disabled={!plan} />
                <MenuItem icon={Calendar} label="Programar nueva dieta" onClick={() => { setProgramarAbierto(true); setMenuAbierto(false) }} />
                <MenuItem icon={Archive} label="Archivar dieta" onClick={archivar} disabled={!plan} />
                <MenuItem icon={Trash2} label="Eliminar dieta" danger onClick={eliminar} disabled={!plan} confirm />
              </div>
            )}
          </div>
        </div>

        {editando && (
          <p className="mt-3 rounded-control border border-pegasus-red/20 bg-pegasus-redSoft px-3 py-2 text-xs text-pegasus-red">
            Los cambios se guardarán como una nueva versión. La versión anterior permanecerá disponible en el historial.
          </p>
        )}
      </Card>

      {nuevaDietaAbierta && (
        <NuevaDietaPanel
          plantillas={plantillas ?? []}
          historial={historial ?? []}
          onClose={() => setNuevaDietaAbierta(false)}
          onCrear={crearDesdeVersion}
          onCrearVacia={iniciarEdicion}
          onCrearDesdeGestor={crearDesdeGestor}
        />
      )}
      {gestorAbierto && plan && itemsPlan && (
        <GuardarEnGestorPanel
          onClose={() => setGestorAbierto(false)}
          onGuardar={async (meta) => {
            if (!session) return
            await saveClosedDietAsTemplate(session.user.id, itemsPlan, meta)
            await refetchPlantillas()
            setGestorAbierto(false)
          }}
        />
      )}
      {programarAbierto && (
        <ProgramarDietaPanel
          onClose={() => setProgramarAbierto(false)}
          onProgramar={async (fecha) => {
            if (!plan) return
            await crearDesdeVersion(plan, fecha)
            setProgramarAbierto(false)
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardLabel>Plan de alimentación</CardLabel>
            <div className="flex flex-col gap-3">
              {grupos.map((g, i) => (
                <ComidaCard
                  key={g.momento ?? `sin-horario-${i}`}
                  numero={i + 1}
                  icono={iconoParaMomento(i)}
                  momento={g.momento}
                  editando={editando}
                  enEdicion={editando && comidaEnEdicion === (g.momento ?? '')}
                  filas={g.filas}
                  onEditar={() => setComidaEnEdicion(g.momento ?? '')}
                  onCerrarEdicion={() => setComidaEnEdicion(null)}
                  onRenombrar={(nuevo) => renombrarComida(g.momento, nuevo)}
                  onCambiarFila={actualizarFila}
                  onBorrarFila={borrarFila}
                  onAnadirFila={() => anadirFilaAMomento(g.momento ?? '')}
                  onEliminarComida={() => eliminarComida(g.momento)}
                />
              ))}
              {grupos.length === 0 && <p className="text-sm text-text-muted">Todavía no hay comidas en este plan.</p>}
              {editando && (
                <button onClick={anadirComida} className="flex w-fit items-center gap-1.5 text-sm font-medium text-pegasus-red hover:text-pegasus-redDark">
                  <Plus size={15} /> Añadir comida
                </button>
              )}
            </div>
          </Card>

          {editando && (
            <Card>
              <CardLabel>Motivo del cambio (opcional)</CardLabel>
              <Field label="" value={motivoCambio} onChange={(e) => setMotivoCambio(e.target.value)} placeholder="Ej. Reducción de cantidades tras revisión semanal." />
            </Card>
          )}

          <CoachNoteCard notas={notas} readOnly={!editando} onChange={setNotas} />

          {editando && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={cancelarEdicion} disabled={guardando} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={guardarComoNuevaVersion} disabled={guardando} className="w-full sm:w-auto">
                Guardar cambios
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardLabel>Acciones rápidas</CardLabel>
            <div className="flex flex-col gap-1.5">
              <SidebarAction icon={Pencil} label="Editar dieta" onClick={iniciarEdicion} disabled={!plan || editando} />
              <SidebarAction icon={Plus} label="Nueva dieta" onClick={() => setNuevaDietaAbierta(true)} />
              <SidebarAction icon={FolderOpen} label="Guardar en gestor" onClick={() => setGestorAbierto(true)} disabled={!plan} />
              <SidebarAction icon={MoreVertical} label="Más opciones" onClick={() => setMenuAbierto(true)} />
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <CardLabel icon={<History size={13} />}>Historial de dietas</CardLabel>
              <button onClick={() => setHistorialCompleto((v) => !v)} className="text-xs font-medium text-pegasus-red hover:text-pegasus-redDark">
                {historialCompleto ? 'Ver menos' : 'Ver todas'}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {[...(historial ?? [])]
                .reverse()
                .slice(0, historialCompleto ? undefined : 4)
                .map((v) => {
                  const esActiva = plan?.id === v.id
                  return (
                    <button
                      key={v.id}
                      onClick={() => verVersion(v)}
                      className="flex items-center justify-between rounded-control border border-bg-border px-3 py-2 text-left text-xs hover:border-pegasus-red/40"
                    >
                      <span className="flex items-center gap-1.5">
                        {esActiva && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                        <span className="font-medium text-text-primary">
                          {v.nombre || 'Dieta cerrada'} v{numeroVersion(historial ?? [], v.id)}
                        </span>
                        {v.archivada && <span className="text-text-muted">· Archivada</span>}
                        {esActiva && <span className="text-emerald-400">· Activa</span>}
                      </span>
                      <span className="text-text-muted">{formatFechaCorta(v.fecha)}</span>
                    </button>
                  )
                })}
              {(historial ?? []).length === 0 && <p className="text-xs text-text-muted">Sin versiones todavía.</p>}
            </div>
          </Card>

          {(programadas ?? []).length > 0 && (
            <Card>
              <CardLabel icon={<Calendar size={13} />}>Dietas programadas</CardLabel>
              <div className="flex flex-col gap-1.5">
                {(programadas ?? []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-control border border-bg-border px-3 py-2 text-xs">
                    <span className="text-text-primary">{p.nombre || 'Dieta cerrada'}</span>
                    <span className="text-text-muted">Inicio {formatFechaCorta(p.fecha)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardLabel icon={<Calendar size={13} />}>Programar nueva dieta</CardLabel>
            <p className="mb-2 text-xs text-text-muted">Prepara una nueva dieta y establece cuándo comenzará. La dieta actual sigue activa hasta esa fecha.</p>
            <Button variant="secondary" onClick={() => setProgramarAbierto(true)} className="w-full">
              Programar dieta
            </Button>
          </Card>
        </div>
      </div>

      {versionEnRevision && (
        <VersionPreviewPanel
          version={versionEnRevision}
          numero={numeroVersion(historial ?? [], versionEnRevision.id)}
          items={itemsVersionEnRevision}
          esActiva={plan?.id === versionEnRevision.id}
          guardando={guardando}
          onClose={() => setVersionEnRevision(null)}
          onDuplicar={() => crearDesdeVersion(versionEnRevision)}
          onCrearDesde={() => crearDesdeVersion(versionEnRevision)}
        />
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
  confirm,
}: {
  icon: typeof History
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  confirm?: boolean
}) {
  const [confirmando, setConfirmando] = useState(false)
  if (confirm && confirmando) {
    return (
      <div className="px-3 py-2 text-xs">
        <p className="mb-1.5 text-text-secondary">¿Eliminar esta dieta? Las versiones anteriores permanecerán disponibles en el historial.</p>
        <div className="flex gap-2">
          <button onClick={onClick} className="font-semibold text-pegasus-red hover:text-pegasus-redDark">
            Eliminar dieta
          </button>
          <button onClick={() => setConfirmando(false)} className="text-text-muted hover:text-text-secondary">
            Cancelar
          </button>
        </div>
      </div>
    )
  }
  return (
    <button
      onClick={() => (confirm ? setConfirmando(true) : onClick())}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
        danger ? 'text-pegasus-red hover:bg-pegasus-redSoft' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

function SidebarAction({ icon: Icon, label, onClick, disabled }: { icon: typeof History; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-40"
    >
      <Icon size={14} /> {label}
    </button>
  )
}

function ComidaCard({
  numero,
  icono: Icono,
  momento,
  editando,
  enEdicion,
  filas,
  onEditar,
  onCerrarEdicion,
  onRenombrar,
  onCambiarFila,
  onBorrarFila,
  onAnadirFila,
  onEliminarComida,
}: {
  numero: number
  icono: typeof Sun
  momento: string | null
  editando: boolean
  enEdicion: boolean
  filas: FilaAlimento[]
  onEditar: () => void
  onCerrarEdicion: () => void
  onRenombrar: (nuevo: string) => void
  onCambiarFila: (key: string, patch: Partial<FilaAlimento>) => void
  onBorrarFila: (key: string) => void
  onAnadirFila: () => void
  onEliminarComida: () => void
}) {
  const [menuComida, setMenuComida] = useState(false)
  const [nombreLocal, setNombreLocal] = useState(momento ?? '')

  return (
    <div className="rounded-card border border-bg-border bg-bg-panel/40 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bg-card text-pegasus-red">
            <Icono size={15} />
          </div>
          {enEdicion ? (
            <input
              value={nombreLocal}
              onChange={(e) => setNombreLocal(e.target.value)}
              onBlur={() => onRenombrar(nombreLocal)}
              placeholder="Ej. 06:00 · Desayuno"
              className="rounded-control border border-bg-border bg-bg-card px-2 py-1 text-sm font-semibold text-text-primary outline-none focus:border-pegasus-red"
            />
          ) : (
            <span className="text-sm font-semibold text-text-primary">{momento || `Comida ${numero}`}</span>
          )}
        </div>
        {editando && (
          <div className="relative flex items-center gap-1">
            {!enEdicion && (
              <button onClick={onEditar} className="rounded-control border border-bg-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-pegasus-red/40 hover:text-pegasus-red">
                Editar comida
              </button>
            )}
            <button onClick={() => setMenuComida((v) => !v)} className="rounded-control p-1.5 text-text-muted hover:text-text-primary" aria-label="Más opciones de la comida">
              <MoreVertical size={14} />
            </button>
            {menuComida && (
              <div className="absolute right-0 top-8 z-10 w-40 rounded-control border border-bg-border bg-bg-card py-1 shadow-xl">
                <MenuItem icon={Pencil} label="Editar" onClick={() => { onEditar(); setMenuComida(false) }} />
                <MenuItem icon={Trash2} label="Eliminar" danger onClick={() => { onEliminarComida(); setMenuComida(false) }} />
              </div>
            )}
          </div>
        )}
      </div>

      {enEdicion ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_5rem_4.5rem_1.5rem] items-center gap-1.5 px-1 text-[11px] uppercase tracking-wide text-text-muted">
            <span>Alimento</span>
            <span>Cantidad</span>
            <span>Unidad</span>
            <span />
          </div>
          {filas.map((f) => (
            <div key={f.key} className="grid grid-cols-[1fr_5rem_4.5rem_1.5rem] items-center gap-1.5">
              <input
                value={f.alimento}
                onChange={(e) => onCambiarFila(f.key, { alimento: e.target.value })}
                placeholder="Ej. Avena"
                className="rounded-control border border-bg-border bg-bg-card px-2 py-1.5 text-sm text-text-primary outline-none focus:border-pegasus-red"
              />
              <input
                type="number"
                value={f.cantidad}
                onChange={(e) => onCambiarFila(f.key, { cantidad: e.target.value })}
                className="w-full rounded-control border border-bg-border bg-bg-card px-2 py-1.5 text-sm text-text-primary outline-none focus:border-pegasus-red"
              />
              <input
                value={f.unidad}
                onChange={(e) => onCambiarFila(f.key, { unidad: e.target.value })}
                placeholder="g"
                className="w-full rounded-control border border-bg-border bg-bg-card px-2 py-1.5 text-sm text-text-primary outline-none focus:border-pegasus-red"
              />
              <button onClick={() => onBorrarFila(f.key)} className="text-text-muted hover:text-pegasus-red" aria-label="Eliminar alimento">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between">
            <button onClick={onAnadirFila} className="flex items-center gap-1 text-xs font-medium text-pegasus-red hover:text-pegasus-redDark">
              <Plus size={12} /> Añadir alimento
            </button>
            <button onClick={onCerrarEdicion} className="text-xs text-text-muted hover:text-text-secondary">
              Listo
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filas.length === 0 && <p className="text-xs text-text-muted">Sin alimentos.</p>}
          {filas.map((f) => (
            <div key={f.key} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{f.alimento}</span>
              <span className="text-text-secondary">
                {f.cantidad} {f.unidad}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NuevaDietaPanel({
  plantillas,
  historial,
  onClose,
  onCrear,
  onCrearVacia,
  onCrearDesdeGestor,
}: {
  plantillas: { id: string; nombre: string }[]
  historial: ClosedDietPlan[]
  onClose: () => void
  onCrear: (v: ClosedDietPlan) => void
  onCrearVacia: () => void
  onCrearDesdeGestor: (templateId: string) => Promise<void>
}) {
  const [creando, setCreando] = useState(false)

  async function desdeGestor(templateId: string) {
    setCreando(true)
    try {
      await onCrearDesdeGestor(templateId)
      onClose()
    } finally {
      setCreando(false)
    }
  }

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <CardLabel>Nueva dieta</CardLabel>
        <button onClick={onClose} className="text-xs text-text-muted hover:text-text-secondary">
          Cerrar
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            onCrearVacia()
            onClose()
          }}
        >
          Crear desde cero
        </Button>
        {historial[historial.length - 1] && (
          <Button
            variant="secondary"
            onClick={() => {
              onCrear(historial[historial.length - 1])
              onClose()
            }}
            disabled={creando}
          >
            Crear a partir de la dieta actual
          </Button>
        )}
      </div>
      {plantillas.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-text-secondary">O desde una dieta del Gestor de dietas:</p>
          <div className="flex flex-wrap gap-2">
            {plantillas.map((p) => (
              <button
                key={p.id}
                onClick={() => desdeGestor(p.id)}
                disabled={creando}
                className="rounded-control border border-bg-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-pegasus-red/40 hover:text-pegasus-red"
              >
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function GuardarEnGestorPanel({ onClose, onGuardar }: { onClose: () => void; onGuardar: (meta: { nombre: string; categoria: string | null; descripcion: string | null }) => void }) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!nombre.trim()) return
    setGuardando(true)
    try {
      await onGuardar({ nombre: nombre.trim(), categoria: categoria.trim() || null, descripcion: descripcion.trim() || null })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <CardLabel icon={<FolderOpen size={13} />}>Guardar en gestor</CardLabel>
        <button onClick={onClose} className="text-xs text-text-muted hover:text-text-secondary">
          Cerrar
        </button>
      </div>
      <p className="mb-3 text-xs text-text-muted">Guarda esta dieta como plantilla reutilizable — podrás usarla para crear la dieta de otros clientes.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Dieta definición estándar" />
        <Field label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej. Definición" />
        <Field label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={guardar} disabled={guardando || !nombre.trim()}>
          Guardar en gestor
        </Button>
      </div>
    </Card>
  )
}

function ProgramarDietaPanel({ onClose, onProgramar }: { onClose: () => void; onProgramar: (fecha: string) => void }) {
  const [fecha, setFecha] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function programar() {
    if (!fecha) return
    setGuardando(true)
    try {
      await onProgramar(fecha)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <CardLabel icon={<Calendar size={13} />}>Programar nueva dieta</CardLabel>
        <button onClick={onClose} className="text-xs text-text-muted hover:text-text-secondary">
          Cerrar
        </button>
      </div>
      <p className="mb-3 text-xs text-text-muted">Se creará una copia de la dieta actual con fecha de inicio futura. La dieta activa de hoy sigue vigente hasta entonces.</p>
      <div className="flex items-end gap-3">
        <Field label="Inicio" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <Button onClick={programar} disabled={guardando || !fecha}>
          Programar dieta
        </Button>
      </div>
    </Card>
  )
}

function VersionPreviewPanel({
  version,
  numero,
  items,
  esActiva,
  guardando,
  onClose,
  onDuplicar,
  onCrearDesde,
}: {
  version: ClosedDietPlan
  numero: number
  items: ClosedDietItem[] | null
  esActiva: boolean
  guardando: boolean
  onClose: () => void
  onDuplicar: () => void
  onCrearDesde: () => void
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-card border border-bg-border bg-bg-card p-5 sm:rounded-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-primary">{version.nombre || 'Dieta cerrada'} v{numero}</span>
              {esActiva && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">Activa</span>}
            </div>
            <p className="text-xs text-text-muted">{formatFechaCorta(version.fecha)}</p>
          </div>
          <button onClick={onClose} className="text-xs text-text-muted hover:text-text-secondary">
            Cerrar
          </button>
        </div>
        {version.motivoCambio && <p className="mb-3 text-xs italic text-text-secondary">"{version.motivoCambio}"</p>}
        {items === null ? <p className="text-sm text-text-muted">Cargando…</p> : <ClosedDietTimeline items={items} />}
        {!esActiva && (
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onDuplicar} disabled={guardando}>
              <span className="flex items-center gap-1.5">
                <Copy size={13} /> Duplicar esta versión
              </span>
            </Button>
            <Button onClick={onCrearDesde} disabled={guardando}>
              <span className="flex items-center gap-1.5">
                <ChevronDown size={13} className="rotate-180" /> Crear nueva dieta desde esta versión
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
