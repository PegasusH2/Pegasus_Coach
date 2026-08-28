import { supabase } from './client'
import { deleteRow, insertRow, listByUser, updateRow } from './crud'
import type { Mesociclo, MesocicloInput, Semana, SemanaInput } from '@/types'

const MESOCICLO = 'nutrition_mesociclo'
const SEMANA = 'nutrition_semana'

export function listMesociclos(userId: string): Promise<Mesociclo[]> {
  return listByUser<Mesociclo>(MESOCICLO, userId, 'numero')
}

export function createMesociclo(data: MesocicloInput): Promise<Mesociclo> {
  return insertRow<Mesociclo>(MESOCICLO, data)
}

export function updateMesociclo(id: string, data: MesocicloInput): Promise<void> {
  return updateRow(MESOCICLO, id, data)
}

export function deleteMesociclo(id: string): Promise<void> {
  return deleteRow(MESOCICLO, id)
}

export async function listSemanas(mesocicloId: string): Promise<Semana[]> {
  const { data, error } = await supabase
    .from(SEMANA)
    .select('*')
    .eq('mesocicloId', mesocicloId)
    .order('numero', { ascending: true })
  if (error) throw new Error(`Error al listar semanas: ${error.message}`)
  return (data ?? []) as Semana[]
}

export function createSemana(data: SemanaInput): Promise<Semana> {
  return insertRow<Semana>(SEMANA, data)
}

export function deleteSemana(id: string): Promise<void> {
  return deleteRow(SEMANA, id)
}
