// Pestaña "Entrenamiento" de la ficha del cliente — control total del entrenador
// (ver supabase/migrations/0007_control_total_entrenador.sql y
// src/lib/supabase/trackerWriteRepo.ts). Dos sub-vistas:
//   - Ejecución: lo que el cliente ya ha entrenado (workouts/sets), ahora editable.
//   - Planificación: ejercicios y rutinas (templates) que el entrenador prepara para
//     el cliente — funcionalidad nueva, no existía nada de esto en Coach.
// Modelo ADITIVO: el cliente conserva su propio acceso de escritura en Tracker sin
// cambios — esto es una capa adicional, nunca una sustitución.
import { useState } from 'react'
import { ChevronDown, ChevronRight, Dumbbell, ListChecks, Plus, Trash2 } from 'lucide-react'
import { useExercisesCliente, useTemplateExercises, useTemplatesCliente, useWorkoutsCliente } from '@/hooks/useData'
import { useSession } from '@/lib/SessionContext'
import * as trackerWriteRepo from '@/lib/supabase/trackerWriteRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { formatFechaCorta, hoyIso } from '@/lib/format'
import type { TrackerExercise, TrackerTemplate } from '@/types'

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
      {sub === 'ejecucion' ? <EjecucionView /> : <PlanificacionView />}
    </div>
  )
}

// ---------------------------------------------------------------------
// Ejecución — entrenamiento ya registrado (workouts/workout_exercises/sets)
// ---------------------------------------------------------------------

function EjecucionView() {
  const { targetUserId } = useSession()
  const { data: workouts, loading, refetch } = useWorkoutsCliente()
  const { data: ejerciciosDisponibles } = useExercisesCliente()
  const [creando, setCreando] = useState(false)
  const [fecha, setFecha] = useState(hoyIso())
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function crearEntrenamiento() {
    if (!targetUserId) return
    setGuardando(true)
    try {
      await trackerWriteRepo.createWorkout(targetUserId, { userId: targetUserId, name: nombre || null, fecha, notas: '', completado: false, templateId: null })
      setNombre('')
      setCreando(false)
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  async function borrarEntrenamiento(id: string) {
    await trackerWriteRepo.deleteWorkout(id)
    await refetch()
  }

  if (loading) return <Card>Cargando…</Card>

  return (
    <div className="flex flex-col gap-4">
      {creando ? (
        <Card>
          <CardLabel>Nuevo entrenamiento</CardLabel>
          <div className="flex items-end gap-3">
            <Field label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <Field label="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Push día 1" />
            <Button onClick={crearEntrenamiento} disabled={guardando}>
              Crear
            </Button>
            <Button variant="secondary" onClick={() => setCreando(false)} disabled={guardando}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setCreando(true)} className="w-fit">
          <span className="flex items-center gap-1.5">
            <Plus size={14} /> Registrar entrenamiento
          </span>
        </Button>
      )}

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
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">{formatFechaCorta(w.date)}</span>
              <BotonBorrar onConfirm={() => borrarEntrenamiento(w.id)} label="Eliminar entrenamiento" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {w.ejercicios.map((ej) => (
              <EjercicioEjecucion key={ej.id} workoutId={w.id} ejercicio={ej} onChange={refetch} />
            ))}
            <AnadirEjercicioAEntrenamiento workoutId={w.id} ejerciciosDisponibles={ejerciciosDisponibles ?? []} sortOrder={w.ejercicios.length} onAdded={refetch} />
          </div>
        </Card>
      ))}
    </div>
  )
}

