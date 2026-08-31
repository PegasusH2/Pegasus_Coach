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
