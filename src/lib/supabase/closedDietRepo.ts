import { getOneByUser, insertRow, updateRow } from './crud'
import { supabase } from './client'
import type { ClosedDietItem, ClosedDietItemInput, ClosedDietPlan, ClosedDietPlanInput } from '@/types'

const PLAN_TABLE = 'nutrition_closed_diet_plan'
const ITEM_TABLE = 'nutrition_closed_diet_item'

/** El plan "activo" es el más reciente por fecha, igual que el plan de macros. */
export function getActiveClosedDietPlan(userId: string): Promise<ClosedDietPlan | undefined> {
  return getOneByUser<ClosedDietPlan>(PLAN_TABLE, userId, 'fecha', false)
}

export function createClosedDietPlan(data: ClosedDietPlanInput): Promise<ClosedDietPlan> {
  return insertRow<ClosedDietPlan>(PLAN_TABLE, data)
}

export function updateClosedDietPlan(id: string, data: Partial<ClosedDietPlanInput>): Promise<void> {
  return updateRow(PLAN_TABLE, id, data)
}

export async function listClosedDietItems(planId: string): Promise<ClosedDietItem[]> {
  const { data, error } = await supabase.from(ITEM_TABLE).select('*').eq('planId', planId).order('orden', { ascending: true })
  if (error) throw new Error(`Error al listar en ${ITEM_TABLE}: ${error.message}`)
  return (data ?? []) as ClosedDietItem[]
}

/** Único método de escritura para los alimentos: borra los del plan y guarda la lista completa. */
export async function replaceClosedDietItems(planId: string, items: Omit<ClosedDietItemInput, 'planId'>[]): Promise<void> {
  const { error: deleteError } = await supabase.from(ITEM_TABLE).delete().eq('planId', planId)
  if (deleteError) throw new Error(`Error al borrar en ${ITEM_TABLE}: ${deleteError.message}`)
  if (items.length === 0) return
  const { error: insertError } = await supabase.from(ITEM_TABLE).insert(items.map((i) => ({ ...i, planId })))
  if (insertError) throw new Error(`Error al guardar en ${ITEM_TABLE}: ${insertError.message}`)
}
