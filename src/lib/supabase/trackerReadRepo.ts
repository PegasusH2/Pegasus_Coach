// Lectura del entrenamiento REAL del cliente en Pegasus Tracker — mismo
// proyecto Supabase, tablas propiedad de Tracker (workouts/workout_exercises/
// sets/exercises). Aquí SOLO se lee, nunca se escribe: crear/asignar
// entrenamientos desde Nutrition es una fase posterior que requiere cambios
// en el propio esquema de Tracker. La policy "trainer_read_client_training"
// (ver supabase/migrations/0005_dashboard_entrenador.sql) es lo que permite
// a un entrenador con vínculo aceptado leer estas filas.
import { supabase } from './client'
import type { TrackerSet, TrackerWorkout, TrackerWorkoutExercise } from '@/types'

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
  sets: RawSet[]
}

interface RawWorkout {
  id: string
  user_id: string
  name: string | null
  date: string
  completed: boolean
  workout_exercises: RawWorkoutExercise[]
}

function toSet(s: RawSet): TrackerSet {
  return { id: s.id, workoutExerciseId: s.workout_exercise_id, setNumber: s.set_number, weight: s.weight, reps: s.reps, rir: s.rir, done: s.done }
}

function toWorkoutExercise(we: RawWorkoutExercise): TrackerWorkoutExercise {
  return {
    id: we.id,
    workoutId: we.workout_id,
    exerciseId: we.exercise_id,
    exerciseNombre: we.exercises?.name ?? null,
    sets: (we.sets ?? []).map(toSet),
  }
}

/** Último entrenamiento (por fecha) del cliente — usado como señal de "última actividad". */
export async function getUltimoWorkout(clientId: string): Promise<TrackerWorkout | undefined> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, user_id, name, date, completed')
    .eq('user_id', clientId)
    .order('date', { ascending: false })
    .limit(1)
  if (error) throw new Error(`Error al leer el entrenamiento: ${error.message}`)
  const row = data?.[0]
  return row ? { id: row.id, userId: row.user_id, name: row.name, date: row.date, completed: row.completed } : undefined
}

/** Entrenamientos recientes del cliente con sus ejercicios y sets — para la pestaña Entrenamiento de la ficha. */
export async function listWorkoutsConSets(clientId: string, limit = 10): Promise<(TrackerWorkout & { ejercicios: TrackerWorkoutExercise[] })[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, user_id, name, date, completed, workout_exercises(id, workout_id, exercise_id, exercises(name), sets(id, workout_exercise_id, set_number, weight, reps, rir, done))',
    )
    .eq('user_id', clientId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Error al leer los entrenamientos: ${error.message}`)
  return ((data ?? []) as unknown as RawWorkout[]).map((w) => ({
    id: w.id,
    userId: w.user_id,
    name: w.name,
    date: w.date,
    completed: w.completed,
    ejercicios: (w.workout_exercises ?? []).map(toWorkoutExercise),
  }))
}
