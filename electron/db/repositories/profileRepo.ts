import { get, run } from '../index'
import type { Profile } from '@shared/types'

interface ProfileRow {
  id: number
  nombre: string
  pesoInicial: number | null
  fechaInicio: string | null
  neatObjetivoPasos: number | null
}

export function getProfile(): Profile {
  const row = get<ProfileRow>('SELECT * FROM profile WHERE id = 1')
  if (!row) {
    return { id: 1, nombre: '', pesoInicial: null, fechaInicio: null, neatObjetivoPasos: null }
  }
  return row
}

export function updateProfile(data: Omit<Profile, 'id'>): Profile {
  run(
    `UPDATE profile SET nombre = ?, pesoInicial = ?, fechaInicio = ?, neatObjetivoPasos = ? WHERE id = 1`,
    [data.nombre, data.pesoInicial, data.fechaInicio, data.neatObjetivoPasos],
  )
  return getProfile()
}
