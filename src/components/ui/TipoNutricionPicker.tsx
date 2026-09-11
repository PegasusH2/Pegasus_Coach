import { Salad, UtensilsCrossed } from 'lucide-react'
import type { TipoDieta } from '@/types'

export function TipoNutricionPicker({ value, onChange }: { value: TipoDieta; onChange: (t: TipoDieta) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onChange('macros')}
        className={`flex flex-col items-center gap-1 rounded-control border p-2 text-sm transition-colors ${
          value === 'macros' ? 'border-pegasus-red bg-pegasus-redSoft text-pegasus-red' : 'border-bg-border text-text-secondary'
        }`}
      >
        <Salad size={14} />
        Macros
      </button>
      <button
        onClick={() => onChange('cerrada')}
        className={`flex flex-col items-center gap-1 rounded-control border p-2 text-sm transition-colors ${
          value === 'cerrada' ? 'border-pegasus-red bg-pegasus-redSoft text-pegasus-red' : 'border-bg-border text-text-secondary'
        }`}
      >
        <UtensilsCrossed size={14} />
        Dieta cerrada
      </button>
    </div>
  )
}
