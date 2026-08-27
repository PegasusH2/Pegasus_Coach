// Forma de la API expuesta por el preload en window.pegasus. Sin dependencias de Electron
// para que pueda importarse tanto desde el proceso main (preload) como desde el renderer.
import type {
  BackupResult,
  ImportPreview,
  ImportResult,
  MacroPlan,
  MacroPlanInput,
  Measurement,
  MeasurementInput,
  Mesociclo,
  Profile,
  Semana,
  WeightEntry,
  WeightEntryInput,
} from './types'

export interface PegasusApi {
  window: {
    minimize: () => Promise<void>
    maximizeToggle: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
  }
  profile: {
    get: () => Promise<Profile>
    update: (data: Omit<Profile, 'id'>) => Promise<Profile>
  }
  mesociclos: {
    list: () => Promise<Mesociclo[]>
    create: (data: Omit<Mesociclo, 'id'>) => Promise<Mesociclo>
    update: (id: number, data: Omit<Mesociclo, 'id'>) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  semanas: {
    list: (mesocicloId: number) => Promise<Semana[]>
    create: (data: Omit<Semana, 'id'>) => Promise<Semana>
    delete: (id: number) => Promise<void>
  }
  macroPlans: {
    list: () => Promise<MacroPlan[]>
    getActive: () => Promise<MacroPlan | undefined>
    create: (data: MacroPlanInput) => Promise<MacroPlan>
    update: (id: number, data: MacroPlanInput) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  weightEntries: {
    list: () => Promise<WeightEntry[]>
    getLatest: () => Promise<WeightEntry | undefined>
    create: (data: WeightEntryInput) => Promise<WeightEntry>
    update: (id: number, data: WeightEntryInput) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  measurements: {
    list: () => Promise<Measurement[]>
    create: (data: MeasurementInput) => Promise<Measurement>
    update: (id: number, data: MeasurementInput) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  importer: {
    pickFile: () => Promise<string | null>
    preview: (filePath: string) => Promise<ImportPreview>
    apply: (preview: ImportPreview) => Promise<ImportResult>
  }
  data: {
    backup: () => Promise<BackupResult | null>
    exportJson: () => Promise<BackupResult | null>
  }
}
