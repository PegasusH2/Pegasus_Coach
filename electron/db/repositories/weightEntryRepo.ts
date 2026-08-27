import { all, get, lastInsertId, run, runNoPersist, transaction } from '../index'
import type { WeightEntry, WeightEntryInput } from '@shared/types'

export function listWeightEntries(): WeightEntry[] {
  return all<WeightEntry>('SELECT * FROM weight_entry ORDER BY fecha ASC')
}

export function getLatestWeightEntry(): WeightEntry | undefined {
  return get<WeightEntry>('SELECT * FROM weight_entry ORDER BY fecha DESC LIMIT 1')
}

export function createWeightEntry(data: WeightEntryInput): WeightEntry {
  run('INSERT INTO weight_entry (fecha, pesoKg, notas) VALUES (?, ?, ?)', [
    data.fecha,
    data.pesoKg,
    data.notas,
  ])
  const id = lastInsertId()
  return { id, ...data }
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
  run('UPDATE weight_entry SET fecha = ?, pesoKg = ?, notas = ? WHERE id = ?', [
    data.fecha,
    data.pesoKg,
    data.notas,
    id,
  ])
}

export function deleteWeightEntry(id: number): void {
  run('DELETE FROM weight_entry WHERE id = ?', [id])
}
