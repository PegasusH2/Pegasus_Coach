import type { TipoDieta } from '@/types'

type Filtro = TipoDieta | 'todos'

const OPCIONES: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'macros', label: 'Macros' },
  { key: 'cerrada', label: 'Dieta cerrada' },
]

export function HistoryTypeFilter({ value, onChange }: { value: Filtro; onChange: (v: Filtro) => void }) {
  return (
    <div className="flex w-full gap-1 rounded-control bg-bg-panel p-1 sm:w-fit">
      {OPCIONES.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded-[8px] px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
            value === o.key ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
