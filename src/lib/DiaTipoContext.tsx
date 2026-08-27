import { createContext, useContext, useState, type ReactNode } from 'react'
import type { DiaTipo } from '@shared/types'

const DiaTipoContext = createContext<{ diaTipo: DiaTipo; setDiaTipo: (d: DiaTipo) => void } | null>(null)

export function DiaTipoProvider({ children }: { children: ReactNode }) {
  const [diaTipo, setDiaTipo] = useState<DiaTipo>('ON')
  return <DiaTipoContext.Provider value={{ diaTipo, setDiaTipo }}>{children}</DiaTipoContext.Provider>
}

export function useDiaTipo() {
  const ctx = useContext(DiaTipoContext)
  if (!ctx) throw new Error('useDiaTipo debe usarse dentro de DiaTipoProvider')
  return ctx
}
