import { deleteRow, getOneByUser, insertRow, insertRows, listByUser, updateRow } from './crud'
import type { MacroPlan, MacroPlanInput } from '@/types'

const TABLE = 'nutrition_macro_plan'

export function listMacroPlans(userId: string): Promise<MacroPlan[]> {
  return listByUser<MacroPlan>(TABLE, userId, 'fecha')
}

/** El plan "activo" es el más reciente por fecha (igual que la última fila del Excel). */
export function getActiveMacroPlan(userId: string): Promise<MacroPlan | undefined> {
  return getOneByUser<MacroPlan>(TABLE, userId, 'fecha', false)
}

export function createMacroPlan(data: MacroPlanInput): Promise<MacroPlan> {
  return insertRow<MacroPlan>(TABLE, data)
}

export function createMacroPlansBatch(rows: MacroPlanInput[]): Promise<void> {
  return insertRows(TABLE, rows)
}

export function updateMacroPlan(id: string, data: MacroPlanInput): Promise<void> {
  return updateRow(TABLE, id, data)
}

export function deleteMacroPlan(id: string): Promise<void> {
  return deleteRow(TABLE, id)
}
