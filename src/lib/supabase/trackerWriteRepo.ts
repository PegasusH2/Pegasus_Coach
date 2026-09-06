// Escritura del entrenador sobre PLANIFICACIÓN de entrenamiento — ejercicios y
// rutinas (templates/template_exercises). Tablas propiedad de Pegasus Tracker,
// mismo proyecto Supabase. Ver supabase/migrations/0007_control_total_entrenador.sql
// para el porqué (trigger de ownership + RLS aditiva).
//
// La EJECUCIÓN (workouts/workout_exercises/sets) ya no se escribe desde aquí:
// es responsabilidad exclusiva de Pegasus Tracker — el entrenador solo
// consulta (ver trackerReadRepo.ts y
// supabase/migrations/0009_revertir_ejecucion_entrenador.sql).
//
// Reglas que hay que respetar SIEMPRE en este fichero (documentadas en
// 03_SUPABASE_CONTEXT.md/01_TRACKER_CONTEXT.md del ecosistema):
//   - `user_id` se manda SIEMPRE explícito en cada insert (nunca confiar en el
//     trigger — sin esto la fila quedaría atribuida al entrenador, no al cliente).
//   - `id` se genera en el cliente con crypto.randomUUID(), igual que Tracker.
//   - Los borrados son SIEMPRE lógicos (`deleted_at`), nunca un DELETE real — un
//     DELETE real nunca llegaría al Dexie del cliente vía sync.
import { supabase } from './client'
import { cleanNonNegativeInt, requireNonEmptyString } from './trackerValidate'
import type {
  TrackerExercise,
  TrackerExerciseInput,
  TrackerRoutine,
  TrackerRoutineInput,
  TrackerTemplate,
  TrackerTemplateExercise,
  TrackerTemplateExerciseInput,
  TrackerTemplateInput,
} from '@/types'

function fail(action: string, table: string, error: { message: string }): never {
  throw new Error(`${action} en ${table}: ${error.message}`)
}

const nowIso = () => new Date().toISOString()

// ---------------------------------------------------------------------
// Ejercicios
// ---------------------------------------------------------------------

interface ExerciseRow {
  id: string
  user_id: string
  name: string
  muscle_group: string | null
  notes: string | null
  archived: boolean
}

function fromExerciseRow(r: ExerciseRow): TrackerExercise {
  return { id: r.id, userId: r.user_id, name: r.name, muscleGroup: r.muscle_group ?? '', notes: r.notes ?? '', archived: r.archived }
}

export async function listExercises(userId: string): Promise<TrackerExercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, user_id, name, muscle_group, notes, archived')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error) fail('Error al listar', 'exercises', error)
  return (data ?? []).map(fromExerciseRow)
}

export async function createExercise(userId: string, input: TrackerExerciseInput): Promise<TrackerExercise> {
  const name = requireNonEmptyString(input.name, 'El nombre del ejercicio')
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      muscle_group: input.muscleGroup ?? '',
      notes: input.notes ?? '',
      archived: false,
    })
    .select('id, user_id, name, muscle_group, notes, archived')
    .single()
  if (error) fail('Error al crear', 'exercises', error)
  return fromExerciseRow(data as ExerciseRow)
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from('exercises').update({ deleted_at: nowIso() }).eq('id', id)
  if (error) fail('Error al borrar', 'exercises', error)
}

// ---------------------------------------------------------------------
// Días (templates) y sus ejercicios (template_exercises) — un "día" es una
// sesión/entrenamiento suelto; varios días se agrupan bajo una Rutina
// (template_routines, más abajo). Ver
// supabase/migrations/0011_rutinas_planificacion.sql.
// ---------------------------------------------------------------------

interface TemplateRow {
  id: string
  user_id: string
  name: string
  description: string | null
  assigned_by: string | null
  routine_id: string | null
}

function fromTemplateRow(r: TemplateRow): TrackerTemplate {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    description: r.description ?? '',
    assignedBy: r.assigned_by,
    routineId: r.routine_id,
  }
}

const TEMPLATE_COLUMNS = 'id, user_id, name, description, assigned_by, routine_id'

