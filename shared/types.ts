// Tipos compartidos entre el proceso principal (Electron) y el renderer (React).
// fecha* siempre en formato ISO 'YYYY-MM-DD'.

export interface Profile {
  id: number
  nombre: string
  pesoInicial: number | null
  fechaInicio: string | null
  neatObjetivoPasos: number | null
}

export interface Mesociclo {
  id: number
  numero: number
  nombre: string | null
  fechaInicio: string | null
}

export interface Semana {
  id: number
  mesocicloId: number
  numero: number
  fechaInicio: string | null
}

export interface MacroPlan {
  id: number
  fecha: string
  semanaId: number | null
  neatObjetivoPasos: number | null
  aguaLitros: number | null
  salGramos: number | null
  entrenamientoDiasSemana: number | null
  entrenamientoDuracionMin: number | null
  pesoCorporalRef: number | null
  porcentajeGraso: number | null
  normocalorico: number | null
  diasOn: number | null
  proteinaOn: number | null
  hidratosOn: number | null
  grasasOn: number | null
  diasOff: number | null
  proteinaOff: number | null
  hidratosOff: number | null
  grasasOff: number | null
  notas: string | null
}

export type MacroPlanInput = Omit<MacroPlan, 'id'>

export interface MacroPlanCalculado extends MacroPlan {
  calTotalOn: number
  calTotalOff: number
  promedioCalorias: number
  superavitDeficit: number
  calPorKg: number
  proteinaOnPorKg: number
  hidratosOnPorKg: number
  grasasOnPorKg: number
  proteinaOffPorKg: number
  hidratosOffPorKg: number
  grasasOffPorKg: number
}

export interface WeightEntry {
  id: number
  fecha: string
  pesoKg: number
  notas: string | null
}

export type WeightEntryInput = Omit<WeightEntry, 'id'>

export interface Measurement {
  id: number
  fecha: string
  pectoral: number | null
  axila: number | null
  triceps: number | null
  subescapular: number | null
  abdomen: number | null
  suprailiaco: number | null
  cuadriceps: number | null
  porcentajeGraso: number | null
  brazo: number | null
  cintura: number | null
  cadera: number | null
  muslo: number | null
  pecho: number | null
  cuello: number | null
  notas: string | null
}

export type MeasurementInput = Omit<Measurement, 'id'>

export type DiaTipo = 'ON' | 'OFF'

export interface ImportRowIssue {
  fila: number
  fecha: string | null
  motivo: string
}

export interface ImportPreview {
  totalFilas: number
  macroPlans: MacroPlanInput[]
  weightEntries: WeightEntryInput[]
  filasARevisar: ImportRowIssue[]
}

export interface ImportResult {
  macroPlansCreados: number
  weightEntriesCreados: number
  mesocicloCreado: Mesociclo
}

export interface BackupResult {
  path: string
}
