import { getProfile } from './supabase/profileRepo'
import { listMesociclos } from './supabase/mesocicloRepo'
import { listMacroPlans } from './supabase/macroPlanRepo'
import { listWeightEntries } from './supabase/bodyWeightRepo'
import { listMeasurements } from './supabase/measurementRepo'

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
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pegasus-nutrition-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
