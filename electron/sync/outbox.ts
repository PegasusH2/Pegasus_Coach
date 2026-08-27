// Cola local (outbox) de cambios pendientes de subir a Supabase — mismo
// patrón que syncQueue/enqueueChange en js/db/repository.js de Pegasus
// Tracker, adaptado a las llamadas síncronas de sql.js. No-op total si no
// hay sesión activa (isSyncActive() === false): coste cero en modo local.
import crypto from 'node:crypto'
import { get, run } from '../db'

let syncActive = false

export function setSyncActive(active: boolean): void {
  syncActive = active
}

export function isSyncActive(): boolean {
  return syncActive
}

export type SyncOperation = 'create' | 'update' | 'delete'

interface QueueRow {
  id: string
  operation: SyncOperation
}

// Compacta cambios repetidos sobre la misma fila: varias ediciones offline
// se colapsan en una sola entrada con el payload más reciente; un delete
// sobre algo creado y nunca subido desaparece de la cola sin más.
export function enqueueChange(entity: string, entityId: string, operation: SyncOperation, payload: unknown | null): void {
  if (!syncActive) return
  const existing = get<QueueRow>(
    `SELECT id, operation FROM sync_queue WHERE entity = ? AND entityId = ? AND status IN ('pending', 'failed') LIMIT 1`,
    [entity, entityId],
  )
  const payloadJson = payload === null ? null : JSON.stringify(payload)

  if (existing) {
    if (operation === 'delete' && existing.operation === 'create') {
      run('DELETE FROM sync_queue WHERE id = ?', [existing.id])
      return
    }
    run(
      `UPDATE sync_queue SET operation = ?, payload = ?, status = 'pending', attempts = 0, lastError = NULL WHERE id = ?`,
      [existing.operation === 'create' ? 'create' : operation, payloadJson, existing.id],
    )
    return
  }

  run(
    `INSERT INTO sync_queue (id, entity, entityId, operation, payload, status, attempts, createdAt) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`,
    [crypto.randomUUID(), entity, entityId, operation, payloadJson, new Date().toISOString()],
  )
}

export function enqueueCreate(entity: string, entityId: string, row: unknown): void {
  enqueueChange(entity, entityId, 'create', row)
}

export function enqueueUpdate(entity: string, entityId: string, row: unknown): void {
  enqueueChange(entity, entityId, 'update', row)
}

export function enqueueDelete(entity: string, entityId: string): void {
  enqueueChange(entity, entityId, 'delete', null)
}
