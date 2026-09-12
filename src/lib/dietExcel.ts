// Plantilla e importación de dietas cerradas por Excel — mismo patrón que
// routineExcel.ts. Una fila por alimento; "Día tipo" (on/off/unico) y
// "Momento" agrupan los alimentos de cada comida.
import ExcelJS from 'exceljs'
import type { DiaTipoItem } from '@/types'

const SHEET_NAME = 'Dieta'
const HEADER_ROW = 4
const FIRST_DATA_ROW = 5
const FILAS_EN_BLANCO = 60
const DIA_TIPO_VALIDOS: DiaTipoItem[] = ['on', 'off', 'unico']

function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}

export async function descargarPlantillaDieta(): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(SHEET_NAME)

  sheet.getCell('A1').value = 'Plantilla de dieta cerrada — Pegasus Coach'
  sheet.getCell('A1').font = { bold: true, size: 13 }
  sheet.getCell('A2').value = 'Nombre de la dieta (opcional):'
  sheet.getCell('A2').font = { bold: true }
  sheet.getCell('A3').value =
    '"Día tipo" admite: on / off / unico (usa "unico" si no distingues entre día de entreno y de descanso). "Momento" es el nombre de la comida (Desayuno, Comida, Cena…).'
  sheet.getCell('A3').font = { italic: true, size: 10 }

  const headerRow = sheet.getRow(HEADER_ROW)
  headerRow.values = ['Día tipo', 'Momento', 'Alimento', 'Cantidad', 'Unidad']
  headerRow.font = { bold: true }

  sheet.columns = [
    { key: 'diaTipo', width: 12 },
    { key: 'momento', width: 16 },
    { key: 'alimento', width: 30 },
    { key: 'cantidad', width: 12 },
    { key: 'unidad', width: 10 },
  ]

  // Filas en blanco listas para rellenar — plantilla vacía, sin datos de ejemplo.
  for (let i = 0; i < FILAS_EN_BLANCO; i++) sheet.addRow([])

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  descargarBlob(blob, 'pegasus-plantilla-dieta.xlsx')
}

export interface FilaDietaImportada {
  diaTipo: DiaTipoItem
  momento: string | null
  alimento: string
  cantidad: number
  unidad: string
}

export interface DietaImportada {
  nombre: string | null
  filas: FilaDietaImportada[]
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
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

export async function parseDietaExcel(file: File): Promise<DietaImportada> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0]
  if (!sheet) throw new Error('El archivo no tiene ninguna hoja.')

  const nombre = toText(sheet.getCell('B2').value)

  const filas: FilaDietaImportada[] = []
  const lastRow = sheet.lastRow?.number ?? FIRST_DATA_ROW
  for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
    const row = sheet.getRow(r)
    const alimento = toText(row.getCell(3).value)
    const cantidad = toNumber(row.getCell(4).value)
    if (!alimento || cantidad === null) continue // fila de plantilla vacía

    const diaTipoTexto = (toText(row.getCell(1).value) ?? 'unico').toLowerCase()
    const diaTipo = (DIA_TIPO_VALIDOS as string[]).includes(diaTipoTexto) ? (diaTipoTexto as DiaTipoItem) : 'unico'

    filas.push({
      diaTipo,
      momento: toText(row.getCell(2).value),
      alimento,
      cantidad,
      unidad: toText(row.getCell(5).value) ?? 'g',
    })
  }

  if (filas.length === 0) {
    throw new Error('No se encontró ninguna fila con "Alimento" y "Cantidad" rellenos.')
  }

  return { nombre, filas }
}
