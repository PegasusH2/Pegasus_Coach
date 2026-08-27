import ExcelJS from 'exceljs'
import type { ImportPreview, ImportRowIssue, MacroPlanInput, WeightEntryInput } from '@shared/types'

const SHEET_NAME = 'Control macros y general'
const HEADER_ROW = 8
const FIRST_DATA_ROW = 9

// Columnas del Excel, ver plan de migración (mapeo columna -> campo).
const COL = {
  fecha: 1, // A
  neat: 3, // C
  aguaSal: 4, // D
  entrenamiento: 5, // E
  peso: 6, // F
  porcentajeMg: 7, // G
  normocalorico: 8, // H
  diasOn: 13, // M
  proteinaOn: 14, // N
  hidratosOn: 16, // P
  grasasOn: 18, // R
  diasOff: 21, // U
  proteinaOff: 22, // V
  hidratosOff: 24, // X
  grasasOff: 26, // Z
} as const

function cellValue(row: ExcelJS.Row, col: number): unknown {
  const cell = row.getCell(col)
  return cell.value ?? null
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number') {
    // Fecha serial de Excel (días desde 1899-12-30).
    const ms = Math.round((value - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  return null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(',', '.')
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed) && trimmed !== '') return parsed
  }
  return null
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

const ENTRENAMIENTO_REGEX = /(\d+)\s*d[ií]as?.*?(\d+)\s*min/i

function parseEntrenamiento(raw: string | null): {
  dias: number | null
  minutos: number | null
  reconocido: boolean
} {
  if (!raw) return { dias: null, minutos: null, reconocido: false }
  const match = ENTRENAMIENTO_REGEX.exec(raw)
  if (!match) return { dias: null, minutos: null, reconocido: false }
  return { dias: Number(match[1]), minutos: Number(match[2]), reconocido: true }
}

function combineNotas(...partes: (string | null)[]): string | null {
  const validas = partes.filter((p): p is string => !!p && p.trim() !== '')
  return validas.length > 0 ? validas.join(' · ') : null
}

export async function buildImportPreview(filePath: string): Promise<ImportPreview> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const sheet = workbook.getWorksheet(SHEET_NAME)
  if (!sheet) {
    throw new Error(`No se encontró la hoja "${SHEET_NAME}" en el Excel seleccionado.`)
  }

  const macroPlans: MacroPlanInput[] = []
  const weightEntries: WeightEntryInput[] = []
  const filasARevisar: ImportRowIssue[] = []

  const lastRow = sheet.lastRow?.number ?? HEADER_ROW
  for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
    const row = sheet.getRow(r)
    const fechaRaw = cellValue(row, COL.fecha)
    const fecha = toIsoDate(fechaRaw)
    if (!fecha) continue // fila de plantilla vacía, no es un registro real

    const notasFila: string[] = []

    // NEAT: histórico mezcla texto libre y número de pasos objetivo.
    const neatRaw = cellValue(row, COL.neat)
    const neatNum = toNumber(neatRaw)
    let neatObjetivoPasos: number | null = null
    if (neatNum !== null) {
      neatObjetivoPasos = neatNum
    } else {
      const neatTexto = toText(neatRaw)
      if (neatTexto) notasFila.push(`NEAT (histórico): ${neatTexto}`)
    }

    // AG/SAL: formato histórico no parseable de forma fiable, se guarda como nota.
    const aguaSalTexto = toText(cellValue(row, COL.aguaSal))
    if (aguaSalTexto) notasFila.push(`Agua/Sal (histórico): ${aguaSalTexto}`)

    // Entrenamiento: se intenta reconocer "N días M min"; si no, se guarda tal cual.
    const entrenamientoTexto = toText(cellValue(row, COL.entrenamiento))
    const entrenamientoParseado = parseEntrenamiento(entrenamientoTexto)
    if (entrenamientoTexto && !entrenamientoParseado.reconocido) {
      notasFila.push(`Entrenamiento (histórico): ${entrenamientoTexto}`)
    }

    const pesoCorporalRef = toNumber(cellValue(row, COL.peso))

    // % MG: se ignoran placeholders no numéricos (ej. "¿……….?").
    const porcentajeGraso = toNumber(cellValue(row, COL.porcentajeMg))

    const normocalorico = toNumber(cellValue(row, COL.normocalorico))
    const diasOn = toNumber(cellValue(row, COL.diasOn))
    const proteinaOn = toNumber(cellValue(row, COL.proteinaOn))
    const hidratosOn = toNumber(cellValue(row, COL.hidratosOn))
    const grasasOn = toNumber(cellValue(row, COL.grasasOn))
    const diasOff = toNumber(cellValue(row, COL.diasOff))
    const proteinaOff = toNumber(cellValue(row, COL.proteinaOff))
    const hidratosOff = toNumber(cellValue(row, COL.hidratosOff))
    const grasasOff = toNumber(cellValue(row, COL.grasasOff))

    macroPlans.push({
      fecha,
      semanaId: null,
      neatObjetivoPasos,
      aguaLitros: null,
      salGramos: null,
      entrenamientoDiasSemana: entrenamientoParseado.dias,
      entrenamientoDuracionMin: entrenamientoParseado.minutos,
      pesoCorporalRef,
      porcentajeGraso,
      normocalorico,
      diasOn,
      proteinaOn,
      hidratosOn,
      grasasOn,
      diasOff,
      proteinaOff,
      hidratosOff,
      grasasOff,
      notas: combineNotas('Importado del Excel', ...notasFila),
    })

    if (pesoCorporalRef !== null) {
      weightEntries.push({ fecha, pesoKg: pesoCorporalRef, notas: 'Importado del Excel' })
    }

    if (notasFila.length > 0) {
      filasARevisar.push({
        fila: r,
        fecha,
        motivo: notasFila.join('; '),
      })
    }
  }

  return {
    totalFilas: macroPlans.length,
    macroPlans,
    weightEntries,
    filasARevisar,
  }
}
