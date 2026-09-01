import { useEffect, useState } from 'react'
import { Eye, Menu } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { DiaTipoProvider } from './lib/DiaTipoContext'
import { SessionProvider, useSession } from './lib/SessionContext'
import { signOut } from './lib/supabase/auth'
import { exportarDatosJson } from './lib/exportData'
import type { Route } from './lib/nav'
import { ActualizarPassword, Auth, CompletarPerfil } from './pages/Auth'
import { Inicio } from './pages/Inicio'
import { Macros } from './pages/Macros'
import { Peso } from './pages/Peso'
import { Progreso } from './pages/Progreso'
import { Clientes } from './pages/Clientes'
import { FichaCliente } from './pages/FichaCliente'
import { Revisiones } from './pages/Revisiones'
import { Ajustes } from './pages/Ajustes'

function AppShell() {
  const [route, setRoute] = useState<Route>({ section: 'inicio' })
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { session, profile, profileChecked, profileError, clienteActivo, setClienteActivo, recoveryMode } = useSession()

  // Al cambiar de cuenta (o cerrar sesión), no debe quedar la sección de una
  // pantalla que quizá no aplique al nuevo rol (p.ej. "clientes").
  useEffect(() => {
    setRoute({ section: 'inicio' })
  }, [session?.user.id])

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

  async function onExportar() {
    if (!session) return
    await exportarDatosJson(session.user.id)
  }

  function onImportarExcel() {
    setRoute({ section: 'ajustes' })
  }

  return (
    <DiaTipoProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        {clienteActivo && (
          <div className="flex items-center justify-between gap-2 bg-pegasus-red px-4 py-1.5 text-xs font-medium text-white">
            <span className="flex items-center gap-1.5">
              <Eye size={13} /> Viendo a {clienteActivo.nombre} · solo lectura
            </span>
            <button className="shrink-0 underline" onClick={() => setClienteActivo(null)}>
              Volver a mis datos
            </button>
          </div>
        )}

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
            PEGASUS <span className="font-normal text-text-muted">NUTRITION</span>
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
              onExportar={onExportar}
              onImportarExcel={onImportarExcel}
              onCerrarSesion={signOut}
              onClose={() => setMenuAbierto(false)}
            />
          </div>

          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-8 md:py-6">
            {route.section === 'inicio' && <Inicio onNavigate={setRoute} />}
            {route.section === 'macros' && <Macros />}
            {route.section === 'peso' && <Peso />}
            {route.section === 'progreso' && (
              <Progreso tab={route.progresoTab ?? 'evolucion'} onNavigate={setRoute} />
            )}
            {route.section === 'clientes' && profile.role === 'entrenador' && <Clientes onNavigate={setRoute} />}
            {route.section === 'ficha' && profile.role === 'entrenador' && (
              <FichaCliente tab={route.fichaTab ?? 'datos'} onNavigate={setRoute} />
            )}
            {route.section === 'revisiones' && profile.role === 'entrenador' && <Revisiones />}
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
