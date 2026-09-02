// Gestor de dietas — biblioteca de plantillas de dieta cerrada reutilizables del
// ENTRENADOR (nutrition_closed_diet_template/_item), independiente de cualquier
// cliente concreto. Distinto del historial de un cliente (closedDietRepo.ts):
// HISTORIAL = versiones específicas de ese cliente. GESTOR = plantillas reutilizables.
import { supabase } from './client'
import type { ClosedDietItem, DietTemplate, DietTemplateInput, DietTemplateItem, DietTemplateItemInput } from '@/types'

const TEMPLATE_TABLE = 'nutrition_closed_diet_template'
const ITEM_TABLE = 'nutrition_closed_diet_template_item'

function fail(action: string, table: string, error: { message: string }): never {
  throw new Error(`${action} en ${table}: ${error.message}`)
}

export async function listDietTemplates(trainerId: string): Promise<DietTemplate[]> {
  const { data, error } = await supabase.from(TEMPLATE_TABLE).select('*').eq('trainerId', trainerId).order('createdAt', { ascending: false })
  if (error) fail('Error al listar', TEMPLATE_TABLE, error)
  return (data ?? []) as DietTemplate[]
}

export async function createDietTemplate(data: DietTemplateInput): Promise<DietTemplate> {
  const { data: row, error } = await supabase.from(TEMPLATE_TABLE).insert(data).select().single()
  if (error) fail('Error al crear', TEMPLATE_TABLE, error)
  return row as DietTemplate
}

export async function deleteDietTemplate(id: string): Promise<void> {
  const { error } = await supabase.from(TEMPLATE_TABLE).delete().eq('id', id)
  if (error) fail('Error al borrar', TEMPLATE_TABLE, error)
}

export async function listDietTemplateItems(templateId: string): Promise<DietTemplateItem[]> {
  const { data, error } = await supabase.from(ITEM_TABLE).select('*').eq('templateId', templateId).order('orden', { ascending: true })
  if (error) fail('Error al listar', ITEM_TABLE, error)
  return (data ?? []) as DietTemplateItem[]
}

/** Guarda la dieta activa de un cliente como plantilla reutilizable — copia sus
 * alimentos, sin arrastrar nada específico del cliente (fechas, notas de esa versión). */
export async function saveClosedDietAsTemplate(
  trainerId: string,
  items: ClosedDietItem[],
  meta: { nombre: string; categoria: string | null; descripcion: string | null },
): Promise<DietTemplate> {
  const template = await createDietTemplate({ trainerId, nombre: meta.nombre, categoria: meta.categoria, descripcion: meta.descripcion })
  if (items.length > 0) {
    const rows: Omit<DietTemplateItemInput, 'templateId'>[] = items.map((i) => ({
      diaTipo: i.diaTipo,
      momento: i.momento,
      alimento: i.alimento,
      cantidad: i.gramos,
      unidad: i.unidad,
      orden: i.orden,
    }))
    const { error } = await supabase.from(ITEM_TABLE).insert(rows.map((r) => ({ ...r, templateId: template.id })))
    if (error) fail('Error al guardar', ITEM_TABLE, error)
  }
  return template
}
