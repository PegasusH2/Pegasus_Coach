// Motor de sincronización de la Cuenta Pegasus — capa ENCIMA de SQLite,
// nunca un sustituto (ver electron/db/). Alcance v1: solo weight_entry
// (local) <-> body_weight (Supabase, la misma tabla que ya usa Pegasus
// Tracker). Mismo patrón que js/core/sync.js de Tracker: outbox local,
// subida por lotes, descarga incremental por watermark, conflicto resuelto
// por el updated_at asignado por el servidor.
import { all, get, kvGet, kvSet, run } from '../db'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { getSession } from './auth'
import { getDeviceId } from './deviceId'
import { enqueueCreate, enqueueUpdate, isSyncActive, setSyncActive } from './outbox'
import {
  getWeightEntryByRemoteId,
  linkWeightEntryRemoteId,
  listUnlinkedWeightEntries,
  upsertWeightEntryFromRemote,
} from '../db/repositories/weightEntryRepo'
import crypto from 'node:crypto'
import type { MigrationConflict, MigrationPreview, ConflictResolution, SyncStatus } from '@shared/types'

export { isSyncActive }
export type { ConflictResolution }

const MAX_ATTEMPTS = 6
const WATERMARK_KEY = 'lastSyncedAt'

let status: SyncStatus = { state: 'idle', lastSyncedAt: null, pendingCount: 0, lastError: null }
let onStatusChange: ((s: SyncStatus) => void) | null = null

export function onSyncStatusChange(cb: (s: SyncStatus) => void): void {
  onStatusChange = cb
}

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch }
  onStatusChange?.(status)
}

export function getSyncStatus(): SyncStatus {
  return status
}

interface QueueRow {
  id: string
  entity: string
  entityId: string
  operation: 'create' | 'update' | 'delete'
  payload: string | null
  status: string
  attempts: number
  lastAttemptAt: string | null
}

function refreshPendingCount(): number {
  const row = get<{ n: number }>(`SELECT COUNT(*) as n FROM sync_queue WHERE status IN ('pending', 'failed')`)
  const pendingCount = row?.n ?? 0
  setStatus({ pendingCount })
  return pendingCount
}

function backoffDelayMs(attempts: number): number {
  return Math.min(2 ** attempts * 5000, 5 * 60 * 1000)
}

function isEligibleNow(row: QueueRow, now: number): boolean {
  if (!row.lastAttemptAt) return true
  return now - new Date(row.lastAttemptAt).getTime() >= backoffDelayMs(row.attempts)
}

interface RemoteBodyWeight {
  id: string
  date: string
  weight_kg: number
  notes: string | null
  updated_at: string
}

function toRemoteRow(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    id: payload.remoteId,
    device_id: getDeviceId(),
    date: payload.fecha,
    weight_kg: payload.pesoKg,
    notes: payload.notas ?? null,
  }
}

async function uploadPending(): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const rows = all<QueueRow>(`SELECT * FROM sync_queue WHERE status IN ('pending', 'failed')`)
  const now = Date.now()
  const eligible = rows.filter((r) => isEligibleNow(r, now))

  const upserts = eligible.filter((r) => r.operation !== 'delete' && r.payload)
  if (upserts.length) {
    const payload = upserts.map((r) => toRemoteRow(JSON.parse(r.payload as string)))
    const { error } = await supabase.from('body_weight').upsert(payload)
    markUploadResult(upserts, error)
  }

  const deletes = eligible.filter((r) => r.operation === 'delete')
  if (deletes.length) {
    const ids = deletes.map((r) => r.entityId)
    const { error } = await supabase.from('body_weight').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    markUploadResult(deletes, error)
  }
}

function markUploadResult(rows: QueueRow[], error: unknown): void {
  if (!error) {
    for (const row of rows) run('DELETE FROM sync_queue WHERE id = ?', [row.id])
    return
  }
  const nowIso = new Date().toISOString()
  const message = String((error as { message?: string })?.message ?? error)
  for (const row of rows) {
    const attempts = row.attempts + 1
    run('UPDATE sync_queue SET attempts = ?, lastAttemptAt = ?, lastError = ?, status = ? WHERE id = ?', [
      attempts,
      nowIso,
      message,
      attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      row.id,
    ])
  }
}

// Si esta fila tiene un cambio local pendiente sin subir (más reciente que
// lo que llega del remoto), gana el local — igual que shouldSkipForLocalConflict
// en js/core/sync.js. En el caso normal (sin fallos) esto no se activa nunca:
// la subida de este ciclo ya ocurrió ANTES que esta descarga.
function shouldSkipForLocalConflict(remoteId: string, remoteUpdatedAt: string): boolean {
  const pending = get<{ payload: string | null }>(
    `SELECT payload FROM sync_queue WHERE entity = 'weight_entry' AND entityId = ? AND status IN ('pending', 'failed') LIMIT 1`,
    [remoteId],
  )
  if (!pending?.payload) return false
  const localUpdatedAt = (JSON.parse(pending.payload) as { updatedAt?: string }).updatedAt
  return !!localUpdatedAt && localUpdatedAt > remoteUpdatedAt
}

