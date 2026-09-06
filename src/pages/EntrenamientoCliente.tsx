// Pestaña "Entrenamiento" de la ficha del cliente. Dos sub-vistas:
//   - Ejecución: SOLO CONSULTA de lo que el cliente ya ha entrenado (workouts/
//     sets) en Pegasus Tracker — el entrenador puede verlo, nunca modificarlo.
//     La ejecución (registrar/editar peso, reps, RIR, series hechas) es
//     responsabilidad de Tracker, no de Coach (ver
//     supabase/migrations/0009_revertir_ejecucion_entrenador.sql).
//   - Planificación: ejercicios y rutinas (templates) que el entrenador prepara
//     para el cliente — el entrenador SÍ puede crear/editar/borrar aquí.
import { useState } from 'react'
import { Archive, ArchiveRestore, ArrowLeft, ChevronDown, ChevronRight, Copy, Dumbbell, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { useExercisesCliente, useRoutinesCliente, useTemplateExercises, useTemplatesCliente, useWorkoutsCliente } from '@/hooks/useData'
import { useSession } from '@/lib/SessionContext'
import * as trackerWriteRepo from '@/lib/supabase/trackerWriteRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { formatFechaCorta } from '@/lib/format'
import type { TrackerExercise, TrackerRoutine, TrackerTemplate } from '@/types'

/** Botón de borrar con confirmación inline — mismo patrón (sin modal) que ya usa el
 * resto de Coach (Ajustes.tsx, TipoNutricionCard) para no introducir un sistema de
 * modales nuevo. */
function BotonBorrar({ onConfirm, label = 'Eliminar' }: { onConfirm: () => void; label?: string }) {
  const [confirmando, setConfirmando] = useState(false)
  if (confirmando) {
    return (
      <span className="flex items-center gap-1.5 text-xs">
        <span className="text-text-muted">¿Seguro?</span>
        <button onClick={onConfirm} className="font-semibold text-pegasus-red hover:text-pegasus-redDark">
          Sí, {label.toLowerCase()}
        </button>
        <button onClick={() => setConfirmando(false)} className="text-text-muted hover:text-text-secondary">
          Cancelar
        </button>
      </span>
    )
  }
  return (
    <button onClick={() => setConfirmando(true)} className="text-text-muted hover:text-pegasus-red" title={label}>
      <Trash2 size={14} />
    </button>
  )
}

export function EntrenamientoCliente() {
  const [sub, setSub] = useState<'ejecucion' | 'planificacion'>('ejecucion')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-control bg-bg-panel p-1 w-fit">
        {(
          [
            { key: 'ejecucion', label: 'Ejecución' },
            { key: 'planificacion', label: 'Planificación' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`rounded-[8px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              sub === t.key ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div key={sub} className="tab-fade">
        {sub === 'ejecucion' ? <EjecucionView /> : <PlanificacionView />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Ejecución — SOLO CONSULTA del entrenamiento ya registrado por el cliente
// (workouts/workout_exercises/sets). Sin crear, editar ni borrar desde Coach.
// ---------------------------------------------------------------------

function EjecucionView() {
  const { data: workouts, loading } = useWorkoutsCliente()

  if (loading) return <Card>Cargando…</Card>

  return (
    <div className="flex flex-col gap-4">
      {(!workouts || workouts.length === 0) && (
        <Card>
          <CardLabel icon={<Dumbbell size={13} />}>Entrenamiento</CardLabel>
          <p className="text-sm text-text-muted">Este cliente todavía no tiene entrenamientos registrados en Pegasus Tracker.</p>
        </Card>
      )}

      {(workouts ?? []).map((w) => (
        <Card key={w.id}>
          <div className="mb-3 flex items-center justify-between">
            <CardLabel icon={<Dumbbell size={13} />}>{w.name || 'Entrenamiento'}</CardLabel>
            <span className="text-xs text-text-muted">{formatFechaCorta(w.date)}</span>
          </div>
          <div className="flex flex-col gap-3">
            {w.ejercicios.map((ej) => (
              <div key={ej.id}>
                <div className="mb-1.5 text-sm font-medium">{ej.exerciseNombre || 'Ejercicio'}</div>
                <div className="flex flex-col gap-1.5">
                  {ej.sets.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-control border border-bg-border bg-bg-panel/60 px-2.5 py-1.5 text-xs text-text-secondary">
                      <span className="w-4 text-text-muted">{i + 1}</span>
                      <span>{s.weight ?? '—'} kg</span>
                      <span className="text-text-muted">×</span>
                      <span>{s.reps ?? '—'} reps</span>
                      <span className="text-text-muted">· RIR {s.rir ?? '—'}</span>
                      <span className="ml-auto">{s.done ? '✓ Hecha' : 'Pendiente'}</span>
                    </div>
                  ))}
                  {ej.sets.length === 0 && <p className="text-xs text-text-muted">Sin series registradas.</p>}
                </div>
              </div>
            ))}
            {w.ejercicios.length === 0 && <p className="text-xs text-text-muted">Sin ejercicios registrados.</p>}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------
// Planificación — Rutina > Día > Ejercicios. Una Rutina (template_routines)
// agrupa varios Días (templates); cada Día conserva exactamente la misma
// gestión de ejercicios que ya existía (DiaCard/TemplateExerciseRow, antes
// llamados RutinaCard porque un template suelto SE MOSTRABA como si fuera
// una rutina). Ver supabase/migrations/0011_rutinas_planificacion.sql.
// ---------------------------------------------------------------------

function PlanificacionView() {
  const { data: rutinas, refetch: refetchRutinas } = useRoutinesCliente()
  const { data: templates, refetch: refetchTemplates } = useTemplatesCliente()
  const { data: ejercicios, refetch: refetchEjercicios } = useExercisesCliente()
  const [rutinaAbiertaId, setRutinaAbiertaId] = useState<string | null>(null)
  const [gestorAbierto, setGestorAbierto] = useState(false)

  function refetchTodo() {
    refetchRutinas()
    refetchTemplates()
  }

  const rutinaAbierta = rutinaAbiertaId ? (rutinas ?? []).find((r) => r.id === rutinaAbiertaId) ?? null : null

  if (gestorAbierto) {
    return (
      <GestorEntrenos
        rutinas={rutinas ?? []}
        templates={templates ?? []}
        onVolver={() => setGestorAbierto(false)}
        onChange={refetchTodo}
      />
    )
  }

  if (rutinaAbierta) {
    return (
      <RutinaDetailView
        rutina={rutinaAbierta}
        dias={(templates ?? []).filter((t) => t.routineId === rutinaAbierta.id)}
        ejerciciosDisponibles={ejercicios ?? []}
        onVolver={() => setRutinaAbiertaId(null)}
        onRutinaChange={refetchRutinas}
        onDiasChange={refetchTemplates}
      />
    )
  }

  const rutinasActivas = (rutinas ?? []).filter((r) => !r.archivedAt)
  const diasSueltos = (templates ?? []).filter((t) => !t.routineId)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <CardLabel icon={<ListChecks size={13} />}>Rutinas asignadas</CardLabel>
          <Button variant="secondary" onClick={() => setGestorAbierto(true)}>
            Gestor de entrenos
          </Button>
        </div>

        <NuevaRutinaForm onCreated={refetchRutinas} />

        {rutinasActivas.map((r) => (
          <RutinaResumenCard
            key={r.id}
            rutina={r}
            dias={(templates ?? []).filter((t) => t.routineId === r.id)}
            onEditar={() => setRutinaAbiertaId(r.id)}
            onArchivar={async () => {
              await trackerWriteRepo.archiveRoutine(r.id)
              refetchRutinas()
            }}
            onEliminar={async () => {
              await trackerWriteRepo.deleteRoutine(r.id)
              refetchTodo()
            }}
          />
        ))}
        {rutinasActivas.length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">Este cliente todavía no tiene ninguna rutina asignada.</p>
          </Card>
        )}

        {diasSueltos.length > 0 && (
          <div className="flex flex-col gap-2">
            <CardLabel>Días sueltos (sin rutina)</CardLabel>
            {diasSueltos.map((dia) => (
              <DiaSueltoCard key={dia.id} dia={dia} rutinas={rutinasActivas} onMovido={refetchTemplates} />
            ))}
          </div>
        )}
      </div>

      <BibliotecaEjercicios ejercicios={ejercicios ?? []} onChange={refetchEjercicios} />
    </div>
  )
}

function NuevaRutinaForm({ onCreated }: { onCreated: () => void }) {
  const { targetUserId } = useSession()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function crear() {
    if (!targetUserId) return
    setGuardando(true)
    try {
      await trackerWriteRepo.createRoutine(targetUserId, { userId: targetUserId, name: nombre, sortOrder: 0 })
      setNombre('')
      setAbierto(false)
      onCreated()
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <Button variant="secondary" onClick={() => setAbierto(true)} className="w-fit">
        <span className="flex items-center gap-1.5">
          <Plus size={14} /> Nueva rutina
        </span>
      </Button>
    )
  }

  return (
    <Card>
      <div className="flex items-end gap-3">
        <Field label="Nombre de la rutina" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Rutina Fuerza A" />
        <Button onClick={crear} disabled={guardando || !nombre.trim()}>
          Crear rutina
        </Button>
        <Button variant="secondary" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}

function RutinaResumenCard({
  rutina,
  dias,
  onEditar,
  onArchivar,
  onEliminar,
}: {
  rutina: TrackerRoutine
  dias: TrackerTemplate[]
  onEditar: () => void
  onArchivar: () => void
  onEliminar: () => void
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">{rutina.name}</div>
          <div className="mt-1 text-xs text-text-muted">{dias.length > 0 ? dias.map((d) => d.name).join(' · ') : 'Sin días todavía'}</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onEditar} className="flex items-center gap-1 text-xs font-semibold text-pegasus-red hover:text-pegasus-redDark">
            <Pencil size={13} /> Editar
          </button>
          <button onClick={onArchivar} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary">
            <Archive size={13} /> Archivar
          </button>
          <BotonBorrar onConfirm={onEliminar} label="Eliminar rutina" />
        </div>
      </div>
    </Card>
  )
}

function DiaSueltoCard({ dia, rutinas, onMovido }: { dia: TrackerTemplate; rutinas: TrackerRoutine[]; onMovido: () => void }) {
  const [seleccionId, setSeleccionId] = useState('')

  async function mover() {
    if (!seleccionId) return
    await trackerWriteRepo.updateTemplate(dia.id, { routineId: seleccionId })
    setSeleccionId('')
    onMovido()
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{dia.name}</span>
        <div className="flex items-center gap-2">
          <select
            value={seleccionId}
            onChange={(e) => setSeleccionId(e.target.value)}
            className="rounded-control border border-bg-border bg-bg-panel px-2 py-1.5 text-xs text-text-primary outline-none"
          >
            <option value="">— mover a rutina —</option>
            {rutinas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button onClick={mover} disabled={!seleccionId} className="text-xs font-semibold text-pegasus-red hover:text-pegasus-redDark disabled:opacity-40">
            Mover
          </button>
        </div>
      </div>
    </Card>
  )
}

function RutinaDetailView({
  rutina,
  dias,
  ejerciciosDisponibles,
  onVolver,
  onRutinaChange,
  onDiasChange,
}: {
  rutina: TrackerRoutine
  dias: TrackerTemplate[]
  ejerciciosDisponibles: TrackerExercise[]
  onVolver: () => void
  onRutinaChange: () => void
  onDiasChange: () => void
}) {
  const { session, targetUserId } = useSession()
  const [nombre, setNombre] = useState(rutina.name)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [diaAbiertoId, setDiaAbiertoId] = useState<string | null>(null)

  async function guardarNombre() {
    if (!nombre.trim() || nombre === rutina.name) {
      setEditandoNombre(false)
      return
    }
    await trackerWriteRepo.renameRoutine(rutina.id, nombre)
    setEditandoNombre(false)
    onRutinaChange()
  }

  async function anadirDia() {
    if (!targetUserId || !session) return
    await trackerWriteRepo.createTemplate(
      targetUserId,
      { userId: targetUserId, name: `Día ${dias.length + 1}`, description: '', assignedBy: session.user.id, routineId: rutina.id },
      session.user.id,
    )
    onDiasChange()
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onVolver} className="flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={15} /> Volver a rutinas
      </button>

      {editandoNombre ? (
        <div className="flex items-end gap-3">
          <Field label="Nombre de la rutina" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Button onClick={guardarNombre}>Guardar</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setNombre(rutina.name)
              setEditandoNombre(false)
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <button onClick={() => setEditandoNombre(true)} className="flex w-fit items-center gap-2 text-lg font-bold text-text-primary hover:text-pegasus-red">
          {rutina.name}
          <Pencil size={14} className="text-text-muted" />
        </button>
      )}

      <div className="flex flex-col gap-3">
        {dias.map((dia) => (
          <DiaCard
            key={dia.id}
            template={dia}
            ejerciciosDisponibles={ejerciciosDisponibles}
            abierta={diaAbiertoId === dia.id}
            onToggle={() => setDiaAbiertoId(diaAbiertoId === dia.id ? null : dia.id)}
            onDuplicar={async () => {
              if (!targetUserId || !session) return
              await trackerWriteRepo.duplicateTemplate(targetUserId, dia, session.user.id)
              onDiasChange()
            }}
            onDeleted={onDiasChange}
          />
        ))}
        {dias.length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">Esta rutina todavía no tiene ningún día.</p>
          </Card>
        )}
      </div>

      <Button variant="secondary" onClick={anadirDia} className="w-fit">
        <span className="flex items-center gap-1.5">
          <Plus size={14} /> Añadir día
        </span>
      </Button>
    </div>
  )
}

function DiaCard({
  template,
  ejerciciosDisponibles,
  abierta,
  onToggle,
  onDuplicar,
  onDeleted,
}: {
  template: TrackerTemplate
  ejerciciosDisponibles: TrackerExercise[]
  abierta: boolean
  onToggle: () => void
  onDuplicar: () => void
  onDeleted: () => void
}) {
  const { data: templateExercises, refetch } = useTemplateExercises(abierta ? template.id : null)
  const [seleccionId, setSeleccionId] = useState('')

  async function borrarDia() {
    await trackerWriteRepo.deleteTemplate(template.id)
    onDeleted()
  }

  async function anadirEjercicio() {
    if (!seleccionId) return
    await trackerWriteRepo.addTemplateExercise({
      templateId: template.id,
      exerciseId: seleccionId,
      sortOrder: templateExercises?.length ?? 0,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
    })
    setSeleccionId('')
    refetch()
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <button onClick={onToggle} className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          {abierta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          {template.name}
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onDuplicar} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary" title="Duplicar día">
            <Copy size={13} /> Duplicar
          </button>
          <BotonBorrar onConfirm={borrarDia} label="Eliminar día" />
        </div>
      </div>
      {abierta && (
        <div className="mt-3 flex flex-col gap-2">
          {(templateExercises ?? []).map((te) => (
            <TemplateExerciseRow key={te.id} templateExercise={te} onChange={refetch} />
          ))}
          <div className="flex items-center gap-2">
            <select
              value={seleccionId}
              onChange={(e) => setSeleccionId(e.target.value)}
              className="rounded-control border border-bg-border bg-bg-panel px-2 py-1.5 text-sm text-text-primary outline-none"
            >
              <option value="">— elegir ejercicio —</option>
              {ejerciciosDisponibles.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            <button onClick={anadirEjercicio} disabled={!seleccionId} className="flex items-center gap-1 text-xs font-semibold text-pegasus-red hover:text-pegasus-redDark disabled:opacity-40">
              <Plus size={13} /> Añadir al día
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

function GestorEntrenos({
  rutinas,
  templates,
  onVolver,
  onChange,
}: {
  rutinas: TrackerRoutine[]
  templates: TrackerTemplate[]
  onVolver: () => void
  onChange: () => void
}) {
  const [tab, setTab] = useState<'archivadas' | 'todas'>('archivadas')
  const [busqueda, setBusqueda] = useState('')

  const listado = (tab === 'archivadas' ? rutinas.filter((r) => r.archivedAt) : rutinas).filter((r) =>
    r.name.toLowerCase().includes(busqueda.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onVolver} className="flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={15} /> Volver a Planificación
      </button>

      <CardLabel icon={<Archive size={13} />}>Gestor de entrenos</CardLabel>

      <div className="flex gap-1 rounded-control bg-bg-panel p-1 w-fit">
        {(
          [
            { key: 'archivadas', label: 'Archivadas' },
            { key: 'todas', label: 'Todas' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-[8px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Field label="Buscar rutina" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar rutina…" />

      <div className="flex flex-col gap-3">
        {listado.map((r) => {
          const dias = templates.filter((t) => t.routineId === r.id)
          return (
            <Card key={r.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text-primary">{r.name}</div>
                  <div className="mt-1 text-xs text-text-muted">{dias.length > 0 ? dias.map((d) => d.name).join(' · ') : 'Sin días'}</div>
                  {r.archivedAt && <div className="mt-1 text-xs text-text-muted">Archivada el {formatFechaCorta(r.archivedAt.slice(0, 10))}</div>}
                </div>
                <div className="flex items-center gap-3">
                  {r.archivedAt ? (
                    <button
                      onClick={async () => {
                        await trackerWriteRepo.unarchiveRoutine(r.id)
                        onChange()
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-pegasus-red hover:text-pegasus-redDark"
                    >
                      <ArchiveRestore size={13} /> Desarchivar
                    </button>
                  ) : (
                    <span className="text-xs text-text-muted">Activa</span>
                  )}
                  <BotonBorrar
                    onConfirm={async () => {
                      await trackerWriteRepo.deleteRoutine(r.id)
                      onChange()
                    }}
                    label="Eliminar definitivamente"
                  />
                </div>
              </div>
            </Card>
          )
        })}
        {listado.length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">No hay rutinas que mostrar.</p>
          </Card>
        )}
      </div>
    </div>
  )
}

function TemplateExerciseRow({
  templateExercise,
  onChange,
}: {
  templateExercise: { id: string; exerciseNombre?: string | null; targetSets: number; targetRepsMin: number | null; targetRepsMax: number | null }
  onChange: () => void
}) {
  async function actualizar(patch: Partial<{ targetSets: number; targetRepsMin: number | null; targetRepsMax: number | null }>) {
    await trackerWriteRepo.updateTemplateExercise(templateExercise.id, patch)
    onChange()
  }

  async function quitar() {
    await trackerWriteRepo.removeTemplateExercise(templateExercise.id)
    onChange()
  }

  return (
    <div className="flex items-center gap-2 rounded-control border border-bg-border bg-bg-panel/60 px-2.5 py-1.5 text-xs">
      <span className="flex-1 font-medium text-text-primary">{templateExercise.exerciseNombre || 'Ejercicio'}</span>
      <input
        type="number"
        defaultValue={templateExercise.targetSets}
        onBlur={(e) => actualizar({ targetSets: Number(e.target.value) || 1 })}
        className="w-12 rounded-[6px] border border-bg-border bg-bg-card px-1.5 py-1 text-text-primary outline-none focus:border-pegasus-red"
        title="Series objetivo"
      />
      <span className="text-text-muted">series ·</span>
      <input
        type="number"
        defaultValue={templateExercise.targetRepsMin ?? ''}
        onBlur={(e) => actualizar({ targetRepsMin: e.target.value === '' ? null : Number(e.target.value) })}
        placeholder="min"
        className="w-12 rounded-[6px] border border-bg-border bg-bg-card px-1.5 py-1 text-text-primary outline-none focus:border-pegasus-red"
      />
      <span className="text-text-muted">-</span>
      <input
        type="number"
        defaultValue={templateExercise.targetRepsMax ?? ''}
        onBlur={(e) => actualizar({ targetRepsMax: e.target.value === '' ? null : Number(e.target.value) })}
        placeholder="max"
        className="w-12 rounded-[6px] border border-bg-border bg-bg-card px-1.5 py-1 text-text-primary outline-none focus:border-pegasus-red"
      />
      <span className="text-text-muted">reps</span>
      <span className="flex-1" />
      <BotonBorrar onConfirm={quitar} label="Quitar de la rutina" />
    </div>
  )
}

function BibliotecaEjercicios({ ejercicios, onChange }: { ejercicios: TrackerExercise[]; onChange: () => void }) {
  const { targetUserId } = useSession()
  const [busqueda, setBusqueda] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

  const filtrados = ejercicios.filter((e) => e.name.toLowerCase().includes(busqueda.toLowerCase()))

  async function crear() {
    if (!targetUserId || !nuevoNombre.trim()) return
    setGuardando(true)
    try {
      await trackerWriteRepo.createExercise(targetUserId, { userId: targetUserId, name: nuevoNombre, muscleGroup: '', notes: '', archived: false })
      setNuevoNombre('')
      onChange()
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(id: string) {
    await trackerWriteRepo.deleteExercise(id)
    onChange()
  }

  return (
    <Card>
      <CardLabel>Biblioteca de ejercicios</CardLabel>
      <Field label="Buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Filtrar…" />
      <div className="mt-3 flex max-h-80 flex-col gap-1.5 overflow-y-auto">
        {filtrados.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between rounded-control border border-bg-border px-2.5 py-1.5 text-sm">
            <span>{ex.name}</span>
            <BotonBorrar onConfirm={() => borrar(ex.id)} label="Eliminar ejercicio" />
          </div>
        ))}
        {filtrados.length === 0 && <p className="py-3 text-center text-xs text-text-muted">Sin ejercicios.</p>}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Field label="Nuevo ejercicio" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre" />
        <Button onClick={crear} disabled={guardando || !nuevoNombre.trim()}>
          Añadir
        </Button>
      </div>
    </Card>
  )
}
