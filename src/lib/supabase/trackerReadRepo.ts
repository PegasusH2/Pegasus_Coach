// Lectura del entrenamiento REAL del cliente en Pegasus Tracker — mismo
// proyecto Supabase, tablas propiedad de Tracker (workouts/workout_exercises/
// sets/exercises). Aquí SOLO se lee, nunca se escribe: crear/asignar
// entrenamientos desde Coach es una fase posterior que requiere cambios
// en el propio esquema de Tracker. La policy "trainer_read_client_training"
// (ver supabase/migrations/0005_dashboard_entrenador.sql) es lo que permite
// a un entrenador con vínculo aceptado leer estas filas.
import { supabase } from './client'
import type { TrackerExerciseHistorySet, TrackerSet, TrackerWorkout, TrackerWorkoutExercise } from '@/types'

interface RawSet {
  id: string
  workout_exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
  rir: number | null
  done: boolean
}

interface RawWorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  exercises: { name: string | null } | null
  target_reps_min: number | null
  target_reps_max: number | null
  target_rir: number | null
  sets: RawSet[]
}

interface RawWorkout {
  id: string
  user_id: string
  name: string | null
  date: string
  completed: boolean
  template_id: string | null
  workout_exercises: RawWorkoutExercise[]
}

const WORKOUT_EXERCISE_COLUMNS =
  'id, workout_id, exercise_id, exercises(name), target_reps_min, target_reps_max, target_rir, sets(id, workout_exercise_id, set_number, weight, reps, rir, done)'

function toSet(s: RawSet): TrackerSet {
  return { id: s.id, workoutExerciseId: s.workout_exercise_id, setNumber: s.set_number, weight: s.weight, reps: s.reps, rir: s.rir, done: s.done }
}

function toWorkoutExercise(we: RawWorkoutExercise): TrackerWorkoutExercise {
  return {
    id: we.id,
    workoutId: we.workout_id,
    exerciseId: we.exercise_id,
    exerciseNombre: we.exercises?.name ?? null,
    targetRepsMin: we.target_reps_min,
    targetRepsMax: we.target_reps_max,
    targetRir: we.target_rir,
    sets: (we.sets ?? []).map(toSet).sort((a, b) => a.setNumber - b.setNumber),
  }
}

function toWorkout(w: RawWorkout): TrackerWorkout & { ejercicios: TrackerWorkoutExercise[] } {
  return {
    id: w.id,
    userId: w.user_id,
    name: w.name,
    date: w.date,
    completed: w.completed,
    templateId: w.template_id,
    ejercicios: (w.workout_exercises ?? []).map(toWorkoutExercise),
  }
}

/** Último entrenamiento (por fecha) del cliente — usado como señal de "última actividad". */
export async function getUltimoWorkout(clientId: string): Promise<TrackerWorkout | undefined> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, user_id, name, date, completed, template_id')
    .eq('user_id', clientId)
    .order('date', { ascending: false })
    .limit(1)
  if (error) throw new Error(`Error al leer el entrenamiento: ${error.message}`)
  const row = data?.[0]
  return row ? { id: row.id, userId: row.user_id, name: row.name, date: row.date, completed: row.completed, templateId: row.template_id } : undefined
}

/** Entrenamientos recientes del cliente con sus ejercicios y sets — para la pestaña Entrenamiento de la ficha. */
export async function listWorkoutsConSets(clientId: string, limit = 10): Promise<(TrackerWorkout & { ejercicios: TrackerWorkoutExercise[] })[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(`id, user_id, name, date, completed, template_id, workout_exercises(${WORKOUT_EXERCISE_COLUMNS})`)
    .eq('user_id', clientId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Error al leer los entrenamientos: ${error.message}`)
  return ((data ?? []) as unknown as RawWorkout[]).map(toWorkout)
}

/** Entrenamientos anteriores del MISMO día/rutina (workouts.template_id) — para el historial de
 * la rutina y para comparar la sesión actual contra la anterior. Más reciente primero. */
export async function listWorkoutHistoryByTemplate(
  clientId: string,
  templateId: string,
  limit = 10,
): Promise<(TrackerWorkout & { ejercicios: TrackerWorkoutExercise[] })[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(`id, user_id, name, date, completed, template_id, workout_exercises(${WORKOUT_EXERCISE_COLUMNS})`)
    .eq('user_id', clientId)
    .eq('template_id', templateId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Error al leer el historial de la rutina: ${error.message}`)
  return ((data ?? []) as unknown as RawWorkout[]).map(toWorkout)
}

/** Series históricas de un ejercicio concreto (de cualquier entrenamiento, cualquier rutina) —
 * para calcular su PR y comparar la sesión actual contra la anterior vez que se hizo. */
export async function listExerciseHistory(
  clientId: string,
  exerciseId: string,
  limit = 200,
): Promise<TrackerExerciseHistorySet[]> {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('workout_id, workouts!inner(user_id, date), sets(weight, reps, done)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', clientId)
    .order('date', { ascending: false, referencedTable: 'workouts' })
    .limit(limit)
  if (error) throw new Error(`Error al leer el histórico del ejercicio: ${error.message}`)
  const rows = (data ?? []) as unknown as { workout_id: string; workouts: { date: string } | null; sets: { weight: number | null; reps: number | null; done: boolean }[] }[]
  return rows.flatMap((r) =>
    (r.sets ?? [])
      .filter((s) => s.done)
      .map((s) => ({ workoutId: r.workout_id, date: r.workouts?.date ?? '', weight: s.weight, reps: s.reps })),
  )
}
