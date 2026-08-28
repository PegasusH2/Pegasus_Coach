// Peso corporal — vive en la tabla `body_weight`, COMPARTIDA con Pegasus
// Tracker (mismo proyecto Supabase, misma cuenta). Nutrition no tiene tabla
// propia de peso: lee y escribe directo aquí, así un peso registrado en
// cualquiera de las dos apps aparece en la otra.
//
// Esquema real (creado y gestionado por Tracker, columnas snake_case — no
// tocar su forma): id uuid (lo genera el cliente), user_id (lo fuerza un
// trigger server-side a auth.uid(), nunca se manda), device_id text
// (informativo), date, weight_kg, notes, created_at/updated_at (los asigna
// Postgres), deleted_at (borrado = UPDATE a una fecha, nunca DELETE real).
import { supabase } from './client'
import { getDeviceId } from './deviceId'
import type { WeightEntry, WeightEntryInput } from '@/types'

const TABLE = 'body_weight'

/** body_weight fuerza user_id en el servidor (trigger) — nunca hace falta mandarlo. */
export type WeightEntryData = Omit<WeightEntryInput, 'userId'>

interface BodyWeightRow {
  id: string
  user_id: string
  device_id: string | null
  date: string
  weight_kg: number
  notes: string | null
  updated_at: string
}

function fromRow(row: BodyWeightRow): WeightEntry {
  return { id: row.id, userId: row.user_id, fecha: row.date, pesoKg: row.weight_kg, notas: row.notes || null }
}

function fail(action: string, error: { message: string }): never {
  throw new Error(`${action} en body_weight: ${error.message}`)
}

export async function listWeightEntries(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('date', { ascending: true })
  if (error) fail('Error al listar', error)
  return (data ?? []).map(fromRow)
}

export async function getLatestWeightEntry(userId: string): Promise<WeightEntry | undefined> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .limit(1)
  if (error) fail('Error al leer', error)
  return data?.[0] ? fromRow(data[0]) : undefined
}

export async function createWeightEntry(data: WeightEntryData): Promise<WeightEntry> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert({
      id: crypto.randomUUID(),
      device_id: getDeviceId(),
      date: data.fecha,
      weight_kg: data.pesoKg,
      notes: data.notas ?? '',
    })
    .select()
    .single()
  if (error) fail('Error al crear', error)
  return fromRow(row as BodyWeightRow)
}

export async function updateWeightEntry(id: string, data: WeightEntryData): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ date: data.fecha, weight_kg: data.pesoKg, notes: data.notas ?? '' })
    .eq('id', id)
  if (error) fail('Error al actualizar', error)
}

/** Borrado lógico — nunca un DELETE real, para no romper la sincronización con Tracker. */
export async function deleteWeightEntry(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) fail('Error al borrar', error)
}

// ---------- Vinculación de histórico (p.ej. al importar el Excel) ----------

export interface ConflictoPeso {
  fecha: string
  pesoImportado: number
  pesoExistente: number
  idExistente: string
}

export interface PreviewImportacionPeso {
  /** Filas sin equivalente en body_weight para esa fecha — se suben directas. */
  aSubir: WeightEntryData[]
  /** Misma fecha, mismo peso ya en body_weight — no hace falta hacer nada. */
  yaCoinciden: number
  /** Misma fecha, peso distinto — la UI debe preguntar qué hacer con cada una. */
  conflictos: ConflictoPeso[]
}

export type ResolucionConflictoPeso = 'usarImportado' | 'usarExistente' | 'guardarAmbos'

/** Compara pesos a importar (p.ej. del Excel) contra lo que ya hay en body_weight, SIN escribir nada todavía. */
export async function previsualizarImportacionPeso(
  userId: string,
  filas: WeightEntryData[],
): Promise<PreviewImportacionPeso> {
  const existentes = await listWeightEntries(userId)
  const existentePorFecha = new Map(existentes.map((e) => [e.fecha, e]))

  const aSubir: WeightEntryData[] = []
  const conflictos: ConflictoPeso[] = []
  let yaCoinciden = 0

  for (const fila of filas) {
    const existente = existentePorFecha.get(fila.fecha)
    if (!existente) {
      aSubir.push(fila)
    } else if (existente.pesoKg === fila.pesoKg) {
      yaCoinciden++
    } else {
      conflictos.push({
        fecha: fila.fecha,
        pesoImportado: fila.pesoKg,
        pesoExistente: existente.pesoKg,
        idExistente: existente.id,
      })
    }
  }

  return { aSubir, yaCoinciden, conflictos }
}

/** Aplica la importación: sube lo que no tiene conflicto, y resuelve cada conflicto según lo que decidió el usuario. */
export async function aplicarImportacionPeso(
  userId: string,
  preview: PreviewImportacionPeso,
  filasOriginales: WeightEntryData[],
  resoluciones: Record<string, ResolucionConflictoPeso>,
): Promise<void> {
  for (const fila of preview.aSubir) {
    await createWeightEntry(fila)
  }

  for (const conflicto of preview.conflictos) {
    const resolucion = resoluciones[conflicto.fecha] ?? 'guardarAmbos'
    if (resolucion === 'usarExistente') continue // no se toca nada
    const filaImportada = filasOriginales.find((f) => f.fecha === conflicto.fecha)
    if (!filaImportada) continue
    if (resolucion === 'usarImportado') {
      await updateWeightEntry(conflicto.idExistente, filaImportada)
    } else {
      await createWeightEntry(filaImportada) // guardarAmbos: se añade como fila nueva
    }
  }
}
