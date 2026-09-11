// Tipos de dominio de Pegasus Coach. fecha* siempre en formato ISO 'YYYY-MM-DD'.
// id* son uuid de Postgres (Supabase) — siempre string.

export type Rol = 'personal' | 'entrenador'
export type TipoDieta = 'macros' | 'cerrada'
export type Sexo = 'mujer' | 'hombre' | 'otro' | 'prefiero_no_decir'

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
  fechaNacimiento: string | null
  altura: number | null
  sexo: Sexo | null
  // ---- Perfil público del entrenador (ver 0015_centro_configuracion_entrenador.sql) ----
  apellidos: string | null
  nombreProfesional: string | null
  telefono: string | null
  ciudad: string | null
  pais: string | null
  especialidad: string | null
  biografia: string | null
  /** Qué ve el cliente de este perfil — sin consumidor todavía (no existe hoy
   * ninguna pantalla donde un cliente vea el perfil de su entrenador). */
  perfilVisibleNombreProfesional: boolean
  perfilVisibleEspecialidad: boolean
  perfilVisibleBiografia: boolean
  perfilVisibleTelefono: boolean
  perfilVisibleEmail: boolean
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
  /** Opcional — si no se indica, la UI muestra "Dieta cerrada vN" calculado por orden de fecha. */
  nombre: string | null
  /** Nunca se borra una dieta físicamente — "Archivar" y "Eliminar" (desde el entrenador)
   * ponen esto a true; el histórico se conserva siempre. Ver closedDietRepo.ts. */
  archivada: boolean
  /** Nota corta opcional de por qué se creó esta versión ("Reducción de cantidades tras revisión semanal"). */
  motivoCambio: string | null
}

export type ClosedDietPlanInput = Omit<ClosedDietPlan, 'id'>

export interface ClosedDietItem {
  id: string
  planId: string
  diaTipo: DiaTipoItem
  momento: string | null
  alimento: string
  gramos: number
  /** "g" por defecto; también "unidad", "ml", etc. — texto libre introducido por el entrenador. */
  unidad: string
  orden: number
}

export type ClosedDietItemInput = Omit<ClosedDietItem, 'id'>

// ---------- Gestor de dietas — plantillas reutilizables del entrenador (nutrition_closed_diet_template) ----------

export interface DietTemplate {
  id: string
  trainerId: string
  nombre: string
  categoria: string | null
  descripcion: string | null
  createdAt: string
}

export type DietTemplateInput = Omit<DietTemplate, 'id' | 'createdAt'>

export interface DietTemplateItem {
  id: string
  templateId: string
  diaTipo: DiaTipoItem
  momento: string | null
  alimento: string
  cantidad: number
  unidad: string
  orden: number
}

export type DietTemplateItemInput = Omit<DietTemplateItem, 'id'>

// ---------- Revisiones y pagos (centro de control del entrenador) ----------

export type EstadoRevision = 'pendiente' | 'recibida' | 'revisada'
/** Ver supabase/migrations/0013_calendario_tipo_revision.sql — mismo modelo (Review),
 * solo distingue si el evento agendado es una revisión de seguimiento o un entreno
 * presencial. El Calendario (Calendario.tsx) pinta ambos tipos sobre esta misma tabla. */
export type TipoRevision = 'revision' | 'entreno'

export interface Review {
  id: string
  trainerId: string
  clientId: string
  tipo: TipoRevision
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
  /** Día (template) del que proviene este entrenamiento — null si se registró suelto, sin rutina. */
  templateId: string | null
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
  /** Objetivo planificado (workout_exercises.target_*) — null si no se fijó ninguno para esta sesión. */
  targetRepsMin: number | null
  targetRepsMax: number | null
  targetRir: number | null
  sets: TrackerSet[]
}

/** Una serie histórica de un ejercicio concreto (de cualquier entrenamiento), para comparar
 * sesiones y calcular PRs — ver src/lib/entrenamientoCalc.ts. */
export interface TrackerExerciseHistorySet {
  workoutId: string
  date: string
  weight: number | null
  reps: number | null
}

// ---------- Escritura del entrenador sobre PLANIFICACIÓN (ejercicios/rutinas,
// ver supabase/migrations/0007_control_total_entrenador.sql) ----------
// La ejecución (workouts/workout_exercises/sets) ya no se escribe desde Coach
// — ver supabase/migrations/0009_revertir_ejecucion_entrenador.sql — por eso
// no hay tipos *Input para esas tablas aquí, solo lectura (arriba).

export interface TrackerExercise {
  id: string
  userId: string
  name: string
  notes: string
  archived: boolean
  /** Ejercicio creado desde el catálogo global (ver ExerciseCatalogItem) — null si es manual. */
  catalogId: string | null
}

export type TrackerExerciseInput = Omit<TrackerExercise, 'id'>

// ---------- Catálogo global de ejercicios (solo lectura, solo texto — sin
// imágenes ni vídeos, ver supabase/migrations/0014_catalogo_ejercicios.sql y
// supabase/scripts/import-exercise-catalog.mjs) ----------

export interface ExerciseCatalogItem {
  id: string
  name: string
  category: string
  equipment: string
  instructions: string
}

