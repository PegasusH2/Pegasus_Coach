// Lectura del catálogo global de ejercicios (exercise_catalog) — tabla de solo
// lectura para toda la app: nadie escribe aquí desde el cliente, se rellena
// una única vez con supabase/scripts/import-exercise-catalog.mjs (service_role).
// Ver supabase/migrations/0014_catalogo_ejercicios.sql.
import { supabase } from './client'
import type { ExerciseCatalogItem } from '@/types'

interface CatalogRow {
  id: string
  name: string
  category: string
  equipment: string
  instructions: string
}

function fromCatalogRow(r: CatalogRow): ExerciseCatalogItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    equipment: r.equipment,
    instructions: r.instructions,
  }
}

const CATALOG_COLUMNS = 'id, name, category, equipment, instructions'

export async function searchCatalog(query: string, limit = 40): Promise<ExerciseCatalogItem[]> {
  let q = supabase.from('exercise_catalog').select(CATALOG_COLUMNS).order('name', { ascending: true }).limit(limit)
  const texto = query.trim()
  if (texto) q = q.ilike('name', `%${texto}%`)
  const { data, error } = await q
  if (error) throw new Error(`Error al buscar en el catálogo: ${error.message}`)
  return (data ?? []).map(fromCatalogRow)
}

export async function listCategories(): Promise<string[]> {
  const { data, error } = await supabase.from('exercise_catalog').select('category').order('category', { ascending: true })
  if (error) throw new Error(`Error al listar categorías: ${error.message}`)
  return Array.from(new Set((data ?? []).map((r) => r.category)))
}
