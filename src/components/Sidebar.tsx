import {
  ChevronDown,
  Home,
  LineChart,
  LogOut,
  PieChart,
  Ruler,
  Scale,
  Settings,
  Users,
  X,
} from 'lucide-react'
import type { Route, Section } from '@/lib/nav'
import { rolLabel } from '@/lib/supabase/profileRepo'
import type { Rol } from '@/types'

interface SidebarProps {
  route: Route
  onNavigate: (route: Route) => void
  nombrePerfil: string
  rol: Rol
  onCerrarSesion: () => void
  /** Cierra el drawer en móvil — el mismo Sidebar se usa como panel fijo en desktop
   * y como drawer deslizante en móvil (ver App.tsx); el botón solo se ve en móvil. */
  onClose?: () => void
}

const PROGRESO_TABS: { key: NonNullable<Route['progresoTab']>; label: string }[] = [
  { key: 'peso', label: 'Peso' },
  { key: 'medidas', label: 'Medidas' },
  { key: 'pliegues', label: 'Pliegues' },
  { key: 'evolucion', label: 'Evolución' },
]

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? 'bg-pegasus-redSoft text-pegasus-red' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function Sidebar({ route, onNavigate, nombrePerfil, rol, onCerrarSesion, onClose }: SidebarProps) {
  const progresoAbierto = route.section === 'progreso'
  // Macros/Peso/Progreso son el seguimiento PERSONAL (rol 'personal') — el
  // entrenador gestiona el progreso de sus clientes desde la ficha, no aquí.
  // No se elimina nada: mismos componentes, solo se ocultan estos 3 accesos
  // de nivel superior cuando el rol es 'entrenador' (ver App.tsx).
  const mostrarSeguimientoPersonal = rol !== 'entrenador'

  const irA = (section: Section) => {
    if (section === 'progreso') onNavigate({ section, progresoTab: route.progresoTab ?? 'evolucion' })
    else onNavigate({ section })
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col justify-between border-r border-bg-border bg-bg px-3 py-4 md:w-60">
      <div>
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="Pegasus" className="h-8 w-8 rounded-lg" />
            <div>
              <div className="text-sm font-bold leading-tight">PEGASUS</div>
              <div className="text-[10px] font-medium tracking-widest text-text-muted">COACH</div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar menú"
              className="rounded-control p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary md:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          <NavItem
            active={route.section === 'inicio'}
            icon={<Home size={16} />}
            label="Inicio"
            onClick={() => irA('inicio')}
          />
          {mostrarSeguimientoPersonal && (
            <NavItem
              active={route.section === 'macros'}
              icon={<PieChart size={16} />}
              label="Macros"
              onClick={() => irA('macros')}
            />
          )}
          {mostrarSeguimientoPersonal && (
            <NavItem
              active={route.section === 'peso'}
              icon={<Scale size={16} />}
              label="Peso"
              onClick={() => irA('peso')}
            />
          )}

          {mostrarSeguimientoPersonal && (
            <button
              onClick={() => irA('progreso')}
              className={`flex w-full items-center justify-between rounded-control px-3 py-2.5 text-sm font-medium transition-colors ${
                progresoAbierto ? 'text-pegasus-red' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              <span className="flex items-center gap-3">
                <LineChart size={16} />
                Progreso
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${progresoAbierto ? 'rotate-180' : ''}`}
              />
            </button>
          )}
          {mostrarSeguimientoPersonal && progresoAbierto && (
            <div className="ml-6 flex flex-col gap-0.5 border-l border-bg-border pl-3">
              {PROGRESO_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onNavigate({ section: 'progreso', progresoTab: tab.key })}
                  className={`rounded-control px-2 py-1.5 text-left text-sm transition-colors ${
                    route.progresoTab === tab.key
                      ? 'text-pegasus-red'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {rol === 'entrenador' && (
            <NavItem
              active={route.section === 'clientes'}
              icon={<Users size={16} />}
              label="Clientes"
              onClick={() => irA('clientes')}
            />
          )}

          <NavItem
            active={route.section === 'ajustes'}
            icon={<Settings size={16} />}
            label="Ajustes"
            onClick={() => irA('ajustes')}
          />
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-card border border-bg-border bg-bg-card p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pegasus-redSoft text-pegasus-red">
            <Ruler size={14} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Hola, {nombrePerfil || 'Atleta'}</div>
            <div className="text-xs text-text-muted">{rolLabel(rol)}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={onCerrarSesion}
            className="flex items-center gap-2 rounded-control px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-pegasus-red"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>

        <div className="px-2 text-[10px] text-text-muted">v2.0.0</div>
      </div>
    </aside>
  )
}
