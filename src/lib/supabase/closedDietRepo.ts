import { insertRow, updateRow } from './crud'
import { supabase } from './client'
import { hoyIso } from '@/lib/format'
import type { ClosedDietItem, ClosedDietItemInput, ClosedDietPlan, ClosedDietPlanInput } from '@/types'

const PLAN_TABLE = 'nutrition_closed_diet_plan'
const ITEM_TABLE = 'nutrition_closed_diet_item'

/** Histórico completo, más reciente primero — para el Histórico nutricional unificado
 * y para el panel "Historial de dietas". Incluye archivadas (el historial no oculta nada). */
export async function listClosedDietPlans(userId: string): Promise<ClosedDietPlan[]> {
  const { data, error } = await supabase.from(PLAN_TABLE).select('*').eq('userId', userId).order('fecha', { ascending: true })
  if (error) throw new Error(`Error al listar en ${PLAN_TABLE}: ${error.message}`)
  return (data ?? []) as ClosedDietPlan[]
}

/** El plan "activo" es el más reciente por fecha, entre los NO archivados y con fecha
 * ya alcanzada (fecha <= hoy) — así una dieta "programada" para el futuro pasa a activa
 * sola, sin ningún job en segundo plano, en cuanto llega su fecha. */
export async function getActiveClosedDietPlan(userId: string): Promise<ClosedDietPlan | undefined> {
  const { data, error } = await supabase
    .from(PLAN_TABLE)
    .select('*')
    .eq('userId', userId)
    .eq('archivada', false)
    .lte('fecha', hoyIso())
    .order('fecha', { ascending: false })
    .limit(1)
  if (error) throw new Error(`Error al leer en ${PLAN_TABLE}: ${error.message}`)
  return (data?.[0] as ClosedDietPlan) ?? undefined
}

/** Dietas programadas para el futuro (no activas todavía, no archivadas). */
export async function listScheduledClosedDietPlans(userId: string): Promise<ClosedDietPlan[]> {
  const { data, error } = await supabase
    .from(PLAN_TABLE)
    .select('*')
    .eq('userId', userId)
    .eq('archivada', false)
    .gt('fecha', hoyIso())
    .order('fecha', { ascending: true })
  if (error) throw new Error(`Error al listar en ${PLAN_TABLE}: ${error.message}`)
  return (data ?? []) as ClosedDietPlan[]
}

export function createClosedDietPlan(data: ClosedDietPlanInput): Promise<ClosedDietPlan> {
  return insertRow<ClosedDietPlan>(PLAN_TABLE, data)
}

export function updateClosedDietPlan(id: string, data: Partial<ClosedDietPlanInput>): Promise<void> {
  return updateRow(PLAN_TABLE, id, data)
}

/** "Archivar" y "Eliminar" (acciones del entrenador) hacen exactamente lo mismo a nivel
 * de datos — nunca se borra una dieta ni su histórico físicamente, solo deja de contar
 * como activa/programada. Se exponen como dos funciones porque el menú del entrenador
 * las presenta como dos acciones distintas (con confirmación distinta), pero comparten
 * la misma garantía: "las versiones anteriores permanecen disponibles en el historial". */
export function archiveClosedDietPlan(id: string): Promise<void> {
  return updateRow(PLAN_TABLE, id, { archivada: true })
}
export function deleteClosedDietPlan(id: string): Promise<void> {
  return updateRow(PLAN_TABLE, id, { archivada: true })
}

export async function listClosedDietItems(planId: string): Promise<ClosedDietItem[]> {
  const { data, error } = await supabase.from(ITEM_TABLE).select('*').eq('planId', planId).order('orden', { ascending: true })
  if (error) throw new Error(`Error al listar en ${ITEM_TABLE}: ${error.message}`)
  return (data ?? []) as ClosedDietItem[]
}

/** Único método de escritura para los alimentos de un plan: borra los suyos y guarda
 * la lista completa. Se usa siempre sobre un plan RECIÉN CREADO (nueva versión) — nunca
 * sobre uno ya publicado, así "guardar cambios" nunca sobrescribe una versión anterior
 * (ver DietaCerrada.tsx: guardarComoNuevaVersion). */
export async function replaceClosedDietItems(planId: string, items: Omit<ClosedDietItemInput, 'planId'>[]): Promise<void> {
  const { error: deleteError } = await supabase.from(ITEM_TABLE).delete().eq('planId', planId)
  if (deleteError) throw new Error(`Error al borrar en ${ITEM_TABLE}: ${deleteError.message}`)
  if (items.length === 0) return
  const { error: insertError } = await supabase.from(ITEM_TABLE).insert(items.map((i) => ({ ...i, planId })))
  if (insertError) throw new Error(`Error al guardar en ${ITEM_TABLE}: ${insertError.message}`)
}

/** Calcula "v1, v2, v3…" por orden de fecha de creación entre TODAS las versiones del
 * cliente (incluidas las archivadas) — así el número de versión de una dieta antigua
 * nunca cambia por archivar/crear otras nuevas. */
export function numeroVersion(todasLasVersiones: ClosedDietPlan[], planId: string): number {
  const ordenadas = [...todasLasVersiones].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const indice = ordenadas.findIndex((p) => p.id === planId)
  return indice === -1 ? ordenadas.length : indice + 1
}

/** Crea una nueva versión (nueva fila de plan, fecha de hoy salvo que se indique otra
 * para "programar") copiando los alimentos de otra versión (duplicar / restaurar /
 * crear-desde-otra) o de una plantilla del Gestor de dietas. */
export async function createClosedDietPlanFromItems(
  userId: string,
  items: Omit<ClosedDietItemInput, 'planId'>[],
  opts: { fecha?: string; nombre?: string | null; notas?: string | null; motivoCambio?: string | null } = {},
): Promise<ClosedDietPlan> {
  const plan = await createClosedDietPlan({
    userId,
    fecha: opts.fecha ?? hoyIso(),
    semanaId: null,
    notas: opts.notas ?? null,
    nombre: opts.nombre ?? null,
    archivada: false,
    motivoCambio: opts.motivoCambio ?? null,
  })
  await replaceClosedDietItems(plan.id, items)
  return plan
}
