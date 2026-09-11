// Compartido entre Inicio.tsx (dashboard del entrenador) y FichaCliente.tsx (columna
// derecha, junto a Clientes) — mismos 4 atajos, mismos destinos, para no duplicar
// el componente ni su lógica de navegación.
import { CheckCircle2, Dumbbell, Ruler, UserPlus, Zap } from 'lucide-react'
import { Card, CardLabel } from '@/components/ui/Card'
import type { Route } from '@/lib/nav'

export function PanelAccionesRapidas({ onNavigate }: { onNavigate: (r: Route) => void }) {
  // Crear rutina / Registrar medidas son acciones POR CLIENTE — hoy no existe
  // (ni se añade aquí) un flujo que no pase antes por elegir cliente, así que
  // esas dos llevan a Clientes en vez de simular una acción directa falsa.
  // "Nueva revisión" sí tiene ya un destino real: el Calendario, donde se
  // elige cliente + tipo + fecha en el mismo sitio.
  const ir = () => onNavigate({ section: 'clientes' })
  const acciones = [
    { key: 'cliente', label: 'Añadir cliente', icon: UserPlus, onClick: ir },
    { key: 'rutina', label: 'Crear rutina', icon: Dumbbell, onClick: ir },
    { key: 'medidas', label: 'Registrar medidas', icon: Ruler, onClick: ir },
    { key: 'revision', label: 'Nueva revisión', icon: CheckCircle2, onClick: () => onNavigate({ section: 'calendario' }) },
  ]
  return (
    <Card>
      <CardLabel icon={<Zap size={13} />}>Acciones rápidas</CardLabel>
      <div className="grid grid-cols-2 gap-2">
        {acciones.map((a) => (
          <button
            key={a.key}
            onClick={a.onClick}
            className="flex flex-col items-start gap-2 rounded-control border border-bg-border bg-bg-panel/60 p-3 text-left text-xs font-semibold text-text-secondary transition-colors hover:border-pegasus-red hover:text-pegasus-red"
          >
            <a.icon size={16} />
            {a.label}
          </button>
        ))}
      </div>
    </Card>
  )
}
