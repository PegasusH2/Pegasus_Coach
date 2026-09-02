// Medidas genéricas y plicómetro del cliente en Pegasus Tracker (measurement_types/
// measurements/skinfold_sites/skinfold_entries) — sistema APARTE de `nutrition_measurement`
// (measurementRepo.ts, propio de Coach). Sin código previo en Coach; nuevo con el
// control total del entrenador. Ver 03_SUPABASE_CONTEXT.md §3.3/§6 sobre la
// duplicación de modelos de medidas corporales — no se unifican en esta pasada.
import { supabase } from './client'
import { cleanNonNegativeNumber, requireNonEmptyString, requireValidDate } from './trackerValidate'
import type {
  TrackerGenericMeasurement,
  TrackerGenericMeasurementInput,
  TrackerMeasurementType,
  TrackerMeasurementTypeInput,
  TrackerSkinfoldEntry,
  TrackerSkinfoldEntryInput,
  TrackerSkinfoldSite,
  TrackerSkinfoldSiteInput,
} from '@/types'

function fail(action: string, table: string, error: { message: string }): never {
  throw new Error(`${action} en ${table}: ${error.message}`)
}

const nowIso = () => new Date().toISOString()

// ---------------------------------------------------------------------
// Tipos de medida definidos por el cliente (measurement_types) + sus valores
// ---------------------------------------------------------------------

export async function listMeasurementTypes(userId: string): Promise<TrackerMeasurementType[]> {
  const { data, error } = await supabase
    .from('measurement_types')
    .select('id, user_id, name, unit, enabled')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  if (error) fail('Error al listar', 'measurement_types', error)
  return (data ?? []).map((r) => ({ id: r.id, userId: r.user_id, name: r.name, unit: r.unit ?? 'cm', enabled: r.enabled }))
}

export async function createMeasurementType(userId: string, input: TrackerMeasurementTypeInput): Promise<TrackerMeasurementType> {
  const name = requireNonEmptyString(input.name, 'El nombre de la medida')
  const { data, error } = await supabase
    .from('measurement_types')
    .insert({ id: crypto.randomUUID(), user_id: userId, name, unit: input.unit || 'cm', enabled: true })
    .select('id, user_id, name, unit, enabled')
    .single()
  if (error) fail('Error al crear', 'measurement_types', error)
  const r = data as { id: string; user_id: string; name: string; unit: string; enabled: boolean }
  return { id: r.id, userId: r.user_id, name: r.name, unit: r.unit, enabled: r.enabled }
}

export async function deleteMeasurementType(id: string): Promise<void> {
  const { data: values, error: readError } = await supabase.from('measurements').select('id').eq('type_id', id).is('deleted_at', null)
  if (readError) fail('Error al leer', 'measurements', readError)
  const ids = (values ?? []).map((v) => v.id)
  if (ids.length > 0) {
    const { error } = await supabase.from('measurements').update({ deleted_at: nowIso() }).in('id', ids)
    if (error) fail('Error al borrar', 'measurements', error)
  }
  const { error } = await supabase.from('measurement_types').update({ deleted_at: nowIso() }).eq('id', id)
  if (error) fail('Error al borrar', 'measurement_types', error)
}

export async function listMeasurementValues(typeId: string): Promise<TrackerGenericMeasurement[]> {
  const { data, error } = await supabase
    .from('measurements')
    .select('id, type_id, date, value, notes')
    .eq('type_id', typeId)
    .is('deleted_at', null)
    .order('date', { ascending: true })
  if (error) fail('Error al listar', 'measurements', error)
  return (data ?? []).map((r) => ({ id: r.id, typeId: r.type_id, fecha: r.date, value: r.value, notas: r.notes ?? '' }))
}

export async function addMeasurementValue(input: TrackerGenericMeasurementInput): Promise<TrackerGenericMeasurement> {
  const fecha = requireValidDate(input.fecha, 'La fecha de la medida')
  const { data, error } = await supabase
    .from('measurements')
    .insert({ id: crypto.randomUUID(), type_id: input.typeId, date: fecha, value: cleanNonNegativeNumber(input.value), notes: input.notas ?? '' })
    .select('id, type_id, date, value, notes')
    .single()
  if (error) fail('Error al crear', 'measurements', error)
  const r = data as { id: string; type_id: string; date: string; value: number | null; notes: string | null }
  return { id: r.id, typeId: r.type_id, fecha: r.date, value: r.value, notas: r.notes ?? '' }
}