export interface TrackerTemplate {
  id: string
  userId: string
  name: string
  description: string
  /** uuid del entrenador que la creó — null si es una rutina propia del cliente. */
  assignedBy: string | null
  /** Rutina (TrackerRoutine) a la que pertenece este día — null = todavía sin agrupar. */
  routineId: string | null
}

export type TrackerTemplateInput = Omit<TrackerTemplate, 'id'>

// ---------- Rutinas (agrupan varios `templates` = "días") ----------
// Ver Pegasus_Coach/supabase/migrations/0011_rutinas_planificacion.sql — tabla
// nueva `template_routines`, aditiva sobre el esquema de Tracker.

export interface TrackerRoutine {
  id: string
  userId: string
  name: string
  sortOrder: number
  /** null = activa; con fecha = archivada (dejó de aparecer entre las activas). */
  archivedAt: string | null
}

export type TrackerRoutineInput = Omit<TrackerRoutine, 'id' | 'archivedAt'>

export interface TrackerTemplateExercise {
  id: string
  templateId: string
  exerciseId: string
  exerciseNombre?: string | null
  sortOrder: number
  targetSets: number
  targetRepsMin: number | null
  targetRepsMax: number | null
}

export type TrackerTemplateExerciseInput = Omit<TrackerTemplateExercise, 'id' | 'exerciseNombre'>

// ---------- Medidas genéricas de Tracker (measurement_types/skinfold_*) ----------
// Sistema aparte de `Measurement`/nutrition_measurement (arriba) — el propio del
// cliente en Tracker, con tipos de medida definidos por el usuario. Sin código previo
// en Coach; nuevo por completo con el control total del entrenador.

export interface TrackerMeasurementType {
  id: string
  userId: string
  name: string
  unit: string
  enabled: boolean
}

export type TrackerMeasurementTypeInput = Omit<TrackerMeasurementType, 'id'>

export interface TrackerGenericMeasurement {
  id: string
  typeId: string
  fecha: string
  value: number | null
  notas: string
}

export type TrackerGenericMeasurementInput = Omit<TrackerGenericMeasurement, 'id'>

export interface TrackerSkinfoldSite {
  id: string
  userId: string
  name: string
}

export type TrackerSkinfoldSiteInput = Omit<TrackerSkinfoldSite, 'id'>

export interface TrackerSkinfoldEntry {
  id: string
  siteId: string
  fecha: string
  valueMm: number
}

export type TrackerSkinfoldEntryInput = Omit<TrackerSkinfoldEntry, 'id'>

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
  /** Override por cliente sobre trainer_settings.reviewIntervalDays/precio estándar —
   * null = usa el valor global del entrenador. Ver 0015_centro_configuracion_entrenador.sql. */
  reviewIntervalDaysOverride: number | null
  standardPriceOverride: number | null
}

// ---------- Centro de configuración del entrenador (ver
// supabase/migrations/0015_centro_configuracion_entrenador.sql) ----------
// Singleton 1:1 con el entrenador (como profiles) — nunca se lee/escribe para
// un cliente. Alcance real vs "guardado para más adelante" documentado en el
// plan de esta tarea; aquí solo el tipo, sin repetir esa discusión.

export type WeightUnit = 'kg' | 'lb'
export type DistanceUnit = 'km' | 'mi'
export type StartScreen = 'inicio' | 'clientes' | 'calendario'
export type ExportFormat = 'json' | 'csv'

export interface TrainerSettings {
  id: string
  reviewIntervalDays: number
  reviewDefaultWeekday: number | null
  reviewReminderDaysBefore: number
  inactivityDays: number
  attentionDays: number
  prolongedInactivityDays: number
  currency: string
  paymentGraceDays: number | null
  showPaymentStatus: boolean
  weightUnit: WeightUnit
  distanceUnit: DistanceUnit
  useRir: boolean
  useRpe: boolean
  defaultRestSeconds: number | null
  nutritionEnabled: boolean
  defaultTipoDieta: TipoDieta
  trackWeight: boolean
  trackHeight: boolean
  trackWaist: boolean
  trackHip: boolean
  trackChest: boolean
  trackArm: boolean
  trackLeg: boolean
  progressWeight: boolean
  progressPhotos: boolean
  progressMeasurements: boolean
  progressPerformance: boolean
  progressAdherence: boolean
  progressTrainerNotes: boolean
  startScreen: StartScreen
  dateFormat: string
  exportFormat: ExportFormat
  /** Checkbox "Aplicar recomendaciones de macros según sexo" en la configuración de
   * macros — puramente informativo (muestra/oculta una leyenda de ayuda), no cambia
   * ningún cálculo. */
  mostrarRecomendacionesMacrosPorSexo: boolean
  updatedAt: string
}

export type TrainerSettingsInput = Partial<Omit<TrainerSettings, 'id' | 'updatedAt'>>

export type ServiceTipo = 'mensual' | 'alta' | 'revision_individual' | 'sesion_individual' | 'plan_nutricional' | 'otro'

export interface ServicePrice {
  id: string
  trainerId: string
  tipo: ServiceTipo
  nombre: string | null
  precio: number | null
  periodicidad: 'mensual' | 'trimestral' | 'anual' | null
  activo: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type ServicePriceInput = Omit<ServicePrice, 'id' | 'createdAt' | 'updatedAt'>
