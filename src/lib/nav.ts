export type Section = 'inicio' | 'macros' | 'peso' | 'progreso' | 'clientes' | 'ficha' | 'revisiones' | 'ajustes'

// 'macros' cubre tanto dieta flexible como cerrada — <Macros/> ya decide cuál mostrar según el cliente.
export type FichaTab = 'datos' | 'macros' | 'peso' | 'progreso' | 'entrenamiento' | 'revisiones' | 'pagos'

export type ProgresoTab = 'peso' | 'medidas' | 'pliegues' | 'evolucion'

export interface Route {
  section: Section
  progresoTab?: ProgresoTab
  fichaTab?: FichaTab
}
