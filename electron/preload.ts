import { contextBridge, ipcRenderer } from 'electron'
import type {
  ImportPreview,
  MacroPlanInput,
  MeasurementInput,
  Mesociclo,
  Semana,
  WeightEntryInput,
} from '@shared/types'
import type { PegasusApi } from '@shared/api'

const api: PegasusApi = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximizeToggle: () => ipcRenderer.invoke('window:maximizeToggle'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    update: (data: unknown) => ipcRenderer.invoke('profile:update', data),
  },
  mesociclos: {
    list: () => ipcRenderer.invoke('mesociclos:list'),
    create: (data: Omit<Mesociclo, 'id'>) => ipcRenderer.invoke('mesociclos:create', data),
    update: (id: number, data: Omit<Mesociclo, 'id'>) => ipcRenderer.invoke('mesociclos:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('mesociclos:delete', id),
  },
  semanas: {
    list: (mesocicloId: number) => ipcRenderer.invoke('semanas:list', mesocicloId),
    create: (data: Omit<Semana, 'id'>) => ipcRenderer.invoke('semanas:create', data),
    delete: (id: number) => ipcRenderer.invoke('semanas:delete', id),
  },
  macroPlans: {
    list: () => ipcRenderer.invoke('macroPlans:list'),
    getActive: () => ipcRenderer.invoke('macroPlans:getActive'),
    create: (data: MacroPlanInput) => ipcRenderer.invoke('macroPlans:create', data),
    update: (id: number, data: MacroPlanInput) => ipcRenderer.invoke('macroPlans:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('macroPlans:delete', id),
  },
  weightEntries: {
    list: () => ipcRenderer.invoke('weightEntries:list'),
    getLatest: () => ipcRenderer.invoke('weightEntries:getLatest'),
    create: (data: WeightEntryInput) => ipcRenderer.invoke('weightEntries:create', data),
    update: (id: number, data: WeightEntryInput) => ipcRenderer.invoke('weightEntries:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('weightEntries:delete', id),
  },
  measurements: {
    list: () => ipcRenderer.invoke('measurements:list'),
    create: (data: MeasurementInput) => ipcRenderer.invoke('measurements:create', data),
    update: (id: number, data: MeasurementInput) => ipcRenderer.invoke('measurements:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('measurements:delete', id),
  },
  importer: {
    pickFile: (): Promise<string | null> => ipcRenderer.invoke('importer:pickFile'),
    preview: (filePath: string): Promise<ImportPreview> => ipcRenderer.invoke('importer:preview', filePath),
    apply: (preview: ImportPreview) => ipcRenderer.invoke('importer:apply', preview),
  },
  data: {
    backup: () => ipcRenderer.invoke('data:backup'),
    exportJson: () => ipcRenderer.invoke('data:exportJson'),
  },
}

contextBridge.exposeInMainWorld('pegasus', api)
