export type Section =
  | 'inicio'
  | 'macros'
  | 'peso'
  | 'progreso'
  | 'clientes'
  | 'ficha'
  | 'revisiones'
  | 'calendario'
  | 'calculadora'
  | 'ajustes'

// 'macros' cubre tanto el modo Macros como Dieta cerrada — <Macros/> ya decide cuál mostrar según el cliente.
export type FichaTab = 'datos' | 'macros' | 'progreso' | 'entrenamiento' | 'revisiones' | 'pagos'

export type ProgresoTab = 'peso' | 'medidas' | 'pliegues'

export interface Route {
  section: Section
  progresoTab?: ProgresoTab
  fichaTab?: FichaTab
}