export async function listTemplates(userId: string): Promise<TrackerTemplate[]> {
  const { data, error } = await supabase
    .from('templates')
    .select(TEMPLATE_COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  if (error) fail('Error al listar', 'templates', error)
  return (data ?? []).map(fromTemplateRow)
}

/** `assignedBy` = uuid del entrenador que la crea — deja constancia de que es un día asignado, no propio del cliente. */
export async function createTemplate(userId: string, input: TrackerTemplateInput, assignedBy: string): Promise<TrackerTemplate> {
  const name = requireNonEmptyString(input.name, 'El nombre del día')
  const { data, error } = await supabase
    .from('templates')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      description: input.description ?? '',
      assigned_by: assignedBy,
      routine_id: input.routineId ?? null,
    })
    .select(TEMPLATE_COLUMNS)
    .single()
  if (error) fail('Error al crear', 'templates', error)
  return fromTemplateRow(data as TemplateRow)
}

export async function updateTemplate(id: string, patch: Partial<Pick<TrackerTemplateInput, 'name' | 'routineId'>>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = requireNonEmptyString(patch.name, 'El nombre del día')
  if (patch.routineId !== undefined) row.routine_id = patch.routineId
  const { error } = await supabase.from('templates').update(row).eq('id', id)
  if (error) fail('Error al actualizar', 'templates', error)
}

/** Duplica un día completo (mismos ejercicios/objetivos) dentro de la misma rutina. */
export async function duplicateTemplate(userId: string, origen: TrackerTemplate, assignedBy: string): Promise<TrackerTemplate> {
  const nuevo = await createTemplate(
    userId,
    { userId, name: `${origen.name} (copia)`, description: origen.description, assignedBy, routineId: origen.routineId },
    assignedBy,
  )
  const ejercicios = await listTemplateExercises(origen.id)
  for (const ej of ejercicios) {
    await addTemplateExercise({
      templateId: nuevo.id,
      exerciseId: ej.exerciseId,
      sortOrder: ej.sortOrder,
      targetSets: ej.targetSets,
      targetRepsMin: ej.targetRepsMin,
      targetRepsMax: ej.targetRepsMax,
    })
  }
  return nuevo
}

export async function deleteTemplate(id: string): Promise<void> {
  const { data: exercises, error: readError } = await supabase.from('template_exercises').select('id').eq('template_id', id).is('deleted_at', null)
  if (readError) fail('Error al leer', 'template_exercises', readError)
  const ids = (exercises ?? []).map((e) => e.id)
  if (ids.length > 0) {
    const { error } = await supabase.from('template_exercises').update({ deleted_at: nowIso() }).in('id', ids)
    if (error) fail('Error al borrar', 'template_exercises', error)
  }
  const { error } = await supabase.from('templates').update({ deleted_at: nowIso() }).eq('id', id)
  if (error) fail('Error al borrar', 'templates', error)
}

// ---------------------------------------------------------------------
// Rutinas (template_routines) — agrupan varios días (templates.routine_id).
// Ver supabase/migrations/0011_rutinas_planificacion.sql.
// ---------------------------------------------------------------------

interface RoutineRow {
  id: string
  user_id: string
  name: string
  sort_order: number
  archived_at: string | null
}

function fromRoutineRow(r: RoutineRow): TrackerRoutine {
  return { id: r.id, userId: r.user_id, name: r.name, sortOrder: r.sort_order, archivedAt: r.archived_at }
}

const ROUTINE_COLUMNS = 'id, user_id, name, sort_order, archived_at'

export async function listRoutines(userId: string): Promise<TrackerRoutine[]> {
  const { data, error } = await supabase
    .from('template_routines')
    .select(ROUTINE_COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  if (error) fail('Error al listar', 'template_routines', error)
  return (data ?? []).map(fromRoutineRow)
}

export async function createRoutine(userId: string, input: TrackerRoutineInput): Promise<TrackerRoutine> {
  const name = requireNonEmptyString(input.name, 'El nombre de la rutina')
  const { data, error } = await supabase
    .from('template_routines')
    .insert({ id: crypto.randomUUID(), user_id: userId, name, sort_order: input.sortOrder ?? 0 })
    .select(ROUTINE_COLUMNS)
    .single()
  if (error) fail('Error al crear', 'template_routines', error)
  return fromRoutineRow(data as RoutineRow)
}

export async function renameRoutine(id: string, name: string): Promise<void> {
  const cleanName = requireNonEmptyString(name, 'El nombre de la rutina')
  const { error } = await supabase.from('template_routines').update({ name: cleanName }).eq('id', id)
  if (error) fail('Error al actualizar', 'template_routines', error)
}

export async function archiveRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('template_routines').update({ archived_at: nowIso() }).eq('id', id)
  if (error) fail('Error al archivar', 'template_routines', error)
}

