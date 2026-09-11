// Ejecución — SOLO CONSULTA del entrenamiento ya registrado por el cliente en
// Pegasus Tracker (workouts/workout_exercises/sets). El entrenador nunca crea,
// edita ni borra nada aquí — ver supabase/migrations/0009_revertir_ejecucion_entrenador.sql
// y trackerReadRepo.ts. Todas las métricas se calculan a partir de datos reales
// (ver src/lib/entrenamientoCalc.ts) — nunca se muestra un dato inventado:
//   - Sin "tiempo transcurrido" ni "calorías": Tracker no registra duración de
//     sesión ni tiene ningún método de cálculo calórico, así que esas métricas
//     del mockup original se omiten en vez de inventarlas.
//   - Sin categoría de ejercicio ("Pecho · Compuesto"): el grupo muscular se
//     eliminó del todo de Tracker esta misma sesión (decisión explícita del
//     usuario) — no queda ningún dato de esa naturaleza que mostrar.
//   - El estado de una serie solo puede ser "hecha" o "pendiente" (Tracker no
//     distingue "en curso"/"omitida"/etc.) — se usan 2 iconos, no 5.
import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Dumbbell, History, LayoutList, ListChecks, Trophy } from 'lucide-react'
import { useExerciseHistory, useRoutinesCliente, useTemplatesCliente, useWorkoutHistoryByTemplate, useWorkoutsCliente } from '@/hooks/useData'
import { Card, CardLabel } from '@/components/ui/Card'
import { formatFechaCorta, formatNumero } from '@/lib/format'
import {
  calcularEjerciciosCompletados,
  calcularSeriesCompletadas,
  calcularVolumen,
  compararConSesionAnterior,
  esNuevoPR,
  mejorSet,
  serieRepresentativa,
} from '@/lib/entrenamientoCalc'
import type { TrackerExerciseHistorySet, TrackerWorkout, TrackerWorkoutExercise } from '@/types'

type WorkoutConEjercicios = TrackerWorkout & { ejercicios: TrackerWorkoutExercise[] }

// weight === 0 se trata igual que null: Tracker usa 0 como "sin peso rellenado", nunca como un
// peso real (mismo criterio que bestRecordsFromHistory en Pegasus_Tracker/js/core/stats.js).
function formatSerie(s: { weight: number | null; reps: number | null }): string {
  if (s.weight != null && s.weight > 0 && s.reps != null) return `${formatNumero(s.weight, 1)} kg × ${s.reps}`
  if (s.reps != null) return `Peso corporal × ${s.reps}`
  return '—'
}

function Stat({ label, value, destacado }: { label: string; value: string; destacado?: boolean }) {
  return (
    <div>
      <div className="text-xs text-text-muted">{label}</div>
      <div className={`font-medium ${destacado ? 'text-emerald-400' : 'text-text-primary'}`}>{value}</div>
    </div>
  )
}

