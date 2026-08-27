import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { initDatabase, closeDatabase } from './db'
import * as profileRepo from './db/repositories/profileRepo'
import * as mesocicloRepo from './db/repositories/mesocicloRepo'
import * as macroPlanRepo from './db/repositories/macroPlanRepo'
import * as weightEntryRepo from './db/repositories/weightEntryRepo'
import * as measurementRepo from './db/repositories/measurementRepo'
import { buildImportPreview } from './importer/excelImporter'
import * as auth from './sync/auth'
import * as syncEngine from './sync/syncEngine'
import { setSyncActive } from './sync/outbox'
import type { ImportPreview, ImportResult, MacroPlanInput, MeasurementInput, WeightEntryInput } from '@shared/types'
import type { ConflictResolution } from './sync/syncEngine'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

function registerWindowControls() {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximizeToggle', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
}

function registerDataHandlers() {
  ipcMain.handle('profile:get', () => profileRepo.getProfile())
  ipcMain.handle('profile:update', (_e, data) => profileRepo.updateProfile(data))

  ipcMain.handle('mesociclos:list', () => mesocicloRepo.listMesociclos())
  ipcMain.handle('mesociclos:create', (_e, data) => mesocicloRepo.createMesociclo(data))
  ipcMain.handle('mesociclos:update', (_e, id, data) => mesocicloRepo.updateMesociclo(id, data))
  ipcMain.handle('mesociclos:delete', (_e, id) => mesocicloRepo.deleteMesociclo(id))

  ipcMain.handle('semanas:list', (_e, mesocicloId) => mesocicloRepo.listSemanas(mesocicloId))
  ipcMain.handle('semanas:create', (_e, data) => mesocicloRepo.createSemana(data))
  ipcMain.handle('semanas:delete', (_e, id) => mesocicloRepo.deleteSemana(id))

  ipcMain.handle('macroPlans:list', () => macroPlanRepo.listMacroPlans())
  ipcMain.handle('macroPlans:getActive', () => macroPlanRepo.getActiveMacroPlan())
  ipcMain.handle('macroPlans:create', (_e, data: MacroPlanInput) => macroPlanRepo.createMacroPlan(data))
  ipcMain.handle('macroPlans:update', (_e, id: number, data: MacroPlanInput) =>
    macroPlanRepo.updateMacroPlan(id, data),
  )
  ipcMain.handle('macroPlans:delete', (_e, id: number) => macroPlanRepo.deleteMacroPlan(id))

  ipcMain.handle('weightEntries:list', () => weightEntryRepo.listWeightEntries())
  ipcMain.handle('weightEntries:getLatest', () => weightEntryRepo.getLatestWeightEntry())
  ipcMain.handle('weightEntries:create', (_e, data: WeightEntryInput) => {
    const entry = weightEntryRepo.createWeightEntry(data)
    scheduleSync()
    return entry
  })
  ipcMain.handle('weightEntries:update', (_e, id: number, data: WeightEntryInput) => {
    weightEntryRepo.updateWeightEntry(id, data)
    scheduleSync()
  })
  ipcMain.handle('weightEntries:delete', (_e, id: number) => {
    weightEntryRepo.deleteWeightEntry(id)
    scheduleSync()
  })

  ipcMain.handle('measurements:list', () => measurementRepo.listMeasurements())
  ipcMain.handle('measurements:create', (_e, data: MeasurementInput) => measurementRepo.createMeasurement(data))
  ipcMain.handle('measurements:update', (_e, id: number, data: MeasurementInput) =>
    measurementRepo.updateMeasurement(id, data),
  )
  ipcMain.handle('measurements:delete', (_e, id: number) => measurementRepo.deleteMeasurement(id))
}

// Debounce corto tras cada escritura local — nunca síncrono con el guardado
// (eso bloquearía la respuesta IPC), solo agenda un intento en segundo
// plano. Mismo criterio que el debounce de 'sync:queued' en js/core/sync.js
// de Pegasus Tracker.
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSync() {
  if (!syncEngine.isSyncActive()) return
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  syncDebounceTimer = setTimeout(() => {
    syncEngine.syncNow()
  }, 3000)
}

