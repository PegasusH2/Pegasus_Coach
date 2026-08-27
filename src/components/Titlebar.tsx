import { Minus, Square, X } from 'lucide-react'

export function Titlebar() {
  return (
    <div className="drag-region flex h-9 shrink-0 items-center justify-between bg-bg px-3">
      <div className="text-xs font-medium text-text-muted">PEGASUS NUTRITION</div>
      <div className="no-drag flex items-center gap-1">
        <button
          aria-label="Minimizar"
          className="flex h-7 w-9 items-center justify-center rounded text-text-secondary hover:bg-bg-hover"
          onClick={() => window.pegasus.window.minimize()}
        >
          <Minus size={14} />
        </button>
        <button
          aria-label="Maximizar"
          className="flex h-7 w-9 items-center justify-center rounded text-text-secondary hover:bg-bg-hover"
          onClick={() => window.pegasus.window.maximizeToggle()}
        >
          <Square size={12} />
        </button>
        <button
          aria-label="Cerrar"
          className="flex h-7 w-9 items-center justify-center rounded text-text-secondary hover:bg-pegasus-red hover:text-white"
          onClick={() => window.pegasus.window.close()}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