export function EjecucionCliente() {
  const { data: workouts, loading } = useWorkoutsCliente()
  const { data: templates } = useTemplatesCliente()
  const { data: rutinas } = useRoutinesCliente()
  const [workoutIdSeleccionado, setWorkoutIdSeleccionado] = useState<string | null>(null)
  const [vistaCompleta, setVistaCompleta] = useState(false)

  if (loading) return <Card>Cargando…</Card>

  if (!workouts || workouts.length === 0) {
    return (
      <Card>
        <CardLabel icon={<Dumbbell size={13} />}>Entrenamiento</CardLabel>
        <p className="text-sm text-text-muted">Este cliente todavía no tiene entrenamientos registrados en Pegasus Tracker.</p>
      </Card>
    )
  }

  const actual = workouts.find((w) => w.id === workoutIdSeleccionado) ?? workouts[0]

  const dia = actual.templateId ? (templates ?? []).find((t) => t.id === actual.templateId) : null
  const rutina = dia?.routineId ? (rutinas ?? []).find((r) => r.id === dia.routineId) : null

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-3">
        <EjecucionHeader workout={actual} diaNombre={dia?.name ?? null} rutinaNombre={rutina?.name ?? null} />
        <ResumenSuperior workout={actual} />
        {vistaCompleta ? (
          <VistaCompleta workout={actual} onCerrar={() => setVistaCompleta(false)} />
        ) : (
          <ListaEjercicios workout={actual} onVerCompleta={() => setVistaCompleta(true)} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <HistorialRutina workoutActual={actual} onSeleccionar={setWorkoutIdSeleccionado} />
      </div>
    </div>
  )
}

function EjecucionHeader({
  workout,
  diaNombre,
  rutinaNombre,
}: {
  workout: WorkoutConEjercicios
  diaNombre: string | null
  rutinaNombre: string | null
}) {
  const { completados, total } = calcularEjerciciosCompletados(workout.ejercicios)
  const estado = workout.completed ? 'Finalizado' : completados > 0 ? 'En curso' : 'Pendiente'
  const estadoClase = workout.completed
    ? 'bg-emerald-400/15 text-emerald-400'
    : completados > 0
      ? 'bg-amber-400/15 text-amber-400'
      : 'bg-bg-panel text-text-muted'

  const titulo = rutinaNombre && diaNombre ? `${rutinaNombre} · ${diaNombre}` : diaNombre || workout.name || 'Entrenamiento'

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-pegasus-redSoft text-pegasus-red">
            <Dumbbell size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-text-primary">{titulo}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoClase}`}>{estado}</span>
            </div>
            <div className="mt-0.5 text-xs text-text-muted">
              {formatFechaCorta(workout.date)} · {total} ejercicio{total === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-text-primary">
            {completados}/{total}
          </div>
          <div className="text-xs text-text-muted">ejercicios completados</div>
        </div>
      </div>
    </Card>
  )
}

function ResumenSuperior({ workout }: { workout: WorkoutConEjercicios }) {
  const { completados, total } = calcularEjerciciosCompletados(workout.ejercicios)
  const { completadas, total: totalSeries } = calcularSeriesCompletadas(workout.ejercicios)
  const volumen = calcularVolumen(workout.ejercicios)

  return (
    <Card>
      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Stat label="Progreso" value={`${completados}/${total} ejercicios`} />
        <Stat label="Series" value={`${completadas}/${totalSeries}`} />
        <Stat label="Volumen" value={`${formatNumero(volumen, 0)} kg`} />
      </div>
    </Card>
  )
}

function ListaEjercicios({ workout, onVerCompleta }: { workout: WorkoutConEjercicios; onVerCompleta: () => void }) {
  const [abiertoId, setAbiertoId] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <CardLabel icon={<ListChecks size={13} />}>Ejercicios</CardLabel>
        <button onClick={onVerCompleta} className="flex items-center gap-1 text-xs font-semibold text-pegasus-red hover:text-pegasus-redDark">
          <LayoutList size={13} /> Vista completa
        </button>
      </div>
      {workout.ejercicios.map((ej, i) => (
        <EjercicioCard
          key={ej.id}
          numero={i + 1}
          ejercicio={ej}
          workoutId={workout.id}
          abierto={abiertoId === ej.id}
          onToggle={() => setAbiertoId(abiertoId === ej.id ? null : ej.id)}
        />
      ))}
      {workout.ejercicios.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">Sin ejercicios registrados.</p>
        </Card>
      )}
    </div>
  )
}

