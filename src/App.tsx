import { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { DiaTipoProvider } from './lib/DiaTipoContext'
import { SessionProvider, useSession } from './lib/SessionContext'
import { signOut } from './lib/supabase/auth'
import type { Route } from './lib/nav'
import { ActualizarPassword, Auth, CompletarPerfil } from './pages/Auth'
import { Inicio } from './pages/Inicio'
import { Macros } from './pages/Macros'
import { Peso } from './pages/Peso'
import { Progreso } from './pages/Progreso'
import { Clientes } from './pages/Clientes'
import { FichaCliente } from './pages/FichaCliente'
import { Revisiones } from './pages/Revisiones'
import { Calendario } from './pages/Calendario'
import { CalculadoraMacros } from './pages/CalculadoraMacros'
import { Ajustes } from './pages/Ajustes'

function AppShell() {
  const [route, setRoute] = useState<Route>({ section: 'inicio' })
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { session, profile, profileChecked, profileError, recoveryMode, trainerSettings } = useSession()

  // Al cambiar de cuenta (o cerrar sesión) o de rol, no debe quedar la sección
  // de una pantalla que quizá no aplique ya (p.ej. "clientes" para un perfil
  // 'personal').
  useEffect(() => {
    setRoute({ section: 'inicio' })
  }, [session?.user.id, profile?.role])

  // Para un entrenador, la pantalla de ARRANQUE es su preferencia (Ajustes →
  // Preferencias → "Pantalla al iniciar"), no siempre "inicio" — pero solo se
  // aplica UNA VEZ al iniciar sesión (guardada en el ref), nunca en cada
  // guardado posterior de Ajustes: si el entrenador está en Calendario y
  // cambia esa preferencia, no queremos sacarlo de donde está.
  const startScreenAplicadaPara = useRef<string | null>(null)
  useEffect(() => {
    if (!session || !trainerSettings || profile?.role !== 'entrenador') return
    if (startScreenAplicadaPara.current === session.user.id) return
    startScreenAplicadaPara.current = session.user.id
    setRoute({ section: trainerSettings.startScreen })
  }, [session, trainerSettings, profile?.role])

  // El drawer móvil se cierra solo: al elegir una sección, al pulsar Escape,
  // o al tocar fuera (backdrop, ver más abajo). Mientras está abierto se
  // bloquea el scroll del body para que un swipe en iOS no desplace el
  // contenido de detrás del backdrop.
  useEffect(() => {
    if (!menuAbierto) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowPrevio
    }
  }, [menuAbierto])

  function navegarYCerrarMenu(r: Route) {
    setRoute(r)
    setMenuAbierto(false)
  }

  if (session === undefined) {
    return <div className="flex h-screen items-center justify-center bg-bg text-text-muted">Cargando…</div>
  }
  if (!session) return <Auth />
  if (recoveryMode) return <ActualizarPassword />
  if (profileError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-bg px-4 text-center">
        <p className="text-sm font-medium text-pegasus-red">No se pudo cargar tu perfil</p>
        <p className="max-w-sm text-xs text-text-muted">{profileError}</p>
        <p className="max-w-sm text-xs text-text-muted">
          Si acabas de configurar la app, comprueba que ejecutaste la migración SQL en Supabase.
        </p>
      </div>
    )
  }
  if (!profileChecked) {
    return <div className="flex h-screen items-center justify-center bg-bg text-text-muted">Cargando perfil…</div>
  }
  // Sesión válida (p.ej. cuenta ya existente en Pegasus Tracker) sin fila de profiles todavía.
  if (!profile) return <CompletarPerfil />

  return (
    <DiaTipoProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        {/* Barra superior — solo móvil/tablet estrecho; en desktop el Sidebar ya es visible siempre. */}
        <div
          className="flex items-center gap-3 border-b border-bg-border bg-bg px-4 py-3 md:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="rounded-control p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          >
            <Menu size={20} />
          </button>
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="Pegasus" className="h-6 w-6 rounded-md" />
          <span className="text-sm font-bold">
            PEGASUS <span className="font-normal text-text-muted">COACH</span>
          </span>
        </div>

        <div className="relative flex flex-1 overflow-hidden">
          {menuAbierto && (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMenuAbierto(false)}
              aria-hidden="true"
            />
          )}

          <div
            className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
              menuAbierto ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <Sidebar
              route={route}
              onNavigate={navegarYCerrarMenu}
              nombrePerfil={profile.nombre}
              rol={profile.role}
              onCerrarSesion={signOut}
              onClose={() => setMenuAbierto(false)}
            />
          </div>

          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-8 md:py-6">
            {route.section === 'inicio' && <Inicio onNavigate={setRoute} />}
            {route.section === 'macros' && profile.role !== 'entrenador' && <Macros />}
            {route.section === 'peso' && profile.role !== 'entrenador' && <Peso />}
            {route.section === 'progreso' && profile.role !== 'entrenador' && (
              <Progreso tab={route.progresoTab ?? 'evolucion'} onNavigate={setRoute} />
            )}
            {route.section === 'clientes' && profile.role === 'entrenador' && <Clientes onNavigate={setRoute} />}
            {route.section === 'ficha' && profile.role === 'entrenador' && (
              <FichaCliente tab={route.fichaTab ?? 'datos'} onNavigate={setRoute} />
            )}
            {route.section === 'revisiones' && profile.role === 'entrenador' && <Revisiones />}
            {route.section === 'calendario' && profile.role === 'entrenador' && <Calendario />}
            {route.section === 'calculadora' && profile.role === 'entrenador' && <CalculadoraMacros />}
            {route.section === 'ajustes' && <Ajustes />}
          </main>
        </div>
      </div>
    </DiaTipoProvider>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  )
}
