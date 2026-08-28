// Réplica exacta de las fórmulas de la hoja "Control macros y general" del Excel original.
// No se debe modificar esta lógica sin volver a validar contra el Excel fuente.
import type { MacroPlan, MacroPlanCalculado } from '@/types'

const KCAL_PROTEINA = 4
const KCAL_HIDRATOS = 4
const KCAL_GRASAS = 9

function n(v: number | null | undefined): number {
  return v ?? 0
}

/** Excel L / T: (prote*4) + (hidratos*4) + (grasas*9) */
export function calorias(proteina: number | null, hidratos: number | null, grasas: number | null): number {
  return n(proteina) * KCAL_PROTEINA + n(hidratos) * KCAL_HIDRATOS + n(grasas) * KCAL_GRASAS
}

/** Excel: IF(peso=0,0,valor/peso) */
export function porKg(valor: number | null, pesoKg: number | null): number {
  const peso = n(pesoKg)
  if (peso === 0) return 0
  return n(valor) / peso
}

/**
 * Deriva todos los campos calculados de un MacroPlan a partir de sus campos manuales,
 * replicando exactamente las fórmulas del Excel (ver plan de migración).
 */
export function calcularMacroPlan(plan: MacroPlan): MacroPlanCalculado {
  const calTotalOn = calorias(plan.proteinaOn, plan.hidratosOn, plan.grasasOn)
  const calTotalOff = calorias(plan.proteinaOff, plan.hidratosOff, plan.grasasOff)
  // Excel I: media SIMPLE entre ON y OFF, no ponderada por número de días.
  const promedioCalorias = (calTotalOn + calTotalOff) / 2
  // Excel J: promedio - normocalórico
  const superavitDeficit = promedioCalorias - n(plan.normocalorico)
  // Excel K
  const calPorKg = porKg(promedioCalorias, plan.pesoCorporalRef)

  return {
    ...plan,
    calTotalOn,
    calTotalOff,
    promedioCalorias,
    superavitDeficit,
    calPorKg,
    proteinaOnPorKg: porKg(plan.proteinaOn, plan.pesoCorporalRef),
    hidratosOnPorKg: porKg(plan.hidratosOn, plan.pesoCorporalRef),
    grasasOnPorKg: porKg(plan.grasasOn, plan.pesoCorporalRef),
    proteinaOffPorKg: porKg(plan.proteinaOff, plan.pesoCorporalRef),
    hidratosOffPorKg: porKg(plan.hidratosOff, plan.pesoCorporalRef),
    grasasOffPorKg: porKg(plan.grasasOff, plan.pesoCorporalRef),
  }
}

/** Promedio semanal de calorías ON/OFF y diario, para el dashboard. Misma lógica simple que el Excel (no ponderada). */
export function promedioSemanal(plan: MacroPlanCalculado) {
  return {
    calOn: plan.calTotalOn,
    calOff: plan.calTotalOff,
    diasOn: n(plan.diasOn),
    diasOff: n(plan.diasOff),
    promedioDiario: plan.promedioCalorias,
  }
}

export function cambioPeso(pesos: { fecha: string; pesoKg: number }[]) {
  if (pesos.length === 0) {
    return { actual: null, inicial: null, cambioTotal: null }
  }
  const ordenados = [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const inicial = ordenados[0].pesoKg
  const actual = ordenados[ordenados.length - 1].pesoKg
  return { actual, inicial, cambioTotal: actual - inicial }
}

/** Cambio de peso entre el registro más reciente y el más cercano a `dias` atrás. null si no hay suficiente histórico. */
export function cambioEnPeriodo(pesos: { fecha: string; pesoKg: number }[], dias: number): number | null {
  if (pesos.length < 2) return null
  const ordenados = [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const actual = ordenados[ordenados.length - 1]
  const fechaLimite = new Date(actual.fecha + 'T00:00:00')
  fechaLimite.setDate(fechaLimite.getDate() - dias)
  const limiteIso = fechaLimite.toISOString().slice(0, 10)

  const candidatos = ordenados.filter((p) => p.fecha <= limiteIso)
  if (candidatos.length === 0) return null
  const referencia = candidatos[candidatos.length - 1]
  return actual.pesoKg - referencia.pesoKg
}
