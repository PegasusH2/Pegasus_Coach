import { supabase } from './client'
import type { EstadoRevision, Review, ReviewInput } from '@/types'

const TABLE = 'nutrition_review'

async function withClienteNombre(rows: Record<string, unknown>[]): Promise<Review[]> {
  const ids = [...new Set(rows.map((r) => r.clientId as string))]
  const nombreById = new Map<string, string>()
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, nombre').in('id', ids)
    for (const p of profiles ?? []) nombreById.set(p.id as string, p.nombre as string)
  }
  return rows.map((r) => ({ ...r, clienteNombre: nombreById.get(r.clientId as string) || null })) as unknown as Review[]
}

/** Todas las revisiones del entrenador, más recientes primero. */
export async function listReviewsByTrainer(trainerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('trainerId', trainerId)
    .order('fechaProgramada', { ascending: false })
  if (error) throw new Error(`Error al listar revisiones: ${error.message}`)
  return withClienteNombre(data ?? [])
}

/** Todas las revisiones pendientes del entrenador (cualquier fecha), la más próxima primero. */
export async function listPendingReviews(trainerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('trainerId', trainerId)
    .eq('estado', 'pendiente')
    .order('fechaProgramada', { ascending: true })
  if (error) throw new Error(`Error al listar revisiones pendientes: ${error.message}`)
  return withClienteNombre(data ?? [])
}

/** Revisiones recibidas o revisadas este mes natural, para la tarjeta y su tendencia diaria. */
export async function listRevisionesRecibidasEsteMes(trainerId: string): Promise<Review[]> {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('trainerId', trainerId)
    .in('estado', ['recibida', 'revisada'])
    .gte('fechaRecepcion', inicioMes)
    .order('fechaRecepcion', { ascending: true })
  if (error) throw new Error(`Error al listar revisiones recibidas: ${error.message}`)
  return withClienteNombre(data ?? [])
}

export async function listReviewsByClient(trainerId: string, clientId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('trainerId', trainerId)
    .eq('clientId', clientId)
    .order('fechaProgramada', { ascending: false })
  if (error) throw new Error(`Error al listar revisiones: ${error.message}`)
  return withClienteNombre(data ?? [])
}

export async function createReview(data: ReviewInput): Promise<void> {
  const { error } = await supabase.from(TABLE).insert(data)
  if (error) throw new Error(`Error al crear la revisión: ${error.message}`)
}

export async function updateReviewEstado(id: string, estado: EstadoRevision, fechaRecepcion: string | null): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ estado, fechaRecepcion }).eq('id', id)
  if (error) throw new Error(`Error al actualizar la revisión: ${error.message}`)
}

/** Borrar un evento programado a mano desde el Calendario — a diferencia de
 * deletePendingReviews (automático, al desvincular), aquí el entrenador puede borrar
 * cualquier revisión/entreno suyo sea cual sea su estado (p.ej. uno programado por
 * error, o que ya no tiene sentido aunque el cliente siga vinculado). */
export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar: ${error.message}`)
}

/** Al desvincular un cliente (revokeLink en trainerRepo.ts), sus revisiones/entrenos
 * todavía PENDIENTES (agendados a futuro, nunca llegaron a pasar) dejan de tener
 * sentido — se eliminan para que no se queden colgados en el Calendario. Los que ya
 * se recibieron o revisaron son historial real y no se tocan. */
export async function deletePendingReviews(trainerId: string, clientId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('trainerId', trainerId).eq('clientId', clientId).eq('estado', 'pendiente')
  if (error) throw new Error(`Error al limpiar revisiones pendientes: ${error.message}`)
}