export async function unarchiveRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('template_routines').update({ archived_at: null }).eq('id', id)
  if (error) fail('Error al desarchivar', 'template_routines', error)
}

/** Elimina definitivamente la rutina Y sus días (templates con este routineId) —
 * una rutina eliminada no debe dejar días huérfanos sin rutina; deleteTemplate ya
 * en cascada borra los template_exercises de cada día. */
export async function deleteRoutine(id: string): Promise<void> {
  const { data: dias, error: readError } = await supabase.from('templates').select('id').eq('routine_id', id).is('deleted_at', null)
  if (readError) fail('Error al leer', 'templates', readError)
  for (const dia of dias ?? []) {
    await deleteTemplate(dia.id)
  }
  const { error } = await supabase.from('template_routines').update({ deleted_at: nowIso() }).eq('id', id)
  if (error) fail('Error al eliminar', 'template_routines', error)
}

interface TemplateExerciseRow {
  id: string
  template_id: string
  exercise_id: string
  exercises: { name: string | null } | null
  sort_order: number
  target_sets: number
  target_reps_min: number | null
  target_reps_max: number | null
}

function fromTemplateExerciseRow(r: TemplateExerciseRow): TrackerTemplateExercise {
  return {
    id: r.id,
    templateId: r.template_id,
    exerciseId: r.exercise_id,
    exerciseNombre: r.exercises?.name ?? null,
    sortOrder: r.sort_order,
    targetSets: r.target_sets,
    targetRepsMin: r.target_reps_min,
    targetRepsMax: r.target_reps_max,
  }
}

export async function listTemplateExercises(templateId: string): Promise<TrackerTemplateExercise[]> {
  const { data, error } = await supabase
    .from('template_exercises')
    .select('id, template_id, exercise_id, exercises(name), sort_order, target_sets, target_reps_min, target_reps_max')
    .eq('template_id', templateId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  if (error) fail('Error al listar', 'template_exercises', error)
  return ((data ?? []) as unknown as TemplateExerciseRow[]).map(fromTemplateExerciseRow)
}

export async function addTemplateExercise(input: TrackerTemplateExerciseInput): Promise<TrackerTemplateExercise> {
  const targetSets = Math.min(100, Math.max(1, cleanNonNegativeInt(input.targetSets) ?? 3))
  const { data, error } = await supabase
    .from('template_exercises')
    .insert({
      id: crypto.randomUUID(),
      template_id: input.templateId,
      exercise_id: input.exerciseId,
      sort_order: input.sortOrder,
      target_sets: targetSets,
      target_reps_min: cleanNonNegativeInt(input.targetRepsMin),
      target_reps_max: cleanNonNegativeInt(input.targetRepsMax),
    })
    .select('id, template_id, exercise_id, exercises(name), sort_order, target_sets, target_reps_min, target_reps_max')
    .single()
  if (error) fail('Error al añadir ejercicio a la rutina', 'template_exercises', error)
  return fromTemplateExerciseRow(data as unknown as TemplateExerciseRow)
}

export async function updateTemplateExercise(
  id: string,
  patch: Partial<Pick<TrackerTemplateExerciseInput, 'targetSets' | 'targetRepsMin' | 'targetRepsMax' | 'sortOrder'>>,
): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.targetSets !== undefined) row.target_sets = Math.min(100, Math.max(1, cleanNonNegativeInt(patch.targetSets) ?? 3))
  if (patch.targetRepsMin !== undefined) row.target_reps_min = cleanNonNegativeInt(patch.targetRepsMin)
  if (patch.targetRepsMax !== undefined) row.target_reps_max = cleanNonNegativeInt(patch.targetRepsMax)
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
  const { error } = await supabase.from('template_exercises').update(row).eq('id', id)
  if (error) fail('Error al actualizar', 'template_exercises', error)
}

export async function removeTemplateExercise(id: string): Promise<void> {
  const { error } = await supabase.from('template_exercises').update({ deleted_at: nowIso() }).eq('id', id)
  if (error) fail('Error al quitar', 'template_exercises', error)
}
