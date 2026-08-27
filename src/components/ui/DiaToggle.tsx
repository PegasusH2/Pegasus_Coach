import type { DiaTipo } from '@shared/types'

export function DiaToggle({ value, onChange }: { value: DiaTipo; onChange: (v: DiaTipo) => void }) {
  return (
    <div className="inline-flex rounded-control bg-bg-panel p-1">
      {(['ON', 'OFF'] as DiaTipo[]).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`rounded-[8px] px-4 py-1.5 text-sm font-semibold transition-colors ${
            value === opt ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Día {opt}
        </button>
      ))}
    </div>
  )
}
