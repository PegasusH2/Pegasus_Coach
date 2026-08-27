import { all, get, lastInsertId, run, runNoPersist, transaction } from '../index'
import type { MacroPlan, MacroPlanInput } from '@shared/types'

const COLUMNS = [
  'fecha',
  'semanaId',
  'neatObjetivoPasos',
  'aguaLitros',
  'salGramos',
  'entrenamientoDiasSemana',
  'entrenamientoDuracionMin',
  'pesoCorporalRef',
  'porcentajeGraso',
  'normocalorico',
  'diasOn',
  'proteinaOn',
  'hidratosOn',
  'grasasOn',
  'diasOff',
  'proteinaOff',
  'hidratosOff',
  'grasasOff',
  'notas',
] as const

function values(data: MacroPlanInput): unknown[] {
  return COLUMNS.map((c) => data[c] ?? null)
}

export function listMacroPlans(): MacroPlan[] {
  return all<MacroPlan>('SELECT * FROM macro_plan ORDER BY fecha ASC')
}

export function getMacroPlan(id: number): MacroPlan | undefined {
  return get<MacroPlan>('SELECT * FROM macro_plan WHERE id = ?', [id])
}

/** El plan "activo" es el más reciente por fecha (igual que la última fila del Excel). */
export function getActiveMacroPlan(): MacroPlan | undefined {
  return get<MacroPlan>('SELECT * FROM macro_plan ORDER BY fecha DESC LIMIT 1')
}

export function createMacroPlan(data: MacroPlanInput): MacroPlan {
  const placeholders = COLUMNS.map(() => '?').join(', ')
  run(`INSERT INTO macro_plan (${COLUMNS.join(', ')}) VALUES (${placeholders})`, values(data))
  const id = lastInsertId()
  return { id, ...data }
}

/** Igual que createMacroPlan pero sin persistir a disco — para usar dentro de una transacción por lotes (importador). */
export function createMacroPlanBatch(data: MacroPlanInput): void {
  const placeholders = COLUMNS.map(() => '?').join(', ')
  runNoPersist(`INSERT INTO macro_plan (${COLUMNS.join(', ')}) VALUES (${placeholders})`, values(data))
}

export function updateMacroPlan(id: number, data: MacroPlanInput): void {
  const setClause = COLUMNS.map((c) => `${c} = ?`).join(', ')
  run(`UPDATE macro_plan SET ${setClause} WHERE id = ?`, [...values(data), id])
}

export function deleteMacroPlan(id: number): void {
  run('DELETE FROM macro_plan WHERE id = ?', [id])
}

export function createMacroPlansBatch(items: MacroPlanInput[]): void {
  transaction(() => {
    for (const item of items) {
      createMacroPlanBatch(item)
    }
  })
}
