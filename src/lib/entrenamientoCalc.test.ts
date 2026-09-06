import { describe, it, expect } from 'vitest'
import {
  calcularEjerciciosCompletados,
  calcularSeriesCompletadas,
  calcularVolumen,
  compararConSesionAnterior,
  esNuevoPR,
  estimar1RM,
  mejorSet,
  serieRepresentativa,
} from './entrenamientoCalc'
import type { TrackerExerciseHistorySet, TrackerWorkoutExercise } from '@/types'

function ejercicio(sets: Partial<TrackerWorkoutExercise['sets'][number]>[]): TrackerWorkoutExercise {
  return {
    id: 'we-1',
    workoutId: 'w-1',
    exerciseId: 'ex-1',
    exerciseNombre: 'Press banca',
    targetRepsMin: null,
    targetRepsMax: null,
    targetRir: null,
    sets: sets.map((s, i) => ({ id: `s-${i}`, workoutExerciseId: 'we-1', setNumber: i + 1, weight: null, reps: null, rir: null, done: false, ...s })),
  }
}

describe('calcularVolumen', () => {
  it('suma peso x reps solo de series hechas con peso y reps', () => {
    const ejercicios = [
      ejercicio([
        { weight: 80, reps: 8, done: true },
        { weight: 80, reps: 7, done: true },
        { weight: 80, reps: 6, done: false }, // no hecha: no cuenta
        { weight: null, reps: 12, done: true }, // peso corporal: no suma volumen
      ]),
    ]
    expect(calcularVolumen(ejercicios)).toBe(80 * 8 + 80 * 7)
  })
  it('sin series, volumen 0', () => {
    expect(calcularVolumen([ejercicio([])])).toBe(0)
  })
  it('weight 0 (sin rellenar en Tracker) no suma volumen, igual que null', () => {
    const ejercicios = [ejercicio([{ weight: 0, reps: 6, done: true }])]
    expect(calcularVolumen(ejercicios)).toBe(0)
  })
})

describe('calcularSeriesCompletadas', () => {
  it('cuenta hechas vs total, cualquiera que sea el peso', () => {
    const ejercicios = [ejercicio([{ done: true }, { done: true }, { done: false }])]
    expect(calcularSeriesCompletadas(ejercicios)).toEqual({ completadas: 2, total: 3 })
  })
})

describe('calcularEjerciciosCompletados', () => {
  it('un ejercicio cuenta como completado solo si TODAS sus series están hechas', () => {
    const ejercicios = [
      ejercicio([{ done: true }, { done: true }]),
      ejercicio([{ done: true }, { done: false }]),
    ]
    expect(calcularEjerciciosCompletados(ejercicios)).toEqual({ completados: 1, total: 2 })
  })
  it('un ejercicio sin series no cuenta como completado', () => {
    expect(calcularEjerciciosCompletados([ejercicio([])])).toEqual({ completados: 0, total: 1 })
  })
})

describe('estimar1RM (Epley)', () => {
  it('1 rep -> el propio peso', () => {
    expect(estimar1RM(100, 1)).toBe(100)
  })
  it('80kg x 8 -> 80 * (1 + 8/30)', () => {
    expect(estimar1RM(80, 8)).toBeCloseTo(80 * (1 + 8 / 30), 6)
  })
})

describe('mejorSet', () => {
  it('null si no hay series válidas', () => {
    expect(mejorSet([])).toBeNull()
    expect(mejorSet([{ workoutId: 'w', date: '2026-01-01', weight: null, reps: 8 }])).toBeNull()
  })
  it('elige la de mayor 1RM estimado, no la de mayor peso bruto', () => {
    const historial: TrackerExerciseHistorySet[] = [
      { workoutId: 'w1', date: '2026-01-01', weight: 100, reps: 1 }, // 1RM = 100
      { workoutId: 'w2', date: '2026-01-08', weight: 80, reps: 8 }, // 1RM = 101.33
    ]
    const mejor = mejorSet(historial)
    expect(mejor?.weight).toBe(80)
    expect(mejor?.reps).toBe(8)
  })
})

describe('esNuevoPR', () => {
  it('false si no hay histórico previo (no se puede determinar)', () => {
    expect(esNuevoPR(100, 5, [])).toBe(false)
  })
  it('true si supera el mejor 1RM histórico', () => {
    const historial: TrackerExerciseHistorySet[] = [{ workoutId: 'w1', date: '2026-01-01', weight: 80, reps: 8 }]
    expect(esNuevoPR(85, 8, historial)).toBe(true)
  })
  it('false si no supera el histórico', () => {
    const historial: TrackerExerciseHistorySet[] = [{ workoutId: 'w1', date: '2026-01-01', weight: 90, reps: 8 }]
    expect(esNuevoPR(80, 8, historial)).toBe(false)
  })
})

describe('serieRepresentativa', () => {
  it('elige la de mayor peso; a igual peso, la de más reps', () => {
    const sets = [
      { weight: 80, reps: 8 },
      { weight: 80, reps: 10 },
      { weight: 70, reps: 12 },
    ]
    expect(serieRepresentativa(sets)).toEqual({ weight: 80, reps: 10 })
  })
  it('null si ninguna serie tiene peso y reps', () => {
    expect(serieRepresentativa([{ weight: null, reps: 12 }])).toBeNull()
  })
  it('ignora weight 0 igual que null (sin rellenar en Tracker)', () => {
    expect(serieRepresentativa([{ weight: 0, reps: 12 }])).toBeNull()
    expect(serieRepresentativa([{ weight: 0, reps: 12 }, { weight: 60, reps: 8 }])).toEqual({ weight: 60, reps: 8 })
  })
})

describe('compararConSesionAnterior', () => {
  it('null si no hay ninguna sesión anterior', () => {
    expect(compararConSesionAnterior({ weight: 80, reps: 8 }, [], 'w-actual')).toBeNull()
  })
  it('calcula el cambio porcentual contra la sesión anterior más reciente', () => {
    const historial: TrackerExerciseHistorySet[] = [
      { workoutId: 'w-actual', date: '2026-01-15', weight: 80, reps: 8 },
      { workoutId: 'w-anterior', date: '2026-01-08', weight: 77.5, reps: 8 },
      { workoutId: 'w-mas-viejo', date: '2026-01-01', weight: 75, reps: 8 },
    ]
    const c = compararConSesionAnterior({ weight: 80, reps: 8 }, historial, 'w-actual')
    expect(c?.anterior).toEqual({ weight: 77.5, reps: 8 })
    expect(c?.cambioPorcentual).toBeCloseTo(((80 - 77.5) / 77.5) * 100, 6)
  })
})
