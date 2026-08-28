// Helpers CRUD genéricos sobre una tabla Supabase — evita repetir el mismo
// select/insert/update/delete + manejo de errores en cada repositorio.
import { supabase } from './client'

function fail(action: string, table: string, error: { message: string }): never {
  throw new Error(`${action} en ${table}: ${error.message}`)
}

export async function listByUser<T>(table: string, userId: string, orderBy = 'fecha'): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').eq('userId', userId).order(orderBy, { ascending: true })
  if (error) fail('Error al listar', table, error)
  return (data ?? []) as T[]
}

export async function getOneByUser<T>(
  table: string,
  userId: string,
  orderBy = 'fecha',
  ascending = false,
): Promise<T | undefined> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('userId', userId)
    .order(orderBy, { ascending })
    .limit(1)
  if (error) fail('Error al leer', table, error)
  return (data?.[0] as T) ?? undefined
}

export async function insertRow<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (error) fail('Error al crear', table, error)
  return data as T
}

export async function insertRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).insert(rows)
  if (error) fail('Error al importar', table, error)
}

export async function updateRow(table: string, id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from(table).update(patch).eq('id', id)
  if (error) fail('Error al actualizar', table, error)
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) fail('Error al borrar', table, error)
}
