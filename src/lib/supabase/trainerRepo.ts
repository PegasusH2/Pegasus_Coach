import { supabase } from './client'
import { findProfileIdByEmail } from './profileRepo'
import type { LinkStatus, TrainerClientLink } from '@/types'

const TABLE = 'trainer_client_links'

/** El entrenador solicita acceso a un cliente por su email. Lanza si no existe esa cuenta. */
export async function requestAccess(trainerId: string, clientEmail: string): Promise<void> {
  const clientId = await findProfileIdByEmail(clientEmail.trim().toLowerCase())
  if (!clientId) throw new Error('No existe ninguna cuenta Pegasus con ese email')
  if (clientId === trainerId) throw new Error('No puedes solicitarte acceso a ti mismo')

  const { error } = await supabase
    .from(TABLE)
    .insert({ trainerId, clientId, status: 'pending' satisfies LinkStatus })
  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una solicitud con esta cuenta')
    throw new Error(`Error al solicitar acceso: ${error.message}`)
  }
}

async function withNombres(rows: Record<string, unknown>[], idKey: 'trainerId' | 'clientId'): Promise<TrainerClientLink[]> {
  const ids = [...new Set(rows.map((r) => r[idKey] as string))]
  if (ids.length === 0) return rows as unknown as TrainerClientLink[]
  const { data: profiles } = await supabase.from('profiles').select('id, nombre').in('id', ids)
  const nombreById = new Map((profiles ?? []).map((p) => [p.id as string, p.nombre as string]))
  return rows.map((r) => ({ ...r, otroNombre: nombreById.get(r[idKey] as string) ?? null })) as unknown as TrainerClientLink[]
}

/** Vínculos donde el usuario actual es el entrenador (clientes propios + solicitudes pendientes). */
export async function listAsTrainer(trainerId: string): Promise<TrainerClientLink[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('trainerId', trainerId)
    .neq('status', 'revoked')
    .order('createdAt', { ascending: false })
  if (error) throw new Error(`Error al listar clientes: ${error.message}`)
  return withNombres(data ?? [], 'clientId')
}

/** Vínculos donde el usuario actual es el cliente (entrenadores que le han pedido acceso). */
export async function listAsClient(clientId: string): Promise<TrainerClientLink[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('clientId', clientId)
    .neq('status', 'revoked')
    .order('createdAt', { ascending: false })
  if (error) throw new Error(`Error al listar solicitudes: ${error.message}`)
  return withNombres(data ?? [], 'trainerId')
}

export async function respondToRequest(linkId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status: accept ? 'accepted' : 'revoked', respondedAt: new Date().toISOString() })
    .eq('id', linkId)
  if (error) throw new Error(`Error al responder: ${error.message}`)
}

export async function revokeLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status: 'revoked', respondedAt: new Date().toISOString() })
    .eq('id', linkId)
  if (error) throw new Error(`Error al revocar: ${error.message}`)
}
