import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'

export type Rol = 'personal' | 'entrenador'

export async function signUp(email: string, password: string, rol: Rol, nombre: string): Promise<Session> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (!data.user) throw new Error('No se pudo crear la cuenta')

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, role: rol, nombre, email: data.user.email })
  if (profileError) throw profileError

  if (!data.session) throw new Error('CONFIRM_EMAIL')
  return data.session
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.session) throw new Error('No se pudo iniciar sesión')
  return data.session
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** Manda el email de "recuperar contraseña" — el enlace vuelve a esta misma app. */
export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

/** Cambia la contraseña de la sesión de recuperación activa (tras pulsar el enlace del email). */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function authErrorMessage(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err ?? '')
  if (msg === 'CONFIRM_EMAIL') return 'Cuenta creada — revisa tu email para confirmarla antes de iniciar sesión.'
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos'
  if (/user already registered/i.test(msg)) return 'Ya existe una cuenta con ese email'
  if ((err as { status?: number })?.status === 429 || /rate limit|too many requests/i.test(msg)) {
    return 'Demasiados intentos — espera un poco antes de volver a intentarlo'
  }
  if (/password/i.test(msg) && /least|short|characters/i.test(msg)) return 'La contraseña es demasiado corta'
  return msg || 'No se pudo completar la operación'
}
