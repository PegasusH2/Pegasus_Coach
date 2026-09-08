import ExcelJS from 'exceljs'
import { getProfile } from './supabase/profileRepo'
import { listMesociclos } from './supabase/mesocicloRepo'
import { listMacroPlans } from './supabase/macroPlanRepo'
import { listWeightEntries } from './supabase/bodyWeightRepo'
import { listMeasurements } from './supabase/measurementRepo'
import type { WeightEntry } from '@/types'

function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportarDatosJson(userId: string): Promise<void> {
  const [profile, mesociclos, macroPlans, weightEntries, measurements] = await Promise.all([
    getProfile(userId),
    listMesociclos(userId),
    listMacroPlans(userId),
    listWeightEntries(userId),
    listMeasurements(userId),
  ])

  const dump = {
    profile,
    mesociclos,
    macroPlans,
    weightEntries,
    measurements,
    exportadoEl: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
  descargarBlob(blob, `pegasus-coach-export-${new Date().toISOString().slice(0, 10)}.json`)
}

/** Exporta el histórico de peso a un .xlsx — fechas de más antigua a más reciente,
 * para poder pegarlas directamente en una hoja de cálculo externa (p.ej. el Excel
 * de control manual que ya usa el usuario). Solo Fecha y Peso: el resto de columnas
 * (medias, % variación...) las calcula el propio Excel del usuario, no se replican aquí. */
export async function exportarPesoExcel(entries: WeightEntry[]): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Peso')
  sheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Peso (kg)', key: 'peso', width: 12 },
  ]

  const ordenados = [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha))
  for (const e of ordenados) {
    const row = sheet.addRow({ fecha: new Date(`${e.fecha}T00:00:00`), peso: e.pesoKg })
    row.getCell('fecha').numFmt = 'dd/mm/yyyy'
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  descargarBlob(blob, `pegasus-peso-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
