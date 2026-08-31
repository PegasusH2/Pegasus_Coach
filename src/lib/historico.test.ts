import { describe, it, expect } from 'vitest'
import { construirHistorico } from './historico'
import type { ClosedDietPlan, MacroPlan } from '@/types'

function macroPlan(overrides: Partial<MacroPlan>): MacroPlan {
  return {
    id: 'm-' + overrides.fecha,
    userId: 'u1',
    fecha: '2026-08-01',
    semanaId: null,
    neatObjetivoPasos: null,
    aguaLitros: null,
    salGramos: null,
    entrenamientoDiasSemana: null,
    entrenamientoDuracionMin: null,
    pesoCorporalRef: null,
    porcentajeGraso: null,
    normocalorico: null,
    diasOn: null,
    proteinaOn: null,
    hidratosOn: null,
    grasasOn: null,
    diasOff: null,
    proteinaOff: null,
    hidratosOff: null,
    grasasOff: null,
    notas: null,
    ...overrides,
  }
}

function closedDietPlan(overrides: Partial<ClosedDietPlan>): ClosedDietPlan {
  return { id: 'c-' + overrides.fecha, userId: 'u1', fecha: '2026-08-01', semanaId: null, notas: null, ...overrides }
}

describe('construirHistorico', () => {
  it('fusiona macros y dieta cerrada ordenados por fecha descendente', () => {
    const macros = [macroPlan({ fecha: '2026-08-01' }), macroPlan({ fecha: '2026-08-15' })]
    const cerrada = [closedDietPlan({ fecha: '2026-08-31' })]

    const historico = construirHistorico(macros, cerrada, 'cerrada')

    expect(historico.map((e) => e.fecha)).toEqual(['2026-08-31', '2026-08-15', '2026-08-01'])
    expect(historico.map((e) => e.tipo)).toEqual(['cerrada', 'macros', 'macros'])
  })

  it('marca "actual" solo la fila más reciente del tipo que coincide con tipoDieta actual', () => {
    const macros = [macroPlan({ fecha: '2026-08-01' }), macroPlan({ fecha: '2026-08-15' })]
    const cerrada = [closedDietPlan({ fecha: '2026-08-31' })]

    const historico = construirHistorico(macros, cerrada, 'cerrada')

    expect(historico.find((e) => e.fecha === '2026-08-31')?.actual).toBe(true)
    expect(historico.filter((e) => e.actual)).toHaveLength(1)
  })

  it('si tipoDieta actual es macros, la dieta cerrada más reciente NO se marca actual aunque sea más nueva', () => {
    const macros = [macroPlan({ fecha: '2026-08-15' })]
    const cerrada = [closedDietPlan({ fecha: '2026-08-31' })]

    const historico = construirHistorico(macros, cerrada, 'macros')

    expect(historico.find((e) => e.fecha === '2026-08-31')?.actual).toBe(false)
    expect(historico.find((e) => e.fecha === '2026-08-15')?.actual).toBe(true)
  })

  it('no pierde filas de ningún tipo al cambiar de modo (conserva ambos históricos íntegros)', () => {
    const macros = [macroPlan({ fecha: '2026-08-01' }), macroPlan({ fecha: '2026-08-15' })]
    const cerrada = [closedDietPlan({ fecha: '2026-08-20' }), closedDietPlan({ fecha: '2026-08-31' })]

    const historico = construirHistorico(macros, cerrada, 'cerrada')

    expect(historico).toHaveLength(4)
    expect(historico.filter((e) => e.tipo === 'macros')).toHaveLength(2)
    expect(historico.filter((e) => e.tipo === 'cerrada')).toHaveLength(2)
  })

  it('calcula el resumen de macros a partir de los valores ON (kcal + P/C/G)', () => {
    const macros = [macroPlan({ fecha: '2026-08-15', proteinaOn: 180, hidratosOn: 250, grasasOn: 70 })]

    const historico = construirHistorico(macros, [], 'macros')

    // 180*4 + 250*4 + 70*9 = 720 + 1000 + 630 = 2350
    expect(historico[0].resumenPrincipal).toBe(`${(2350).toLocaleString('es-ES')} kcal`)
    expect(historico[0].resumenSecundario).toBe('P 180 g · C 250 g · G 70 g')
  })

  it('devuelve resumen fijo "Dieta cerrada" sin secundario para las filas de dieta cerrada', () => {
    const historico = construirHistorico([], [closedDietPlan({ fecha: '2026-08-31' })], 'cerrada')

    expect(historico[0].resumenPrincipal).toBe('Dieta cerrada')
    expect(historico[0].resumenSecundario).toBeNull()
  })

  it('con listas vacías devuelve array vacío sin lanzar', () => {
    expect(construirHistorico([], [], 'macros')).toEqual([])
  })
})
