// Centro de configuración del entrenador — trainer_settings (singleton 1:1,
// mismo patrón que profiles) + trainer_service_prices (catálogo de precios).
// Ver supabase/migrations/0015_centro_configuracion_entrenador.sql.
import { supabase } from './client'
import type { ServicePrice, ServicePriceInput, TrainerSettings, TrainerSettingsInput } from '@/types'

const DEFAULTS: Omit<TrainerSettings, 'id' | 'updatedAt'> = {
  reviewIntervalDays: 30,
  reviewDefaultWeekday: null,
  reviewReminderDaysBefore: 2,
  inactivityDays: 7,
  attentionDays: 14,
  prolongedInactivityDays: 30,
  currency: 'EUR',
  paymentGraceDays: null,
  showPaymentStatus: true,
  weightUnit: 'kg',
  distanceUnit: 'km',
  useRir: true,
  useRpe: false,
  defaultRestSeconds: 90,
  nutritionEnabled: true,
  defaultTipoDieta: 'macros',
  trackWeight: true,
  trackHeight: true,
  trackWaist: true,
  trackHip: true,
  trackChest: true,
  trackArm: true,
  trackLeg: true,
  progressWeight: true,
  progressPhotos: true,
  progressMeasurements: true,
  progressPerformance: true,
  progressAdherence: true,
  progressTrainerNotes: true,
  startScreen: 'inicio',
  dateFormat: 'dd/mm/yyyy',
  exportFormat: 'json',
}

/** Si el entrenador no ha guardado nada todavía no existe fila — se devuelven los
 * valores por defecto (los mismos que la columna en Postgres) en vez de null, para
 * que el resto de la app nunca tenga que comprobar "¿hay settings o no?". */
export async function getTrainerSettings(trainerId: string): Promise<TrainerSettings> {
  const { data, error } = await supabase.from('trainer_settings').select('*').eq('id', trainerId).maybeSingle()
  if (error) throw new Error(`Error al leer la configuración: ${error.message}`)
  if (!data) return { id: trainerId, updatedAt: new Date(0).toISOString(), ...DEFAULTS }
  return data as TrainerSettings
}

/** Upsert parcial: cada tarjeta de categoría solo manda sus propias columnas, no
 * pisa el resto (a diferencia de un update de toda la fila, un insert nuevo usa el
 * DEFAULT de Postgres para lo que no se manda). */
export async function updateTrainerSettings(trainerId: string, patch: TrainerSettingsInput): Promise<void> {
  const { error } = await supabase
    .from('trainer_settings')
    .upsert({ id: trainerId, ...patch, updatedAt: new Date().toISOString() })
  if (error) throw new Error(`Error al guardar la configuración: ${error.message}`)
}

export async function listServicePrices(trainerId: string): Promise<ServicePrice[]> {
  const { data, error } = await supabase
    .from('trainer_service_prices')
    .select('*')
    .eq('trainerId', trainerId)
    .order('sortOrder', { ascending: true })
  if (error) throw new Error(`Error al listar precios: ${error.message}`)
  return (data ?? []) as ServicePrice[]
}

export async function createServicePrice(input: ServicePriceInput): Promise<ServicePrice> {
  const { data, error } = await supabase.from('trainer_service_prices').insert(input).select('*').single()
  if (error) throw new Error(`Error al crear el servicio: ${error.message}`)
  return data as ServicePrice
}

export async function updateServicePrice(id: string, patch: Partial<ServicePriceInput>): Promise<void> {
  const { error } = await supabase
    .from('trainer_service_prices')
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Error al actualizar el servicio: ${error.message}`)
}

export async function deleteServicePrice(id: string): Promise<void> {
  const { error } = await supabase.from('trainer_service_prices').delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar el servicio: ${error.message}`)
}
