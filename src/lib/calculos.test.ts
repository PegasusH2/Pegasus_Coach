import { describe, it, expect } from 'vitest'
import { calcularMacroPlan, calorias, porKg } from './calculos'
import type { MacroPlan } from '@shared/types'

function basePlan(overrides: Partial<MacroPlan>): MacroPlan {
  return {
    id: 0,
    fecha: '2026-07-13',
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

describe('calorias (Excel L / T: prote*4 + hidratos*4 + grasas*9)', () => {
  it('replica L17 del Excel: 160/260/40 -> 2040', () => {
    expect(calorias(160, 260, 40)).toBe(2040)
  })
  it('replica T17 del Excel: 160/220/40 -> 1880', () => {
    expect(calorias(160, 220, 40)).toBe(1880)
  })
})

describe('porKg (Excel: IF(peso=0,0,valor/peso))', () => {
  it('devuelve 0 si el peso es 0 o nulo', () => {
    expect(porKg(160, 0)).toBe(0)
    expect(porKg(160, null)).toBe(0)
  })
  it('replica K17 del Excel: 1960/80.5 = 24.347826...', () => {
    expect(porKg(1960, 80.5)).toBeCloseTo(24.34782609, 8)
  })
})

// Fila 17 real del Excel (última fila con datos): fecha 2026-07-13, peso 80.5kg,
// NEAT 15000, normocalórico 0 (vacío), ON: 4 días, prot 160, hidr 260, gras 40,
// OFF: 3 días, prot 160, hidr 220, gras 40.
// Valores cacheados en el Excel: L17=2040, T17=1880, I17=1960, J17=1960, K17=24.34782609,
// O17=1.98757764, Q17=3.229813665, S17=0.4968944099, W17=1.98757764, Y17=2.732919255, AA17=0.4968944099
describe('calcularMacroPlan — fila 17 del Excel (vector de verificación)', () => {
  const plan = basePlan({
    pesoCorporalRef: 80.5,
    normocalorico: 0,
    diasOn: 4,
    proteinaOn: 160,
    hidratosOn: 260,
    grasasOn: 40,
    diasOff: 3,
    proteinaOff: 160,
    hidratosOff: 220,
    grasasOff: 40,
  })
  const c = calcularMacroPlan(plan)

  it('calTotalOn = 2040 (L17)', () => expect(c.calTotalOn).toBe(2040))
  it('calTotalOff = 1880 (T17)', () => expect(c.calTotalOff).toBe(1880))
  it('promedioCalorias = 1960 (I17, media simple)', () => expect(c.promedioCalorias).toBe(1960))
  it('superavitDeficit = 1960 (J17)', () => expect(c.superavitDeficit).toBe(1960))
  it('calPorKg = 24.34782609 (K17)', () => expect(c.calPorKg).toBeCloseTo(24.34782609, 6))
  it('proteinaOnPorKg = 1.98757764 (O17)', () => expect(c.proteinaOnPorKg).toBeCloseTo(1.98757764, 6))
  it('hidratosOnPorKg = 3.229813665 (Q17)', () => expect(c.hidratosOnPorKg).toBeCloseTo(3.229813665, 6))
  it('grasasOnPorKg = 0.4968944099 (S17)', () => expect(c.grasasOnPorKg).toBeCloseTo(0.4968944099, 6))
  it('proteinaOffPorKg = 1.98757764 (W17)', () => expect(c.proteinaOffPorKg).toBeCloseTo(1.98757764, 6))
  it('hidratosOffPorKg = 2.732919255 (Y17)', () => expect(c.hidratosOffPorKg).toBeCloseTo(2.732919255, 6))
  it('grasasOffPorKg = 0.4968944099 (AA17)', () => expect(c.grasasOffPorKg).toBeCloseTo(0.4968944099, 6))
})

// Fila 11 real del Excel: peso 88kg, ON prot 189/hidr 315/gras 50, OFF prot 189/hidr 275/gras 50.
// Cacheados: T11=2306, W11=2.147727273, Y11=3.125, AA11=0.5681818182
describe('calcularMacroPlan — fila 11 del Excel (segundo vector de verificación)', () => {
  const plan = basePlan({
    pesoCorporalRef: 88,
    proteinaOn: 189,
    hidratosOn: 315,
    grasasOn: 50,
    proteinaOff: 189,
    hidratosOff: 275,
    grasasOff: 50,
  })
  const c = calcularMacroPlan(plan)

  it('calTotalOff = 2306 (T11)', () => expect(c.calTotalOff).toBe(2306))
  it('proteinaOffPorKg = 2.147727273 (W11)', () => expect(c.proteinaOffPorKg).toBeCloseTo(2.147727273, 6))
  it('hidratosOffPorKg = 3.125 (Y11)', () => expect(c.hidratosOffPorKg).toBeCloseTo(3.125, 6))
  it('grasasOffPorKg = 0.5681818182 (AA11)', () => expect(c.grasasOffPorKg).toBeCloseTo(0.5681818182, 6))
})