function EjercicioEjecucion({
  workoutId,
  ejercicio,
  onChange,
}: {
  workoutId: string
  ejercicio: { id: string; exerciseNombre: string | null; sets: { id: string; setNumber: number; weight: number | null; reps: number | null; rir: number | null; done: boolean }[] }
  onChange: () => void
}) {
  const { targetUserId } = useSession()

  async function actualizarSet(id: string, patch: Partial<{ weight: number | null; reps: number | null; rir: number | null; done: boolean }>) {
    await trackerWriteRepo.updateSet(id, patch)
    onChange()
  }

  async function borrarSet(id: string) {
    await trackerWriteRepo.deleteSet(id)
    onChange()
  }

  async function anadirSerie() {
    if (!targetUserId) return
    const numero = ejercicio.sets.length + 1
    await trackerWriteRepo.addSet(targetUserId, ejercicio.id, numero, { workoutExerciseId: ejercicio.id, setNumber: numero, weight: null, reps: null, rir: null, done: false, notas: '' })
    onChange()
  }

  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">{ejercicio.exerciseNombre || 'Ejercicio'}</div>
      <div className="flex flex-col gap-1.5">
        {ejercicio.sets.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 rounded-control border border-bg-border bg-bg-panel/60 px-2.5 py-1.5 text-xs">
            <span className="w-4 text-text-muted">{i + 1}</span>
            <input
              type="number"
              defaultValue={s.weight ?? ''}
              onBlur={(e) => actualizarSet(s.id, { weight: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="kg"
              className="w-16 rounded-[6px] border border-bg-border bg-bg-card px-1.5 py-1 text-text-primary outline-none focus:border-pegasus-red"
            />
            <span className="text-text-muted">×</span>
            <input
              type="number"
              defaultValue={s.reps ?? ''}
              onBlur={(e) => actualizarSet(s.id, { reps: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="reps"
              className="w-14 rounded-[6px] border border-bg-border bg-bg-card px-1.5 py-1 text-text-primary outline-none focus:border-pegasus-red"
            />
            <span className="text-text-muted">RIR</span>
            <input
              type="number"
              defaultValue={s.rir ?? ''}
              onBlur={(e) => actualizarSet(s.id, { rir: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="—"
              className="w-12 rounded-[6px] border border-bg-border bg-bg-card px-1.5 py-1 text-text-primary outline-none focus:border-pegasus-red"
            />
            <label className="ml-1 flex items-center gap-1 text-text-secondary">
              <input type="checkbox" checked={s.done} onChange={(e) => actualizarSet(s.id, { done: e.target.checked })} />
              Hecha
            </label>
            <span className="flex-1" />
            <BotonBorrar onConfirm={() => borrarSet(s.id)} label="Eliminar serie" />
          </div>
        ))}
        <button onClick={anadirSerie} className="flex w-fit items-center gap-1 text-xs font-medium text-pegasus-red hover:text-pegasus-redDark">
          <Plus size={12} /> Añadir serie
        </button>
      </div>
    </div>
  )
}

function AnadirEjercicioAEntrenamiento({
  workoutId,
  ejerciciosDisponibles,
  sortOrder,
  onAdded,
}: {
  workoutId: string
  ejerciciosDisponibles: TrackerExercise[]
  sortOrder: number
  onAdded: () => void
}) {
  const { targetUserId } = useSession()
  const [abierto, setAbierto] = useState(false)
  const [seleccionId, setSeleccionId] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')

  async function anadir() {
    if (!targetUserId) return
    let exerciseId = seleccionId
    if (!exerciseId && nuevoNombre.trim()) {
      const creado = await trackerWriteRepo.createExercise(targetUserId, { userId: targetUserId, name: nuevoNombre, muscleGroup: '', notes: '', archived: false })
      exerciseId = creado.id
    }
    if (!exerciseId) return
    await trackerWriteRepo.addWorkoutExercise(targetUserId, workoutId, exerciseId, sortOrder)
    setSeleccionId('')
    setNuevoNombre('')
    setAbierto(false)
    onAdded()
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex w-fit items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-pegasus-red">
        <Plus size={13} /> Añadir ejercicio
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-control border border-bg-border bg-bg-panel/60 p-2.5">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-text-secondary">Ejercicio existente</span>
        <select
          value={seleccionId}
          onChange={(e) => setSeleccionId(e.target.value)}
          className="rounded-control border border-bg-border bg-bg-panel px-2 py-1.5 text-sm text-text-primary outline-none"
        >
          <option value="">— elegir —</option>
          {ejerciciosDisponibles.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </label>
      <span className="pb-2 text-xs text-text-muted">o</span>
      <Field label="Ejercicio nuevo" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre" />
      <Button onClick={anadir} disabled={!seleccionId && !nuevoNombre.trim()}>
        Añadir
      </Button>
      <Button variant="secondary" onClick={() => setAbierto(false)}>
        Cancelar
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------
// Planificación — ejercicios y rutinas (templates) preparadas por el entrenador
// ---------------------------------------------------------------------

function PlanificacionView() {
  const { data: templates, refetch: refetchTemplates } = useTemplatesCliente()
  const { data: ejercicios, refetch: refetchEjercicios } = useExercisesCliente()
  const [templateAbierto, setTemplateAbierto] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-4">
        <CardLabel icon={<ListChecks size={13} />}>Rutinas asignadas</CardLabel>
        <NuevaRutina onCreated={refetchTemplates} />
        {(templates ?? []).map((t) => (
          <RutinaCard
            key={t.id}
            template={t}
            ejerciciosDisponibles={ejercicios ?? []}
            abierta={templateAbierto === t.id}
            onToggle={() => setTemplateAbierto(templateAbierto === t.id ? null : t.id)}
            onDeleted={refetchTemplates}
          />
        ))}
        {(templates ?? []).length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">Este cliente todavía no tiene ninguna rutina asignada.</p>
          </Card>
        )}
      </div>

      <BibliotecaEjercicios ejercicios={ejercicios ?? []} onChange={refetchEjercicios} />
    </div>
  )
}

function NuevaRutina({ onCreated }: { onCreated: () => void }) {
  const { session, targetUserId } = useSession()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function crear() {
    if (!targetUserId || !session) return
    setGuardando(true)
    try {
      await trackerWriteRepo.createTemplate(targetUserId, { userId: targetUserId, name: nombre, description: '', assignedBy: session.user.id }, session.user.id)
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
        <Field label="Nombre de la rutina" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Día 1 · Pierna" />
        <Button onClick={crear} disabled={guardando || !nombre.trim()}>
          Crear
        </Button>
        <Button variant="secondary" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}

function RutinaCard({
  template,
  ejerciciosDisponibles,
  abierta,
  onToggle,
  onDeleted,
}: {
  template: TrackerTemplate
  ejerciciosDisponibles: TrackerExercise[]
  abierta: boolean
  onToggle: () => void
  onDeleted: () => void
}) {
  const { data: templateExercises, refetch } = useTemplateExercises(abierta ? template.id : null)
  const [seleccionId, setSeleccionId] = useState('')

  async function borrarRutina() {
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
        <BotonBorrar onConfirm={borrarRutina} label="Eliminar rutina" />
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
              <Plus size={13} /> Añadir a la rutina
            </button>
          </div>
        </div>
      )}
    </Card>
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