function toPegasusSession(session: Awaited<ReturnType<typeof auth.getSession>>) {
  return session ? { userEmail: session.user.email ?? null } : null
}

function registerSyncHandlers() {
  ipcMain.handle('auth:signIn', async (_e, email: string, password: string) => {
    try {
      const session = await auth.signIn(email, password)
      setSyncActive(true)
      await syncEngine.syncNow()
      return { session: toPegasusSession(session) }
    } catch (err) {
      return { error: auth.authErrorMessage(err) }
    }
  })
  ipcMain.handle('auth:signOut', async () => {
    await auth.signOut()
    setSyncActive(false)
  })
  ipcMain.handle('auth:getSession', async () => toPegasusSession(await auth.getSession()))

  ipcMain.handle('sync:now', async () => {
    await syncEngine.syncNow()
    return syncEngine.getSyncStatus()
  })
  ipcMain.handle('sync:getStatus', () => syncEngine.getSyncStatus())
  ipcMain.handle('sync:previewMigration', () => syncEngine.previewMigration())
  ipcMain.handle('sync:applyMigration', async (_e, resolutions: Record<number, ConflictResolution>) => {
    await syncEngine.applyMigration(resolutions)
  })

  syncEngine.onSyncStatusChange((s) => {
    mainWindow?.webContents.send('sync:statusChanged', s)
  })
}

function registerImporterHandlers() {
  ipcMain.handle('importer:pickFile', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar Excel a importar',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('importer:preview', async (_e, filePath: string): Promise<ImportPreview> => {
    return buildImportPreview(filePath)
  })

  ipcMain.handle('importer:apply', async (_e, preview: ImportPreview): Promise<ImportResult> => {
    const mesociclosExistentes = mesocicloRepo.listMesociclos()
    const numero = mesociclosExistentes.length > 0 ? Math.max(...mesociclosExistentes.map((m) => m.numero)) + 1 : 1
    const mesociclo = mesocicloRepo.createMesociclo({
      numero,
      nombre: `Mesociclo ${numero} (importado)`,
      fechaInicio: preview.macroPlans[0]?.fecha ?? null,
    })

    macroPlanRepo.createMacroPlansBatch(preview.macroPlans)
    weightEntryRepo.createWeightEntriesBatch(preview.weightEntries)

    return {
      macroPlansCreados: preview.macroPlans.length,
      weightEntriesCreados: preview.weightEntries.length,
      mesocicloCreado: mesociclo,
    }
  })
}

function registerBackupHandlers(userDataPath: string) {
  const dbFile = path.join(userDataPath, 'pegasus-nutrition.sqlite')

  ipcMain.handle('data:backup', async () => {
    if (!mainWindow) return null
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar copia de seguridad',
      defaultPath: `pegasus-nutrition-backup-${new Date().toISOString().slice(0, 10)}.sqlite`,
      filters: [{ name: 'Base de datos Pegasus', extensions: ['sqlite'] }],
    })
    if (result.canceled || !result.filePath) return null
    fs.copyFileSync(dbFile, result.filePath)
    return { path: result.filePath }
  })

  ipcMain.handle('data:exportJson', async () => {
    if (!mainWindow) return null
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar datos (JSON)',
      defaultPath: `pegasus-nutrition-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return null
    const dump = {
      profile: profileRepo.getProfile(),
      mesociclos: mesocicloRepo.listMesociclos(),
      macroPlans: macroPlanRepo.listMacroPlans(),
      weightEntries: weightEntryRepo.listWeightEntries(),
      measurements: measurementRepo.listMeasurements(),
      exportadoEl: new Date().toISOString(),
    }
    fs.writeFileSync(result.filePath, JSON.stringify(dump, null, 2), 'utf-8')
    return { path: result.filePath }
  })
}

app.whenReady().then(async () => {
  const userDataPath = app.getPath('userData')
  await initDatabase(userDataPath)

  registerWindowControls()
  registerDataHandlers()
  registerSyncHandlers()
  registerImporterHandlers()
  registerBackupHandlers(userDataPath)

  // Modo local puro si no hay sesión guardada — no-op total, coste cero.
  const session = await auth.getSession()
  setSyncActive(!!session)
  if (session) syncEngine.syncNow()

  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDatabase()
})
