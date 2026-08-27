export type Section = 'inicio' | 'macros' | 'peso' | 'progreso' | 'ajustes'

export type ProgresoTab = 'peso' | 'medidas' | 'pliegues' | 'evolucion'

export interface Route {
  section: Section
  progresoTab?: ProgresoTab
}
