import crypto from 'node:crypto'
import { all, get, lastInsertId, run, runNoPersist, transaction } from '../index'
import { enqueueCreate, enqueueDelete, enqueueUpdate, isSyncActive } from '../../sync/outbox'
import type { WeightEntry, WeightEntryInput } from '@shared/types'

// Fila completa tal como vive en SQLite, incluyendo las columnas internas de
// sincronización — nunca se expone tal cual por IPC (ver PUBLIC_COLUMNS).
interface WeightEntryRow extends WeightEntry {
  remoteId: string | null
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
}

const PUBLIC_COLUMNS = 'id, fecha, pesoKg, notas'

export function listWeightEntries(): WeightEntry[] {
  return all<WeightEntry>(`SELECT ${PUBLIC_COLUMNS} FROM weight_entry WHERE deletedAt IS NULL ORDER BY fecha ASC`)
}

export function getLatestWeightEntry(): WeightEntry | undefined {
  return get<WeightEntry>(`SELECT ${PUBLIC_COLUMNS} FROM weight_entry WHERE deletedAt IS NULL ORDER BY fecha DESC LIMIT 1`)
}

export function createWeightEntry(data: WeightEntryInput): WeightEntry {
  const now = new Date().toISOString()
  // El remoteId se asigna YA al crear (si hay sesión activa) para poder
  // encolar la subida en el mismo momento — igual que Pegasus Tracker
  // genera el uuid antes de escribir, no lo pospone a la subida.
  const remoteId = isSyncActive() ? crypto.randomUUID() : null
  run('INSERT INTO weight_entry (fecha, pesoKg, notas, remoteId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [
    data.fecha,
    data.pesoKg,
    data.notas,
    remoteId,
    now,
    now,
  ])
  const id = lastInsertId()
  const entry = { id, ...data }
  if (remoteId) enqueueCreate('weight_entry', remoteId, { ...entry, remoteId, createdAt: now, updatedAt: now })
  return entry
}

function createWeightEntryBatch(data: WeightEntryInput): void {
  runNoPersist('INSERT INTO weight_entry (fecha, pesoKg, notas) VALUES (?, ?, ?)', [
    data.fecha,
    data.pesoKg,
    data.notas,
  ])
}

export function createWeightEntriesBatch(items: WeightEntryInput[]): void {
  transaction(() => {
    for (const item of items) {
      createWeightEntryBatch(item)
    }
  })
}

export function updateWeightEntry(id: number, data: WeightEntryInput): void {
  const now = new Date().toISOString()
  run('UPDATE weight_entry SET fecha = ?, pesoKg = ?, notas = ?, updatedAt = ? WHERE id = ?', [
    data.fecha,
    data.pesoKg,
    data.notas,
    now,
    id,
  ])
  if (!isSyncActive()) return
  const row = get<WeightEntryRow>('SELECT * FROM weight_entry WHERE id = ?', [id])
  if (!row) return
  // Fila creada antes de tener sesión (o antes de vincular la cuenta): se le
  // asigna remoteId ahora, en su primer cambio con sesión activa, en vez de
  // esperar a una migración explícita.
  const remoteId = row.remoteId ?? crypto.randomUUID()
  if (!row.remoteId) run('UPDATE weight_entry SET remoteId = ? WHERE id = ?', [remoteId, id])
  enqueueUpdate('weight_entry', remoteId, { ...row, remoteId })
}

export function deleteWeightEntry(id: number): void {
  if (isSyncActive()) {
    const row = get<WeightEntryRow>('SELECT * FROM weight_entry WHERE id = ?', [id])
    if (row?.remoteId) enqueueDelete('weight_entry', row.remoteId)
  }
  run('DELETE FROM weight_entry WHERE id = ?', [id])
}

// ---------- Usado solo por el motor de sincronización (electron/sync/) ----------

/** Filas locales sin remoteId todavía — candidatas a la migración al vincular la cuenta. */
export function listUnlinkedWeightEntries(): WeightEntryRow[] {
  return all<WeightEntryRow>('SELECT * FROM weight_entry WHERE remoteId IS NULL AND deletedAt IS NULL')
}

export function getWeightEntryByRemoteId(remoteId: string): WeightEntryRow | undefined {
  return get<WeightEntryRow>('SELECT * FROM weight_entry WHERE remoteId = ?', [remoteId])
}

export function linkWeightEntryRemoteId(id: number, remoteId: string): void {
  run('UPDATE weight_entry SET remoteId = ? WHERE id = ?', [remoteId, id])
}

/** Aplica una fila remota (creada o editada en Supabase, por esta app o por Tracker) al SQLite local. */
export function upsertWeightEntryFromRemote(row: {
  remoteId: string
  fecha: string
  pesoKg: number
  notas: string | null
  updatedAt: string
}): void {
  const existing = getWeightEntryByRemoteId(row.remoteId)
  if (existing) {
    run('UPDATE weight_entry SET fecha = ?, pesoKg = ?, notas = ?, updatedAt = ? WHERE id = ?', [
      row.fecha,
      row.pesoKg,
      row.notas,
      row.updatedAt,
      existing.id,
    ])
    return
  }
  const now = new Date().toISOString()
  run('INSERT INTO weight_entry (fecha, pesoKg, notas, remoteId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [
    row.fecha,
    row.pesoKg,
    row.notas,
    row.remoteId,
    now,
    row.updatedAt,
  ])
}

/** Tombstone recibido de Supabase (borrado en Tracker o en otro dispositivo de Nutrition) — borrado físico local. */
export function applyRemoteDelete(remoteId: string): void {
  run('DELETE FROM weight_entry WHERE remoteId = ?', [remoteId])
}
