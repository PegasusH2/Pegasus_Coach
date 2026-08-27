import { useState } from 'react'
import { Titlebar } from './components/Titlebar'
import { Sidebar } from './components/Sidebar'
import { DiaTipoProvider } from './lib/DiaTipoContext'
import { useProfile } from './hooks/useData'
import type { Route } from './lib/nav'
import { Inicio } from './pages/Inicio'
import { Macros } from './pages/Macros'
import { Peso } from './pages/Peso'
import { Progreso } from './pages/Progreso'
import { Ajustes } from './pages/Ajustes'

export default function App() {
  const [route, setRoute] = useState<Route>({ section: 'inicio' })
  const { data: profile } = useProfile()

  async function onExportar() {
    const res = await window.pegasus.data.exportJson()
    if (res) window.alert(`Datos exportados en:\n${res.path}`)
  }

  function onImportarExcel() {
    setRoute({ section: 'ajustes' })
  }

  return (
    <DiaTipoProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        <Titlebar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            route={route}
            onNavigate={setRoute}
            nombrePerfil={profile?.nombre ?? ''}
            onExportar={onExportar}
            onImportarExcel={onImportarExcel}
          />
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {route.section === 'inicio' && <Inicio onNavigate={setRoute} />}
            {route.section === 'macros' && <Macros />}
            {route.section === 'peso' && <Peso />}
            {route.section === 'progreso' && (
              <Progreso tab={route.progresoTab ?? 'evolucion'} onNavigate={setRoute} />
            )}
            {route.section === 'ajustes' && <Ajustes />}
          </main>
        </div>
      </div>
    </DiaTipoProvider>
  )
}
