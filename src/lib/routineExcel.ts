// Plantilla e importación de rutinas por Excel — mismo patrón ExcelJS que
// exportData.ts/excelImporter.ts. Una fila por ejercicio; el valor de "Día"
// agrupa varias filas en el mismo día (mismo orden en que aparecen en la hoja).
import ExcelJS from 'exceljs'

const SHEET_NAME = 'Rutina'
const HEADER_ROW = 4
const FIRST_DATA_ROW = 5
const FILAS_EN_BLANCO = 40

function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}

export async function descargarPlantillaRutina(): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(SHEET_NAME)

  sheet.getCell('A1').value = 'Plantilla de rutina — Pegasus Coach'
  sheet.getCell('A1').font = { bold: true, size: 13 }
  sheet.getCell('A2').value = 'Nombre de la rutina:'
  sheet.getCell('A2').font = { bold: true }
  sheet.getCell('A3').value = 'Cada fila es un ejercicio. Repite el mismo "Día" en varias filas para agruparlas en el mismo día.'
  sheet.getCell('A3').font = { italic: true, size: 10 }

  const headerRow = sheet.getRow(HEADER_ROW)
  headerRow.values = ['Día', 'Ejercicio', 'Series', 'Reps mín', 'Reps máx']
  headerRow.font = { bold: true }

  sheet.columns = [
    { key: 'dia', width: 14 },
    { key: 'ejercicio', width: 30 },
    { key: 'series', width: 10 },
    { key: 'repsMin', width: 10 },
    { key: 'repsMax', width: 10 },
  ]

  // Filas en blanco listas para rellenar — plantilla vacía, sin datos de ejemplo.
  for (let i = 0; i < FILAS_EN_BLANCO; i++) sheet.addRow([])

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  descargarBlob(blob, 'pegasus-plantilla-rutina.xlsx')
}

export interface FilaRutinaImportada {
  dia: string
  ejercicio: string
  series: number
  repsMin: number | null
  repsMax: number | null
}

export interface RutinaImportada {
  nombreRutina: string | null
  filas: FilaRutinaImportada[]
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(',', '.')
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed) && trimmed !== '') return Math.round(parsed)
  }
  return null
}

export async function parseRutinaExcel(file: File): Promise<RutinaImportada> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0]
  if (!sheet) throw new Error('El archivo no tiene ninguna hoja.')

  const nombreRutina = toText(sheet.getCell('B2').value)

  const filas: FilaRutinaImportada[] = []
  const lastRow = sheet.lastRow?.number ?? FIRST_DATA_ROW
  for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
    const row = sheet.getRow(r)
    const dia = toText(row.getCell(1).value)
    const ejercicio = toText(row.getCell(2).value)
    if (!dia || !ejercicio) continue // fila de plantilla vacía
    const series = toInt(row.getCell(3).value) ?? 3
    filas.push({
      dia,
      ejercicio,
      series: Math.min(100, Math.max(1, series)),
      repsMin: toInt(row.getCell(4).value),
      repsMax: toInt(row.getCell(5).value),
    })
  }

  if (filas.length === 0) {
    throw new Error('No se encontró ninguna fila con "Día" y "Ejercicio" rellenos.')
  }

  return { nombreRutina, filas }
}
