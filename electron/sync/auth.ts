// Autenticación de la Cuenta Pegasus. Nutrition sigue funcionando sin cuenta
// ("modo local") — estas funciones solo se usan desde la tarjeta "Cuenta
// Pegasus" de Ajustes; ninguna otra parte de la app depende de que exista
// sesión. Alcance reducido a propósito respecto a Pegasus Tracker: solo
// iniciar/cerrar sesión, nunca registro ni "olvidé mi contraseña" (eso se
// hace desde Tracker, que ya lo tiene funcionando en el navegador).
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'

export async function signIn(email: string, password: string): Promise<Session> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error('SYNC_NOT_CONFIGURED')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.session) throw new Error('No se pudo iniciar sesión')
  return data.session
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function authErrorMessage(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err ?? '')
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos'
  if ((err as { status?: number })?.status === 429 || /rate limit|too many requests/i.test(msg)) {
    return 'Demasiados intentos — espera un poco antes de volver a intentarlo'
  }
  if (msg === 'SYNC_NOT_CONFIGURED') return 'La sincronización no está configurada'
  return 'No se pudo completar la operación'
}
