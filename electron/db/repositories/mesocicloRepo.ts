import { all, get, lastInsertId, run } from '../index'
import type { Mesociclo, Semana } from '@shared/types'

export function listMesociclos(): Mesociclo[] {
  return all<Mesociclo>('SELECT * FROM mesociclo ORDER BY numero ASC')
}

export function createMesociclo(data: Omit<Mesociclo, 'id'>): Mesociclo {
  run('INSERT INTO mesociclo (numero, nombre, fechaInicio) VALUES (?, ?, ?)', [
    data.numero,
    data.nombre,
    data.fechaInicio,
  ])
  const id = lastInsertId()
  return { id, ...data }
}

export function updateMesociclo(id: number, data: Omit<Mesociclo, 'id'>): void {
  run('UPDATE mesociclo SET numero = ?, nombre = ?, fechaInicio = ? WHERE id = ?', [
    data.numero,
    data.nombre,
    data.fechaInicio,
    id,
  ])
}

export function deleteMesociclo(id: number): void {
  run('DELETE FROM mesociclo WHERE id = ?', [id])
}

export function listSemanas(mesocicloId: number): Semana[] {
  return all<Semana>('SELECT * FROM semana WHERE mesocicloId = ? ORDER BY numero ASC', [mesocicloId])
}

export function createSemana(data: Omit<Semana, 'id'>): Semana {
  run('INSERT INTO semana (mesocicloId, numero, fechaInicio) VALUES (?, ?, ?)', [
    data.mesocicloId,
    data.numero,
    data.fechaInicio,
  ])
  const id = lastInsertId()
  return { id, ...data }
}

export function deleteSemana(id: number): void {
  run('DELETE FROM semana WHERE id = ?', [id])
}

export function getSemana(id: number): Semana | undefined {
  return get<Semana>('SELECT * FROM semana WHERE id = ?', [id])
}
