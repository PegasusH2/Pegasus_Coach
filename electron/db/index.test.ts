// Cubre específicamente el camino de actualización sobre una instalación
// YA EXISTENTE (weight_entry creada antes de que existiera la
// sincronización) — el resto de la suite (electron/sync/syncEngine.test.ts)
// solo usa directorios temporales nuevos, así que nunca ejercita este
// camino. Aquí se reprodujo el bug real: schema.sql intentaba crear el
// índice único de remoteId ANTES de que ensureColumn() añadiera esa columna
// en una instalación existente, lo que rompía a mitad todo el db.run(schema)
// — dejando sync_kv/sync_queue sin crear y la sincronización rota por completo.
import { test, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const initSqlJs = require('sql.js') as (config?: unknown) => Promise<{ Database: new () => SqlJsDb }>

interface SqlJsDb {
  run(sql: string, params?: unknown[]): void
  export(): Uint8Array
  close(): void
}

test('initDatabase() sobre una instalación existente (weight_entry sin remoteId/createdAt/updatedAt) no lanza y crea todo lo necesario para sincronizar', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pegasus-nutrition-upgrade-'))
  const dbFile = path.join(tmp, 'pegasus-nutrition.sqlite')

  // Simula una instalación real anterior a la sincronización.
  const SQL = await initSqlJs()
  const preDb = new SQL.Database()
  preDb.run(`
    CREATE TABLE weight_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      pesoKg REAL NOT NULL,
      notas TEXT
    );
    INSERT INTO weight_entry (fecha, pesoKg, notas) VALUES ('2026-01-01', 80, NULL);
  `)
  fs.writeFileSync(dbFile, Buffer.from(preDb.export()))
  preDb.close()

  const { initDatabase, all, closeDatabase } = await import('./index')
  await initDatabase(tmp)

  try {
    const tables = all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name)
    expect(tables).toContain('sync_kv')
    expect(tables).toContain('sync_queue')

    const columns = all<{ name: string }>('PRAGMA table_info(weight_entry)').map((c) => c.name)
    expect(columns).toContain('remoteId')
    expect(columns).toContain('createdAt')
    expect(columns).toContain('updatedAt')

    // El registro de peso ya existente antes de la actualización no se pierde.
    const rows = all<{ fecha: string; pesoKg: number }>('SELECT fecha, pesoKg FROM weight_entry')
    expect(rows).toEqual([{ fecha: '2026-01-01', pesoKg: 80 }])
  } finally {
    closeDatabase()
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
