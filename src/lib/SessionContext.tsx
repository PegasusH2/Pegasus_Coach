import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase/client'
import { getProfile } from './supabase/profileRepo'
import { listAsClient } from './supabase/trainerRepo'
import type { Profile, TrainerClientLink } from '@/types'

interface ClienteActivo {
  id: string
  nombre: string
  /** Id del vínculo trainer_client_links — necesario para pagos, ligados al vínculo, no solo al cliente. */
  linkId: string
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
  /** Vínculo aceptado donde YO soy el cliente (si existe) — mi propio entrenador, no el de un cliente que esté viendo. */
  miVinculoEntrenador: TrainerClientLink | null
  /** Atajo de `miVinculoEntrenador !== null`. */
  tengoEntrenadorAceptado: boolean
  /** Exclusivo de Macros/Dieta cerrada: el entrenador SÍ puede editar el contenido
   * nutricional del cliente que esté viendo, y el propio cliente pierde su propia
   * edición mientras tenga entrenador (modelo exclusivo, no aditivo — decisión ya
   * tomada e implementada antes del "control total" de abajo).
   *
   * Peso/Progreso/Entrenamiento NO tienen un flag equivalente: desde
   * supabase/migrations/0007_control_total_entrenador.sql el modelo ahí es
   * ADITIVO — el cliente conserva siempre su propia escritura (en Tracker) y el
   * entrenador gana escritura además, nunca se le retira nada al cliente. Por eso
   * `Peso.tsx`/`Progreso.tsx`/`FichaCliente.tsx` ya no leen ningún flag de
   * "solo lectura": siempre son editables, sea cual sea quién los esté viendo. */
  soloLecturaNutricion: boolean
  /** true tras entrar desde el enlace de "recuperar contraseña" del email — hay
   * sesión, pero antes de nada hay que dejar poner una contraseña nueva. */
  recoveryMode: boolean
  clearRecoveryMode: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [clienteActivo, setClienteActivo] = useState<ClienteActivo | null>(null)
  const [miVinculoEntrenador, setMiVinculoEntrenador] = useState<TrainerClientLink | null>(null)
  const [recoveryMode, setRecoveryMode] = useState(false)

  async function loadProfile(userId: string) {
    try {
      const [p, links] = await Promise.all([getProfile(userId), listAsClient(userId)])
      setProfile(p ?? null)
      setMiVinculoEntrenador(links.find((l) => l.status === 'accepted') ?? null)
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
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(newSession)
      setClienteActivo(null)
      if (newSession) loadProfile(newSession.user.id)
      else {
        setProfile(null)
        setMiVinculoEntrenador(null)
        setProfileChecked(false)
        setProfileError(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const targetUserId = clienteActivo?.id ?? session?.user.id ?? null
  const tengoEntrenadorAceptado = miVinculoEntrenador !== null

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
        miVinculoEntrenador,
        tengoEntrenadorAceptado,
        soloLecturaNutricion: clienteActivo !== null ? false : tengoEntrenadorAceptado,
        recoveryMode,
        clearRecoveryMode: () => setRecoveryMode(false),
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
