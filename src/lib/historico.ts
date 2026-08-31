// Histórico nutricional unificado: fusiona nutrition_macro_plan y
// nutrition_closed_diet_plan en una sola línea temporal, sin tocar ninguna de
// las dos tablas ni su semántica de "activo" (getActiveMacroPlan /
// getActiveClosedDietPlan siguen siendo la fuente para la pantalla de
// contenido — este módulo es solo de lectura/presentación del pasado).
import { calorias } from './calculos'
import type { ClosedDietPlan, MacroPlan, TipoDieta } from '@/types'

export interface HistoricoEntry {
  tipo: TipoDieta
  fecha: string
  /** El registro más reciente del tipo que coincide con profiles.tipoDieta actual. */
  actual: boolean
  resumenPrincipal: string
  resumenSecundario: string | null
}

function resumenMacro(plan: MacroPlan): Pick<HistoricoEntry, 'resumenPrincipal' | 'resumenSecundario'> {
  const kcal = calorias(plan.proteinaOn, plan.hidratosOn, plan.grasasOn)
  return {
    resumenPrincipal: `${kcal.toLocaleString('es-ES')} kcal`,
    resumenSecundario: `P ${plan.proteinaOn ?? '—'} g · C ${plan.hidratosOn ?? '—'} g · G ${plan.grasasOn ?? '—'} g`,
  }
}

/**
 * Fusiona los planes de macros y de dieta cerrada por fecha (más reciente primero).
 * `tipoDietaActual` decide cuál de las dos series puede llevar el badge "Actual"
 * (solo su fila más reciente) — la otra serie es puro histórico, nunca "actual",
 * aunque su fecha sea más reciente que la última fila del tipo activo.
 */
export function construirHistorico(
  macroPlans: MacroPlan[],
  closedDietPlans: ClosedDietPlan[],
  tipoDietaActual: TipoDieta,
): HistoricoEntry[] {
  const macroEntries: HistoricoEntry[] = macroPlans.map((plan) => ({
    tipo: 'macros',
    fecha: plan.fecha,
    actual: false,
    ...resumenMacro(plan),
  }))
  const closedDietEntries: HistoricoEntry[] = closedDietPlans.map((plan) => ({
    tipo: 'cerrada',
    fecha: plan.fecha,
    actual: false,
    resumenPrincipal: 'Dieta cerrada',
    resumenSecundario: null,
  }))

  const todas = [...macroEntries, ...closedDietEntries].sort((a, b) => b.fecha.localeCompare(a.fecha))

  const indiceActual = todas.findIndex((e) => e.tipo === tipoDietaActual)
  if (indiceActual !== -1) todas[indiceActual] = { ...todas[indiceActual], actual: true }

  return todas
}
