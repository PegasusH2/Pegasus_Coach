import { deleteRow, insertRow, listByUser, updateRow } from './crud'
import type { Measurement, MeasurementInput } from '@/types'

const TABLE = 'nutrition_measurement'

export function listMeasurements(userId: string): Promise<Measurement[]> {
  return listByUser<Measurement>(TABLE, userId, 'fecha')
}

export function createMeasurement(data: MeasurementInput): Promise<Measurement> {
  return insertRow<Measurement>(TABLE, data)
}

export function updateMeasurement(id: string, data: MeasurementInput): Promise<void> {
  return updateRow(TABLE, id, data)
}

export function deleteMeasurement(id: string): Promise<void> {
  return deleteRow(TABLE, id)
}
