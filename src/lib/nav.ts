export type Section = 'inicio' | 'macros' | 'peso' | 'progreso' | 'clientes' | 'ajustes'

export type ProgresoTab = 'peso' | 'medidas' | 'pliegues' | 'evolucion'

export interface Route {
  section: Section
  progresoTab?: ProgresoTab
}
