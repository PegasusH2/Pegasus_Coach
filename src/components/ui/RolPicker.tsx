import { UserRound, Users } from 'lucide-react'
import type { Rol } from '@/types'

export function RolPicker({ value, onChange }: { value: Rol; onChange: (r: Rol) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">Tipo de cuenta</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChange('personal')}
          className={`flex flex-col items-center gap-1.5 rounded-control border p-3 text-sm transition-colors ${
            value === 'personal' ? 'border-pegasus-red bg-pegasus-redSoft text-pegasus-red' : 'border-bg-border text-text-secondary'
          }`}
        >
          <UserRound size={16} />
          Personal
        </button>
        <button
          onClick={() => onChange('entrenador')}
          className={`flex flex-col items-center gap-1.5 rounded-control border p-3 text-sm transition-colors ${
            value === 'entrenador' ? 'border-pegasus-red bg-pegasus-redSoft text-pegasus-red' : 'border-bg-border text-text-secondary'
          }`}
        >
          <Users size={16} />
          Entrenador
        </button>
      </div>
    </div>
  )
}
