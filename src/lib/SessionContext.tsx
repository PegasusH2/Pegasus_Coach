import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase/client'
import { getProfile } from './supabase/profileRepo'
import type { Profile } from '@/types'

interface ClienteActivo {
  id: string
  nombre: string
}

interface SessionContextValue {
  /** undefined = todavía comprobando sesión inicial; null = sin sesión. */
  session: Session | null | undefined
  profile: Profile | null
  /** true en cuanto termina el primer intento de cargar el perfil (con éxito o no) — distingue "todavía cargando" de "cargado y no existe". */
  profileChecked: boolean
  /** Si getProfile() falla (p.ej. no se ha ejecutado la migración SQL todavía), el motivo — nunca se queda cargando en silencio. */
  profileError: string | null
  refreshProfile: () => Promise<void>
  clienteActivo: ClienteActivo | null
  setClienteActivo: (c: ClienteActivo | null) => void
  /** A qué usuario apuntan las pantallas ahora mismo: el propio, o el cliente seleccionado por un entrenador. */
  targetUserId: string | null
  soloLectura: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [clienteActivo, setClienteActivo] = useState<ClienteActivo | null>(null)

  async function loadProfile(userId: string) {
    try {
      const p = await getProfile(userId)
      setProfile(p ?? null)
      setProfileError(null)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err))
    } finally {
      setProfileChecked(true)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setClienteActivo(null)
      if (newSession) loadProfile(newSession.user.id)
      else {
        setProfile(null)
        setProfileChecked(false)
        setProfileError(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const targetUserId = clienteActivo?.id ?? session?.user.id ?? null

  return (
    <SessionContext.Provider
      value={{
        session,
        profile,
        profileChecked,
        profileError,
        refreshProfile: () => (session ? loadProfile(session.user.id) : Promise.resolve()),
        clienteActivo,
        setClienteActivo,
        targetUserId,
        soloLectura: clienteActivo !== null,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider')
  return ctx
}
