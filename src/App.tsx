import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { DiaTipoProvider } from './lib/DiaTipoContext'
import { SessionProvider, useSession } from './lib/SessionContext'
import { signOut } from './lib/supabase/auth'
import { exportarDatosJson } from './lib/exportData'
import type { Route } from './lib/nav'
import { Auth, CompletarPerfil } from './pages/Auth'
import { Inicio } from './pages/Inicio'
import { Macros } from './pages/Macros'
import { Peso } from './pages/Peso'
import { Progreso } from './pages/Progreso'
import { Clientes } from './pages/Clientes'
import { Ajustes } from './pages/Ajustes'

function AppShell() {
  const [route, setRoute] = useState<Route>({ section: 'inicio' })
  const { session, profile, profileChecked, profileError, clienteActivo, setClienteActivo } = useSession()

  if (session === undefined) {
    return <div className="flex h-screen items-center justify-center bg-bg text-text-muted">Cargando…</div>
  }
  if (!session) return <Auth />
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
          <div className="flex items-center justify-between bg-pegasus-red px-4 py-1.5 text-xs font-medium text-white">
            <span className="flex items-center gap-1.5">
              <Eye size={13} /> Viendo a {clienteActivo.nombre} · solo lectura
            </span>
            <button className="underline" onClick={() => setClienteActivo(null)}>
              Volver a mis datos
            </button>
          </div>
        )}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            route={route}
            onNavigate={setRoute}
            nombrePerfil={profile.nombre}
            rol={profile.role}
            onExportar={onExportar}
            onImportarExcel={onImportarExcel}
            onCerrarSesion={signOut}
          />
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {route.section === 'inicio' && <Inicio onNavigate={setRoute} />}
            {route.section === 'macros' && <Macros />}
            {route.section === 'peso' && <Peso />}
            {route.section === 'progreso' && (
              <Progreso tab={route.progresoTab ?? 'evolucion'} onNavigate={setRoute} />
            )}
            {route.section === 'clientes' && <Clientes onNavigate={setRoute} />}
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
