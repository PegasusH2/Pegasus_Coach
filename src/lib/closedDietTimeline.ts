// Agrupa los ClosedDietItem (lista plana) en "comidas" para el timeline visual
// de Dieta Cerrada, usando el campo `momento` (texto libre, p.ej. "08:00" o
// "Desayuno, 8:00…") como clave de agrupación.
//
// LIMITACIÓN CONOCIDA: `momento` es texto libre, no una hora estructurada ni
// un id de comida — el agrupado es por IGUALDAD EXACTA de string. Dos filas
// con "Desayuno" y "desayuno" (o un espacio de más) generan dos grupos
// distintos en vez de uno. Es una limitación heredada del modelo real de
// nutrition_closed_diet_item, que esta implementación no cambia (no hay
// migración prevista); estructurar `momento` en el futuro (hora + nombre de
// comida) eliminaría este problema de raíz.
import type { ClosedDietItem } from '@/types'

export interface GrupoComida {
  momento: string | null
  items: ClosedDietItem[]
}

export function groupClosedDietItemsByMomento(items: ClosedDietItem[]): GrupoComida[] {
  const grupos: GrupoComida[] = []
  const indicePorMomento = new Map<string | null, number>()

  const ordenados = [...items].sort((a, b) => a.orden - b.orden)
  for (const item of ordenados) {
    const clave = item.momento
    let indice = indicePorMomento.get(clave)
    if (indice === undefined) {
      indice = grupos.length
      indicePorMomento.set(clave, indice)
      grupos.push({ momento: clave, items: [] })
    }
    grupos[indice].items.push(item)
  }

  // Los grupos "sin horario" (momento null) siempre van al final, tras los
  // que sí tienen un momento indicado — más útil de leer que su posición de
  // aparición original.
  const conMomento = grupos.filter((g) => g.momento !== null)
  const sinMomento = grupos.filter((g) => g.momento === null)
  return [...conMomento, ...sinMomento]
}