export async function updateMeasurementValue(id: string, patch: { value?: number | null; notas?: string }): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.value !== undefined) row.value = cleanNonNegativeNumber(patch.value)
  if (patch.notas !== undefined) row.notes = patch.notas
  const { error } = await supabase.from('measurements').update(row).eq('id', id)
  if (error) fail('Error al actualizar', 'measurements', error)
}

export async function deleteMeasurementValue(id: string): Promise<void> {
  const { error } = await supabase.from('measurements').update({ deleted_at: nowIso() }).eq('id', id)
  if (error) fail('Error al borrar', 'measurements', error)
}

// ---------------------------------------------------------------------
// Plicómetro (skinfold_sites + skinfold_entries)
// ---------------------------------------------------------------------

export async function listSkinfoldSites(userId: string): Promise<TrackerSkinfoldSite[]> {
  const { data, error } = await supabase
    .from('skinfold_sites')
    .select('id, user_id, name')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  if (error) fail('Error al listar', 'skinfold_sites', error)
  return (data ?? []).map((r) => ({ id: r.id, userId: r.user_id, name: r.name }))
}

export async function createSkinfoldSite(userId: string, input: TrackerSkinfoldSiteInput): Promise<TrackerSkinfoldSite> {
  const name = requireNonEmptyString(input.name, 'El nombre del punto de pliegue')
  const { data, error } = await supabase
    .from('skinfold_sites')
    .insert({ id: crypto.randomUUID(), user_id: userId, name })
    .select('id, user_id, name')
    .single()
  if (error) fail('Error al crear', 'skinfold_sites', error)
  const r = data as { id: string; user_id: string; name: string }
  return { id: r.id, userId: r.user_id, name: r.name }
}

export async function deleteSkinfoldSite(id: string): Promise<void> {
  const { data: entries, error: readError } = await supabase.from('skinfold_entries').select('id').eq('site_id', id).is('deleted_at', null)
  if (readError) fail('Error al leer', 'skinfold_entries', readError)
  const ids = (entries ?? []).map((e) => e.id)
  if (ids.length > 0) {
    const { error } = await supabase.from('skinfold_entries').update({ deleted_at: nowIso() }).in('id', ids)
    if (error) fail('Error al borrar', 'skinfold_entries', error)
  }
  const { error } = await supabase.from('skinfold_sites').update({ deleted_at: nowIso() }).eq('id', id)
  if (error) fail('Error al borrar', 'skinfold_sites', error)
}

export async function listSkinfoldEntries(siteId: string): Promise<TrackerSkinfoldEntry[]> {
  const { data, error } = await supabase
    .from('skinfold_entries')
    .select('id, site_id, date, value_mm')
    .eq('site_id', siteId)
    .is('deleted_at', null)
    .order('date', { ascending: true })
  if (error) fail('Error al listar', 'skinfold_entries', error)
  return (data ?? []).map((r) => ({ id: r.id, siteId: r.site_id, fecha: r.date, valueMm: r.value_mm }))
}

export async function addSkinfoldEntry(input: TrackerSkinfoldEntryInput): Promise<TrackerSkinfoldEntry> {
  const fecha = requireValidDate(input.fecha, 'La fecha de la medición')
  const { data, error } = await supabase
    .from('skinfold_entries')
    .insert({ id: crypto.randomUUID(), site_id: input.siteId, date: fecha, value_mm: input.valueMm })
    .select('id, site_id, date, value_mm')
    .single()
  if (error) fail('Error al crear', 'skinfold_entries', error)
  const r = data as { id: string; site_id: string; date: string; value_mm: number }
  return { id: r.id, siteId: r.site_id, fecha: r.date, valueMm: r.value_mm }
}

export async function deleteSkinfoldEntry(id: string): Promise<void> {
  const { error } = await supabase.from('skinfold_entries').update({ deleted_at: nowIso() }).eq('id', id)
  if (error) fail('Error al borrar', 'skinfold_entries', error)
}
