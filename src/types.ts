// Tipos de dominio de Pegasus Nutrition. fecha* siempre en formato ISO 'YYYY-MM-DD'.
// id* son uuid de Postgres (Supabase) — siempre string.

export type Rol = 'personal' | 'entrenador'
export type TipoDieta = 'macros' | 'cerrada'

export interface Profile {
  id: string
  role: Rol
  nombre: string
  email: string | null
  pesoInicial: number | null
  fechaInicio: string | null
  neatObjetivoPasos: number | null
  tipoDieta: TipoDieta
  dietaCerradaDistingueDias: boolean
}

export type ProfileInput = Omit<Profile, 'id'>

export interface Mesociclo {
  id: string
  userId: string
  numero: number
  nombre: string | null
  fechaInicio: string | null
}

export type MesocicloInput = Omit<Mesociclo, 'id'>

export interface Semana {
  id: string
  mesocicloId: string
  numero: number
  fechaInicio: string | null
}

export type SemanaInput = Omit<Semana, 'id'>

export interface MacroPlan {
  id: string
  userId: string
  fecha: string
  semanaId: string | null
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
  id: string
  userId: string
  fecha: string
  pesoKg: number
  notas: string | null
}

export type WeightEntryInput = Omit<WeightEntry, 'id'>

export interface Measurement {
  id: string
  userId: string
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
  macroPlans: Omit<MacroPlanInput, 'userId'>[]
  weightEntries: Omit<WeightEntryInput, 'userId'>[]
  filasARevisar: ImportRowIssue[]
}

export interface ImportResult {
  macroPlansCreados: number
  weightEntriesCreados: number
  mesocicloCreado: Mesociclo
}

// ---------- Dieta cerrada (alternativa a Macros flexibles, sin cuantificar macros) ----------

export type DiaTipoItem = 'on' | 'off' | 'unico'

export interface ClosedDietPlan {
  id: string
  userId: string
  fecha: string
  semanaId: string | null
  notas: string | null
}

export type ClosedDietPlanInput = Omit<ClosedDietPlan, 'id'>

export interface ClosedDietItem {
  id: string
  planId: string
  diaTipo: DiaTipoItem
  momento: string | null
  alimento: string
  gramos: number
  orden: number
}

export type ClosedDietItemInput = Omit<ClosedDietItem, 'id'>

// ---------- Revisiones y pagos (centro de control del entrenador) ----------

export type EstadoRevision = 'pendiente' | 'recibida' | 'revisada'

export interface Review {
  id: string
  trainerId: string
  clientId: string
  fechaProgramada: string
  estado: EstadoRevision
  fechaRecepcion: string | null
  notas: string | null
  createdAt: string
  // Rellenado a mano al leer, igual que TrainerClientLink.otroNombre.
  clienteNombre?: string | null
}

export type ReviewInput = Omit<Review, 'id' | 'createdAt' | 'clienteNombre'>

export type PaymentStatus = 'paid' | 'pending'
export type PaymentSource = 'manual' | 'external'

export interface Payment {
  id: string
  linkId: string
  trainerId: string
  clientId: string
  status: PaymentStatus
  source: PaymentSource
  amount: number | null
  paymentDate: string | null
  nextPaymentDate: string | null
  externalProvider: string | null
  externalPaymentId: string | null
  notes: string | null
  createdAt: string
}

export type PaymentInput = Omit<Payment, 'id' | 'createdAt'>

// ---------- Lectura de solo lectura del entrenamiento real en Pegasus Tracker ----------
// Estas tablas pertenecen a Tracker (mismo proyecto Supabase) — aquí solo se leen,
// nunca se escriben. Solo se listan los campos que se muestran en la ficha del cliente.

export interface TrackerWorkout {
  id: string
  userId: string
  name: string | null
  date: string
  completed: boolean
}

export interface TrackerSet {
  id: string
  workoutExerciseId: string
  setNumber: number
  weight: number | null
  reps: number | null
  rir: number | null
  done: boolean
}

export interface TrackerWorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  exerciseNombre: string | null
  sets: TrackerSet[]
}

// ---------- Entrenador / cliente ----------

export type LinkStatus = 'pending' | 'accepted' | 'revoked'

export interface TrainerClientLink {
  id: string
  trainerId: string
  clientId: string
  status: LinkStatus
  createdAt: string
  respondedAt: string | null
  // Datos del otro lado del vínculo, para pintar la UI sin una query aparte
  // (se rellenan a mano al leer, ver src/lib/supabase/trainerRepo.ts).
  otroNombre?: string | null
  otroEmail?: string | null
}
