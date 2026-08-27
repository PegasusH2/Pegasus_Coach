// Motor de sincronización (electron/sync/syncEngine.ts) probado contra un
// Supabase simulado en memoria — mismo patrón que tests/sync.test.js de
// Pegasus Tracker, adaptado a Vitest y a las llamadas síncronas de sql.js.
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { all, initDatabase, closeDatabase } from '../db'
import * as weightEntryRepo from '../db/repositories/weightEntryRepo'
import { setSyncActive } from './outbox'
import { __setSupabaseClientForTests, getSupabaseClient } from './supabaseClient'
import * as syncEngine from './syncEngine'

// Un Map en memoria por tabla; upsert/select/update.in con la misma forma
// que supabase-js. failNextUpsertFor permite simular un fallo puntual.
function makeFakeSupabase() {
  const tables: Record<string, Map<string, Record<string, unknown>>> = {}
  let counter = 0
  const tick = () => new Date(Date.now() + counter++ * 1000).toISOString()
  const failingOnce = new Set<string>()

  function from(table: string) {
    tables[table] ||= new Map()
    const store = tables[table]
    return {
      upsert(rows: Record<string, unknown>[]) {
        if (failingOnce.has(table)) {
          failingOnce.delete(table)
          return Promise.resolve({ error: new Error('fallo simulado de red') })
        }
        for (const r of rows) {
          const existing = store.get(r.id as string)
          store.set(r.id as string, { ...existing, ...r, created_at: existing?.created_at || tick(), updated_at: tick() })
        }
        return Promise.resolve({ error: null })
      },
      select() {
        let filtered = [...store.values()]
        const apiObj = {
          order() {
            return apiObj
          },
          gt(col: string, val: string) {
            filtered = filtered.filter((r) => (r[col] as string) > val)
            return Promise.resolve({ data: filtered, error: null })
          },
          is(col: string, val: unknown) {
            filtered = filtered.filter((r) => (r[col] ?? null) === val)
            return Promise.resolve({ data: filtered, error: null })
          },
          then(resolve: (v: { data: unknown[]; error: null }) => void) {
            resolve({ data: filtered, error: null })
          },
        }
        return apiObj
      },
      update(patch: Record<string, unknown>) {
        return {
          in(col: string, ids: string[]) {
            for (const id of ids) {
              const row = store.get(id)
              if (row) store.set(id, { ...row, ...patch, updated_at: tick() })
            }
            return Promise.resolve({ error: null })
          },
        }
      },
    }
  }

  let fakeSession: { user: { id: string; email: string } } | null = { user: { id: 'user-1', email: 'a@b.com' } }

  return {
    from,
    tables,
    failNextUpsertFor: (table: string) => failingOnce.add(table),
    auth: {
      getSession: async () => ({ data: { session: fakeSession } }),
      signInWithPassword: async () => ({ data: { session: fakeSession }, error: null }),
      signOut: async () => {
        fakeSession = null
        return { error: null }
      },
    },
  }
}

let tmpDir: string

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pegasus-nutrition-test-'))
  await initDatabase(tmpDir)
  setSyncActive(false)
  __setSupabaseClientForTests(makeFakeSupabase() as never)
})

afterEach(() => {
  closeDatabase()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('outbox — sin sesión activa', () => {
  test('crear un peso local sin sesión no encola nada', () => {
    weightEntryRepo.createWeightEntry({ fecha: '2026-08-27', pesoKg: 82.4, notas: null })
    const queue = queueRows()
    expect(queue.length).toBe(0)
  })
})

describe('syncNow — subida y bajada', () => {
  test('con sesión activa, un peso nuevo se sube y desaparece de la cola', async () => {
    setSyncActive(true)
    weightEntryRepo.createWeightEntry({ fecha: '2026-08-27', pesoKg: 82.4, notas: null })
    expect(queueRows().length).toBe(1)

    await syncEngine.syncNow()

    expect(queueRows().length).toBe(0)
    const local = weightEntryRepo.listWeightEntries()[0]
    expect(local.pesoKg).toBe(82.4)
  })

  test('una fila subida por Tracker (insertada directamente en Supabase) baja al local', async () => {
    setSyncActive(true)
    const fake = getFakeClient()
    fake.from('body_weight').upsert([
      { id: 'remote-uuid-1', date: '2026-08-20', weight_kg: 80.1, notes: null },
    ])

    await syncEngine.syncNow()

    const local = weightEntryRepo.listWeightEntries().find((e) => e.fecha === '2026-08-20')
    expect(local?.pesoKg).toBe(80.1)
  })
})

describe('migración de datos históricos al vincular la cuenta', () => {
  test('sin equivalente remoto se sube; con el mismo valor se enlaza sin preguntar; con valor distinto es un conflicto', async () => {
    const fake = getFakeClient()
    fake.from('body_weight').upsert([
      { id: 'remote-same', date: '2026-08-10', weight_kg: 79.0, notes: null },
      { id: 'remote-conflict', date: '2026-08-11', weight_kg: 79.5, notes: null },
    ])

    weightEntryRepo.createWeightEntry({ fecha: '2026-08-09', pesoKg: 78.5, notas: null }) // sin equivalente remoto
    weightEntryRepo.createWeightEntry({ fecha: '2026-08-10', pesoKg: 79.0, notas: null }) // mismo valor
    const conflicting = weightEntryRepo.createWeightEntry({ fecha: '2026-08-11', pesoKg: 79.9, notas: null }) // distinto

    const preview = await syncEngine.previewMigration()
    expect(preview.toUpload).toBe(1)
    expect(preview.conflicts.length).toBe(1)
    expect(preview.conflicts[0].localId).toBe(conflicting.id)

    await syncEngine.applyMigration({ [conflicting.id]: 'both' })

    // Nada se pierde: la medición remota original de esa fecha sigue existiendo...
    const remoteRows = [...fake.tables['body_weight'].values()]
    const sameDate = remoteRows.filter((r) => r.date === '2026-08-11')
    expect(sameDate.length).toBe(2) // la remota original + la local subida como nueva medición

    // ...y tras el syncNow() final de applyMigration, la medición remota
    // original de esa fecha (creada por "Tracker", nunca antes vista en
    // Nutrition) se descarga también — las 3 filas originales + esa = 4.
    const allLocal = weightEntryRepo.listWeightEntries()
    expect(allLocal.length).toBe(4)
    const bothOn0811 = allLocal.filter((e) => e.fecha === '2026-08-11').map((e) => e.pesoKg).sort()
    expect(bothOn0811).toEqual([79.5, 79.9])
  })
})

function queueRows(): unknown[] {
  return all('SELECT * FROM sync_queue')
}

function getFakeClient() {
  return getSupabaseClient() as unknown as ReturnType<typeof makeFakeSupabase>
}