async function downloadRemote(watermark: string | null): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return
  let query = supabase.from('body_weight').select('*').order('updated_at', { ascending: true })
  if (watermark) query = query.gt('updated_at', watermark)
  const { data, error } = await query
  if (error) throw error
  for (const row of (data ?? []) as (RemoteBodyWeight & { deleted_at: string | null })[]) {
    if (shouldSkipForLocalConflict(row.id, row.deleted_at ?? row.updated_at)) continue
    if (row.deleted_at) {
      const local = getWeightEntryByRemoteId(row.id)
      if (local) run('DELETE FROM weight_entry WHERE id = ?', [local.id])
      continue
    }
    upsertWeightEntryFromRemote({
      remoteId: row.id,
      fecha: row.date,
      pesoKg: row.weight_kg,
      notas: row.notes,
      updatedAt: row.updated_at,
    })
  }
}

let syncing = false

export async function syncNow(): Promise<void> {
  if (!isSupabaseConfigured()) return
  const session = await getSession()
  if (!session) return
  if (syncing) return
  syncing = true
  setStatus({ state: 'syncing', lastError: null })
  try {
    await uploadPending()
    const pullStartedAt = new Date().toISOString()
    await downloadRemote(kvGet(WATERMARK_KEY))
    kvSet(WATERMARK_KEY, pullStartedAt)
    const pendingCount = refreshPendingCount()
    setStatus({ state: 'idle', lastSyncedAt: pullStartedAt, pendingCount, lastError: null })
  } catch (err) {
    setStatus({ state: 'error', lastError: String((err as { message?: string })?.message ?? err) })
  } finally {
    syncing = false
  }
}

// ---------- Vinculación de cuenta / migración de datos históricos ----------

// Compara las filas locales sin remoteId contra lo que ya haya en Supabase
// para ese usuario, SIN escribir nada todavía — la UI decide qué hacer con
// cada conflicto antes de aplicar nada (ver K de la propuesta de integración).
export async function previewMigration(): Promise<MigrationPreview> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error('SYNC_NOT_CONFIGURED')
  const unlinked = listUnlinkedWeightEntries()
  const { data, error } = await supabase.from('body_weight').select('*').is('deleted_at', null)
  if (error) throw error
  const remoteByDate = new Map<string, RemoteBodyWeight>()
  for (const row of (data ?? []) as RemoteBodyWeight[]) remoteByDate.set(row.date, row)

  const conflicts: MigrationConflict[] = []
  let toUpload = 0
  for (const local of unlinked) {
    const remote = remoteByDate.get(local.fecha)
    if (!remote) {
      toUpload++
      continue
    }
    if (remote.weight_kg === local.pesoKg) continue // mismo dato, se enlaza sin preguntar
    conflicts.push({
      localId: local.id,
      fecha: local.fecha,
      pesoLocal: local.pesoKg,
      notasLocal: local.notas,
      remoteId: remote.id,
      pesoRemoto: remote.weight_kg,
      updatedAt: remote.updated_at,
    })
  }
  return { toUpload, conflicts }
}

// Aplica la migración: sube lo que no tiene equivalente remoto, enlaza lo
// idéntico, y resuelve cada conflicto según lo que decidió el usuario en la
// UI (resolutions, por localId). Nunca borra nada — "keepRemote" descarta la
// subida de esa fila local pero la fila sigue existiendo en este dispositivo.
export async function applyMigration(resolutions: Record<number, ConflictResolution>): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error('SYNC_NOT_CONFIGURED')
  const unlinked = listUnlinkedWeightEntries()
  const { data, error } = await supabase.from('body_weight').select('*').is('deleted_at', null)
  if (error) throw error
  const remoteByDate = new Map<string, RemoteBodyWeight>()
  for (const row of (data ?? []) as RemoteBodyWeight[]) remoteByDate.set(row.date, row)

  for (const local of unlinked) {
    const remote = remoteByDate.get(local.fecha)
    if (!remote) {
      const remoteId = crypto.randomUUID()
      linkWeightEntryRemoteId(local.id, remoteId)
      run('UPDATE weight_entry SET createdAt = ?, updatedAt = ? WHERE id = ?', [
        new Date().toISOString(),
        new Date().toISOString(),
        local.id,
      ])
      setSyncActive(true)
      enqueueCreate('weight_entry', remoteId, { ...local, remoteId })
      continue
    }
    if (remote.weight_kg === local.pesoKg) {
      linkWeightEntryRemoteId(local.id, remote.id)
      continue
    }
    const resolution = resolutions[local.id] ?? 'both'
    if (resolution === 'keepRemote') {
      // No se sube esta fila local; se deja sin remoteId (sigue existiendo solo en este dispositivo).
      continue
    }
    if (resolution === 'keepLocal') {
      linkWeightEntryRemoteId(local.id, remote.id)
      setSyncActive(true)
      enqueueUpdate('weight_entry', remote.id, { ...local, remoteId: remote.id })
      continue
    }
    // 'both' (por defecto, el menos destructivo): la fila local se sube como
    // una medición NUEVA con su propio uuid — la remota existente no se toca.
    const remoteId = crypto.randomUUID()
    linkWeightEntryRemoteId(local.id, remoteId)
    setSyncActive(true)
    enqueueCreate('weight_entry', remoteId, { ...local, remoteId })
  }

  await syncNow()
}