function EjercicioCard({
  numero,
  ejercicio,
  workoutId,
  abierto,
  onToggle,
}: {
  numero: number
  ejercicio: TrackerWorkoutExercise
  workoutId: string
  abierto: boolean
  onToggle: () => void
}) {
  const { data: historial } = useExerciseHistory(abierto ? ejercicio.exerciseId : null)
  const hechas = ejercicio.sets.filter((s) => s.done).length
  const totalSets = ejercicio.sets.length
  const ultima = [...ejercicio.sets].reverse().find((s) => s.done)

  const objetivoLabel =
    ejercicio.targetRepsMin != null || ejercicio.targetRepsMax != null
      ? `${totalSets} × ${ejercicio.targetRepsMin ?? '?'}${
          ejercicio.targetRepsMax != null && ejercicio.targetRepsMax !== ejercicio.targetRepsMin ? `-${ejercicio.targetRepsMax}` : ''
        }`
      : null

  const historialSesionesAnteriores: TrackerExerciseHistorySet[] = (historial ?? []).filter((h) => h.workoutId !== workoutId)
  const repActual = serieRepresentativa(ejercicio.sets)
  const comparacion = historial ? compararConSesionAnterior(repActual, historial, workoutId) : null
  const esPR = repActual ? esNuevoPR(repActual.weight, repActual.reps, historialSesionesAnteriores) : false
  const mejor = historial ? mejorSet(historialSesionesAnteriores) : null

  return (
    <Card>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-panel text-xs font-semibold text-text-secondary">
            {numero}
          </span>
          <div>
            <div className="text-sm font-semibold text-text-primary">{ejercicio.exerciseNombre || 'Ejercicio'}</div>
            <div className="mt-0.5 text-xs text-text-muted">
              {totalSets} serie{totalSets === 1 ? '' : 's'}
              {ultima ? ` · ${formatSerie(ultima)}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {esPR && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
              <Trophy size={12} /> PR
            </span>
          )}
          <div className="hidden items-center gap-1 sm:flex">
            {ejercicio.sets.map((s) =>
              s.done ? <CheckCircle2 key={s.id} size={14} className="text-emerald-400" /> : <Circle key={s.id} size={14} className="text-text-muted" />,
            )}
          </div>
          <span className="text-xs font-medium text-text-secondary">
            {hechas}/{totalSets}
          </span>
          {abierto ? <ChevronDown size={15} className="text-text-muted" /> : <ChevronRight size={15} className="text-text-muted" />}
        </div>
      </button>

      {abierto && (
        <div className="mt-4 flex flex-col gap-4 border-t border-bg-border pt-4">
          {objetivoLabel && (
            <div className="text-xs text-text-muted">
              Objetivo: <span className="text-text-secondary">{objetivoLabel}{ejercicio.targetRir != null ? ` · RIR ${ejercicio.targetRir}` : ''}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-text-muted">
                  <th className="pb-2 pr-3 font-medium">Serie</th>
                  <th className="pb-2 pr-3 font-medium">Realizado</th>
                  <th className="pb-2 pr-3 font-medium">RIR</th>
                  <th className="pb-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ejercicio.sets.map((s) => (
                  <tr key={s.id} className="border-t border-bg-border/60">
                    <td className="py-1.5 pr-3 text-text-secondary">{s.setNumber}</td>
                    <td className="py-1.5 pr-3 font-medium text-text-primary">{formatSerie(s)}</td>
                    <td className="py-1.5 pr-3 text-text-secondary">{s.rir ?? '—'}</td>
                    <td className="py-1.5">
                      {s.done ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Circle size={14} className="text-text-muted" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comparacion && (
            <div className="rounded-control border border-bg-border bg-bg-panel/60 p-3 text-xs">
              <div className="mb-1.5 font-semibold text-text-secondary">Comparación con la sesión anterior</div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-text-muted">
                  Anterior <span className="text-text-secondary">{formatSerie(comparacion.anterior)}</span>
                </span>
                <span className="text-text-muted">
                  Actual <span className="font-medium text-text-primary">{formatSerie(comparacion.actual)}</span>
                </span>
                <span className={`font-semibold ${comparacion.cambioPorcentual >= 0 ? 'text-emerald-400' : 'text-pegasus-red'}`}>
                  {comparacion.cambioPorcentual >= 0 ? '+' : ''}
                  {formatNumero(comparacion.cambioPorcentual, 1)}%
                </span>
              </div>
            </div>
          )}

          {mejor && (
            <div className="text-xs text-text-muted">
              Mejor marca anterior: <span className="font-medium text-text-secondary">{formatSerie(mejor)}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function VistaCompleta({ workout, onCerrar }: { workout: WorkoutConEjercicios; onCerrar: () => void }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardLabel icon={<LayoutList size={13} />}>Vista completa</CardLabel>
        <button onClick={onCerrar} className="text-xs font-semibold text-text-secondary hover:text-text-primary">
          Cerrar
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {workout.ejercicios.map((ej, i) => {
          const hechas = ej.sets.filter((s) => s.done).length
          const total = ej.sets.length
          const ultima = [...ej.sets].reverse().find((s) => s.done) ?? ej.sets[ej.sets.length - 1]
          const completo = total > 0 && hechas === total
          return (
            <div key={ej.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-bg-border px-3 py-2 text-sm">
              <span className="text-text-secondary">
                {i + 1}. {ej.exerciseNombre || 'Ejercicio'}
              </span>
              <span className="flex items-center gap-2 text-xs text-text-muted">
                {hechas}/{total} · {ultima ? formatSerie(ultima) : '—'}
                {ultima?.rir != null ? ` · RIR ${ultima.rir}` : ''}
                {completo ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Circle size={13} className="text-amber-400" />}
              </span>
            </div>
          )
        })}
        {workout.ejercicios.length === 0 && <p className="text-sm text-text-muted">Sin ejercicios registrados.</p>}
      </div>
    </Card>
  )
}

function HistorialRutina({ workoutActual, onSeleccionar }: { workoutActual: WorkoutConEjercicios; onSeleccionar: (id: string) => void }) {
  const { data: historial } = useWorkoutHistoryByTemplate(workoutActual.templateId)

  if (!workoutActual.templateId) {
    return (
      <Card>
        <CardLabel icon={<History size={13} />}>Historial</CardLabel>
        <p className="text-sm text-text-muted">Este entrenamiento no está asociado a ninguna rutina — sin historial que comparar.</p>
      </Card>
    )
  }

  const sesiones = historial ?? []

  return (
    <Card>
      <CardLabel icon={<History size={13} />}>Historial de la rutina</CardLabel>
      <div className="flex flex-col gap-2">
        {sesiones.map((w) => {
          const { completadas, total } = calcularSeriesCompletadas(w.ejercicios)
          const volumen = calcularVolumen(w.ejercicios)
          const activo = w.id === workoutActual.id
          return (
            <button
              key={w.id}
              onClick={() => onSeleccionar(w.id)}
              className={`rounded-control border px-3 py-2 text-left text-xs transition-colors ${
                activo ? 'border-pegasus-red bg-pegasus-redSoft' : 'border-bg-border hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary">{formatFechaCorta(w.date)}</span>
                {w.completed && <CheckCircle2 size={13} className="text-emerald-400" />}
              </div>
              <div className="mt-1 text-text-muted">
                {w.ejercicios.length} ejercicios · {formatNumero(volumen, 0)} kg · {completadas}/{total} series
              </div>
            </button>
          )
        })}
        {sesiones.length === 0 && <p className="text-sm text-text-muted">Sin entrenamientos anteriores de esta rutina.</p>}
      </div>
    </Card>
  )
}
