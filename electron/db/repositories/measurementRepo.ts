import { all, get, lastInsertId, run } from '../index'
import type { Measurement, MeasurementInput } from '@shared/types'

const COLUMNS = [
  'fecha',
  'pectoral',
  'axila',
  'triceps',
  'subescapular',
  'abdomen',
  'suprailiaco',
  'cuadriceps',
  'porcentajeGraso',
  'brazo',
  'cintura',
  'cadera',
  'muslo',
  'pecho',
  'cuello',
  'notas',
] as const

function values(data: MeasurementInput): unknown[] {
  return COLUMNS.map((c) => data[c] ?? null)
}

export function listMeasurements(): Measurement[] {
  return all<Measurement>('SELECT * FROM measurement ORDER BY fecha ASC')
}

export function getMeasurement(id: number): Measurement | undefined {
  return get<Measurement>('SELECT * FROM measurement WHERE id = ?', [id])
}

export function createMeasurement(data: MeasurementInput): Measurement {
  const placeholders = COLUMNS.map(() => '?').join(', ')
  run(`INSERT INTO measurement (${COLUMNS.join(', ')}) VALUES (${placeholders})`, values(data))
  const id = lastInsertId()
  return { id, ...data }
}

export function updateMeasurement(id: number, data: MeasurementInput): void {
  const setClause = COLUMNS.map((c) => `${c} = ?`).join(', ')
  run(`UPDATE measurement SET ${setClause} WHERE id = ?`, [...values(data), id])
}

export function deleteMeasurement(id: number): void {
  run('DELETE FROM measurement WHERE id = ?', [id])
}
