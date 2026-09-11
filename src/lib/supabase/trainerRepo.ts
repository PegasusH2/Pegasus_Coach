import { supabase } from './client'
import { findProfileIdByEmail } from './profileRepo'
import { deletePendingReviews } from './reviewRepo'
import type { LinkStatus, TrainerClientLink } from '@/types'

const TABLE = 'trainer_client_links'

/**
 * El entrenador solicita acceso a un cliente por su email. Encuentra CUALQUIER
 * Cuenta Pegasus (Tracker o Coach) — no hace falta que la persona invitada
 * haya abierto Coach todavía. Lanza si no existe esa cuenta en absoluto.
 */
export async function requestAccess(trainerId: string, clientEmail: string): Promise<void> {
  const email = clientEmail.trim().toLowerCase()
  const clientId = await findProfileIdByEmail(email)
  if (!clientId) throw new Error('No existe ninguna Cuenta Pegasus con ese email')
  if (clientId === trainerId) throw new Error('No puedes solicitarte acceso a ti mismo')

  // trainer_client_links tiene unique(trainerId, clientId) y revokeLink nunca borra
  // la fila (solo status='revoked') — un vínculo ya revocado antes se REABRE con un
  // update en vez de intentar un insert que siempre chocaría con esa fila. Ver
  // supabase/migrations/0012_reabrir_solicitud_revocada.sql para el porqué hace
  // falta esa migración (RLS solo dejaba al entrenador escribir 'revoked').
  const { data: existente, error: readError } = await supabase
    .from(TABLE)
    .select('id, status')
    .eq('trainerId', trainerId)
    .eq('clientId', clientId)
    .maybeSingle()
  if (readError) throw new Error(`Error al comprobar el vínculo: ${readError.message}`)

  if (existente?.status === 'revoked') {
    const { error } = await supabase
      .from(TABLE)
      .update({ status: 'pending' satisfies LinkStatus, clientEmailAtInvite: email, respondedAt: null })
      .eq('id', existente.id)
    if (error) throw new Error(`Error al solicitar acceso: ${error.message}`)
    return
  }

  const { error } = await supabase
    .from(TABLE)
    .insert({ trainerId, clientId, status: 'pending' satisfies LinkStatus, clientEmailAtInvite: email })
  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una solicitud con esta cuenta')
    throw new Error(`Error al solicitar acceso: ${error.message}`)
  }
}

async function withNombres(rows: Record<string, unknown>[], idKey: 'trainerId' | 'clientId'): Promise<TrainerClientLink[]> {
  const ids = [...new Set(rows.map((r) => r[idKey] as string))]
  const nombreById = new Map<string, string>()
  const emailById = new Map<string, string>()
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, nombre, email').in('id', ids)
    for (const p of profiles ?? []) {
      nombreById.set(p.id as string, p.nombre as string)
      if (p.email) emailById.set(p.id as string, p.email as string)
    }
  }
  return rows.map((r) => ({
    ...r,
    otroNombre: nombreById.get(r[idKey] as string) || null,
    // Email real del perfil si ya existe; si no (cliente invitado que aún no
    // ha entrado a Coach), se cae al email con el que se le invitó.
    otroEmail:
      emailById.get(r[idKey] as string) ||
      (idKey === 'clientId' ? ((r.clientEmailAtInvite as string | null) ?? null) : null),
  })) as unknown as TrainerClientLink[]
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

/** Un vínculo concreto por id (p.ej. para mostrar "vinculado desde" en la ficha de un cliente). */
export async function getLinkById(linkId: string): Promise<TrainerClientLink | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', linkId).maybeSingle()
  if (error) throw new Error(`Error al leer el vínculo: ${error.message}`)
  if (!data) return null
  const [link] = await withNombres([data], 'trainerId')
  return link
}

/** Override de precio/intervalo de revisión para ESTE cliente — null = usa el valor
 * global de trainer_settings. Ver 0015_centro_configuracion_entrenador.sql: solo puede
 * tocar estas 2 columnas de un vínculo ya aceptado, sin cambiar su estado (el trigger
 * `trainer_client_links_overrides_guard` lo hace cumplir). */
export async function updateLinkOverrides(
  linkId: string,
  overrides: { reviewIntervalDaysOverride?: number | null; standardPriceOverride?: number | null },
): Promise<void> {
  const { error } = await supabase.from(TABLE).update(overrides).eq('id', linkId)
  if (error) throw new Error(`Error al guardar el override del cliente: ${error.message}`)
}

export async function revokeLink(linkId: string): Promise<void> {
  const { data: link, error: readError } = await supabase.from(TABLE).select('trainerId, clientId').eq('id', linkId).single()
  if (readError) throw new Error(`Error al revocar: ${readError.message}`)

  const { error } = await supabase
    .from(TABLE)
    .update({ status: 'revoked', respondedAt: new Date().toISOString() })
    .eq('id', linkId)
  if (error) throw new Error(`Error al revocar: ${error.message}`)

  // Bug real: sin esto, una revisión/entreno ya agendado se quedaba "pendiente"
  // para siempre en el Calendario aunque el cliente ya no estuviera vinculado —
  // ver deletePendingReviews (reviewRepo.ts) para qué se borra y qué no.
  await deletePendingReviews(link.trainerId, link.clientId)
}
