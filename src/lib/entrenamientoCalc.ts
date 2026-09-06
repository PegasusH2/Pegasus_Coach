// Cálculos puros sobre el entrenamiento REAL del cliente (Ejecución), a partir
// de los datos que Tracker ya registra — nunca se inventa un dato que no pueda
// derivarse de weight/reps/done reales. Ver trackerReadRepo.ts para el origen
// de estos datos y src/pages/EjecucionCliente.tsx para dónde se usan.
import type { TrackerExerciseHistorySet, TrackerWorkoutExercise } from '@/types'

/** Volumen = peso × reps, sumado sobre todas las series HECHAS con peso y reps registrados.
 * Series de peso corporal (weight null o 0 — Tracker usa 0 como "sin rellenar", no como un
 * peso real, mismo criterio que bestRecordsFromHistory en Pegasus_Tracker/js/core/stats.js)
 * no suman volumen — no hay forma fiable de valorarlas en kg. */
export function calcularVolumen(ejercicios: TrackerWorkoutExercise[]): number {
  let total = 0
  for (const ej of ejercicios) {
    for (const s of ej.sets) {
      if (s.done && s.weight != null && s.weight > 0 && s.reps != null) total += s.weight * s.reps
    }
  }
  return total
}

export function calcularSeriesCompletadas(ejercicios: TrackerWorkoutExercise[]): { completadas: number; total: number } {
  let completadas = 0
  let total = 0
  for (const ej of ejercicios) {
    total += ej.sets.length
    completadas += ej.sets.filter((s) => s.done).length
  }
  return { completadas, total }
}

/** Un ejercicio cuenta como completado si tiene al menos una serie y TODAS están hechas. */
export function calcularEjerciciosCompletados(ejercicios: TrackerWorkoutExercise[]): { completados: number; total: number } {
  const completados = ejercicios.filter((ej) => ej.sets.length > 0 && ej.sets.every((s) => s.done)).length
  return { completados, total: ejercicios.length }
}

/** Estimación de 1RM (fórmula de Epley) — solo tiene sentido con peso y reps reales. */
export function estimar1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

export interface MejorSet {
  weight: number
  reps: number
  estimado1RM: number
}

/** Mejor serie histórica de un ejercicio (mayor 1RM estimado) — null si no hay ninguna serie
 * válida (con peso real y reps) en el histórico. */
export function mejorSet(historial: TrackerExerciseHistorySet[]): MejorSet | null {
  let mejor: MejorSet | null = null
  for (const s of historial) {
    if (s.weight == null || s.weight <= 0 || s.reps == null) continue
    const estimado1RM = estimar1RM(s.weight, s.reps)
    if (!mejor || estimado1RM > mejor.estimado1RM) mejor = { weight: s.weight, reps: s.reps, estimado1RM }
  }
  return mejor
}

/** true si (weight, reps) supera el mejor 1RM estimado del histórico — es decir, es un PR.
 * Si no hay histórico previo, no se puede determinar: devuelve false (nunca "PR" por defecto). */
export function esNuevoPR(weight: number | null, reps: number | null, historialAnterior: TrackerExerciseHistorySet[]): boolean {
  if (weight == null || reps == null) return false
  const previo = mejorSet(historialAnterior)
  if (!previo) return false
  return estimar1RM(weight, reps) > previo.estimado1RM
}

/** Serie "representativa" de una sesión para un ejercicio — la de mayor peso entre las hechas
 * (a igualdad de peso, la de más reps). Sirve para comparar sesión actual vs anterior. */
export function serieRepresentativa(sets: { weight: number | null; reps: number | null }[]): { weight: number; reps: number } | null {
  let mejor: { weight: number; reps: number } | null = null
  for (const s of sets) {
    if (s.weight == null || s.weight <= 0 || s.reps == null) continue
    if (!mejor || s.weight > mejor.weight || (s.weight === mejor.weight && s.reps > mejor.reps)) mejor = { weight: s.weight, reps: s.reps }
  }
  return mejor
}

export interface ComparacionSesion {
  anterior: { weight: number; reps: number }
  actual: { weight: number; reps: number }
  cambioPorcentual: number
}

/** Compara la serie representativa actual contra la de la sesión anterior MÁS RECIENTE del
 * mismo ejercicio (excluyendo el workout actual). null si no hay sesión anterior con datos. */
export function compararConSesionAnterior(
  actual: { weight: number; reps: number } | null,
  historial: TrackerExerciseHistorySet[],
  workoutIdActual: string,
): ComparacionSesion | null {
  if (!actual) return null
  const otrosWorkouts = [...new Set(historial.filter((h) => h.workoutId !== workoutIdActual).map((h) => h.workoutId))]
  if (otrosWorkouts.length === 0) return null
  // Los workouts ya llegan ordenados por fecha desc desde trackerReadRepo — el primero
  // distinto del actual es la sesión anterior más reciente.
  const workoutAnteriorId = historial.find((h) => h.workoutId !== workoutIdActual)?.workoutId
  const setsAnteriores = historial.filter((h) => h.workoutId === workoutAnteriorId)
  const anterior = serieRepresentativa(setsAnteriores)
  if (!anterior || anterior.weight <= 0) return null
  const cambioPorcentual = ((actual.weight - anterior.weight) / anterior.weight) * 100
  return { anterior, actual, cambioPorcentual }
}

/** Volumen por sesión (para el histórico de la rutina y el gráfico de evolución), más antigua
 * primero (para que un gráfico de barras se lea de izquierda=antiguo a derecha=reciente). */
export function volumenPorSesion(sesiones: { date: string; ejercicios: TrackerWorkoutExercise[] }[]): { date: string; volumen: number }[] {
  return [...sesiones].reverse().map((s) => ({ date: s.date, volumen: calcularVolumen(s.ejercicios) }))
}
