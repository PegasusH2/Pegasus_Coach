import { supabase } from './client'
import type { Profile, Rol, Sexo } from '@/types'

export async function getProfile(userId: string): Promise<Profile | undefined> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) {
    if (error.code === 'PGRST116') return undefined // sin filas
    throw new Error(`Error al leer el perfil: ${error.message}`)
  }
  return data as Profile
}

/** Crea la fila de profiles para una cuenta que ya existe en Supabase Auth (p.ej. venida de
 * Pegasus Tracker) pero todavía no ha completado el alta específica de Coach (rol, nombre). */
export async function createProfile(userId: string, role: Rol, nombre: string, email: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').insert({ id: userId, role, nombre, email })
  if (error) throw new Error(`Error al crear el perfil: ${error.message}`)
}

export async function updateProfile(
  userId: string,
  data: Partial<Omit<Profile, 'id' | 'role'>>,
): Promise<void> {
  const { error } = await supabase.from('profiles').update(data).eq('id', userId)
  if (error) throw new Error(`Error al actualizar el perfil: ${error.message}`)
}

/** Busca el id de una cuenta por email, vía función RPC (nunca se expone auth.users directamente). */
export async function findProfileIdByEmail(email: string): Promise<string | undefined> {
  const { data, error } = await supabase.rpc('find_profile_by_email', { p_email: email })
  if (error) throw new Error(`Error al buscar el email: ${error.message}`)
  return (data as string | null) ?? undefined
}

export function rolLabel(rol: Rol): string {
  return rol === 'entrenador' ? 'Entrenador' : 'Personal'
}

export const SEXO_LABELS: Record<Sexo, string> = {
  mujer: 'Mujer',
  hombre: 'Hombre',
  otro: 'Otro',
  prefiero_no_decir: 'Prefiero no decirlo',
}

export function sexoLabel(sexo: Sexo | null): string | null {
  return sexo ? SEXO_LABELS[sexo] : null
}
